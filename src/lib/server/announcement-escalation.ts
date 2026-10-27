import "server-only";

import { prisma } from "@/lib/db/prisma";
import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";
import { startOfReferenceDay, toReferenceDateKey } from "@/lib/reference-date";
import {
  ANNOUNCEMENT_INCLUDE,
  mapAnnouncement,
  targetApplicantUsersWhere,
} from "@/lib/server/announcement-mapper";
import { errorFields, logger } from "@/lib/server/logger";
import { notifyAnnouncementEscalation } from "@/lib/server/announcement-notifications";
import { getAnnouncementRecipientStatuses } from "@/lib/server/announcement-service";
import type { Announcement } from "@/types/announcement";

/**
 * 当日重複判定（要件38.5・38.7）の対象とする通知種別。自動督促（`escalation`）と
 * 手動リマインド（`reminder`）の両方を、同一お知らせ×同一宛先メールの当日実績として扱う。
 */
const DEDUP_KINDS = ["escalation", "reminder"] as const;

/** `runAnnouncementAutoEscalation`の実行結果サマリ（要件38.8）。 */
export interface EscalationRunResult {
  /** 期限超過・対象（`actionRequired`真・`published`・`dueDate`超過）だったお知らせ数。 */
  overdueAnnouncements: number;
  /** 当日重複を除外したうえで送信を試みた宛先数（sent/skipped/failedの合計）。 */
  notifiedRecipients: number;
  /** 当日重複（既に`escalation`/`reminder`送信済み）により除外した宛先数。 */
  skippedByDedup: number;
  /** 送信に成功した宛先数（`notifiedRecipients`のうちSMTP未設定・失敗を除く）。dryRun時は0。 */
  sentRecipients: number;
  /** SMTP未設定により送信されなかった宛先数。 */
  skippedRecipients: number;
  /** 送信に失敗した宛先数。 */
  failedRecipients: number;
  /** 処理中に例外が発生したお知らせ数（他のお知らせの処理は継続）。 */
  failedAnnouncements: number;
  /** 別プロセスが実行中（advisory lock取得不可）のため何も処理せず終了した場合true。 */
  skippedByLock: boolean;
  /** 処理時間の上限（締切）に達したため、残りのお知らせ・宛先の処理を打ち切った場合true。未処理分は翌日の実行で処理される（Schedulerは1日1回のため、打ち切りは翌日まで持ち越される）。 */
  abortedByDeadline: boolean;
  /** 送信・打刻・ログ記録を行わず対象件数のみ集計した場合true。 */
  dryRun: boolean;
}

export interface EscalationRunOptions {
  /** trueのとき、メール送信・`reminderSentAt`更新・ログ記録・ロック取得を行わず件数のみ集計する。 */
  dryRun?: boolean;
  /**
   * 処理開始（ロック取得後）からの締切（ミリ秒）。到達後は新規の送信を始めず打ち切る。
   * 既定は`ESCALATION_RUN_DEADLINE_MS`。テスト用に注入可能。
   */
  deadlineMs?: number;
}

/**
 * 同時実行防止用のPostgreSQL advisory lockキー（任意の固定値）。Schedulerのリトライや
 * アクセス時トリガーとの並走による二重送信を防ぐ。
 */
const ESCALATION_ADVISORY_LOCK_KEY = 7_203_803_001;

/** advisory lockを保持するトランザクションの上限（Cloud Run timeout 300s未満）。 */
const ESCALATION_LOCK_TRANSACTION_TIMEOUT_MS = 290_000;

/**
 * 締切から、トランザクション上限までの余裕。締切到達時点で送信中の宛先（最大
 * `ESCALATION_SEND_CONCURRENCY`件）が、mailerのタイムアウト（接続10s・greeting 10s・socket 30s）内に
 * 終わる想定の余裕。送信ループ自体も締切後は新規送信を開始しない。
 */
const ESCALATION_DEADLINE_MARGIN_MS = 50_000;

/**
 * 処理の締切。トランザクション上限より十分前に必ず終わらせる。上限を超えるとPrismaが
 * トランザクションをロールバックしてlockが解放されるが、コールバック内の処理は止まらず、
 * 並走実行による二重送信を招くため、この締切で新規送信を止める（上限から導出）。
 */
const ESCALATION_RUN_DEADLINE_MS =
  ESCALATION_LOCK_TRANSACTION_TIMEOUT_MS - ESCALATION_DEADLINE_MARGIN_MS;

function newResult(dryRun: boolean): EscalationRunResult {
  return {
    overdueAnnouncements: 0,
    notifiedRecipients: 0,
    skippedByDedup: 0,
    sentRecipients: 0,
    skippedRecipients: 0,
    failedRecipients: 0,
    failedAnnouncements: 0,
    skippedByLock: false,
    abortedByDeadline: false,
    dryRun,
  };
}

/**
 * 対象お知らせ1件分のエスカレーション処理。未対応（`completedAt`未記録）の会社を検出し、
 * 当日まだ督促を受け取っていない有効な`ApplicantUser`へのみ送信を委ね、送信対象が
 * 生じた未対応会社の担当者（`AnnouncementRecipient`）の`reminderSentAt`を更新する。
 * 1件のお知らせの処理失敗が他のお知らせの処理を妨げないよう、この関数単位で
 * 例外を捕捉する（ベストエフォート）。
 */
async function processOverdueAnnouncement(
  announcement: Announcement,
  now: Date,
  result: EscalationRunResult,
  dryRun: boolean,
  deadlineAt: number
): Promise<void> {
  try {
    const statuses = await getAnnouncementRecipientStatuses(announcement.id);
    const unresolved = statuses.filter((status) => status.completedAt === null);
    if (unresolved.length === 0) {
      return;
    }

    const companyCodes = Array.from(new Set(unresolved.map((status) => status.companyCode)));

    const todayLogs = await prisma.announcementNotificationLog.findMany({
      where: {
        announcementId: announcement.id,
        kind: { in: [...DEDUP_KINDS] },
        // 送信成功分のみを当日実績とみなす。skipped（SMTP未設定）・failedは再実行で再送対象にする。
        status: "sent",
        sentAt: { gte: startOfReferenceDay(now) },
      },
      select: { recipientEmail: true },
    });
    const alreadyNotifiedEmails = new Set(todayLogs.map((log) => log.recipientEmail));

    // 送信対象が生じた（＝当日まだ通知していない宛先を持つ）未対応会社を特定するため、
    // 通知対象となる有効ApplicantUserを先に解決しておく。実際の送信・履歴記録自体は
    // `notifyAnnouncementEscalation`（announcement-notifications.ts）に委ね、判定ロジックを
    // 二重実装しない。
    const applicantRecipients = await prisma.applicantUser.findMany({
      where: {
        AND: [
          targetApplicantUsersWhere(announcement),
          { company: { companyCode: { in: companyCodes } } },
        ],
      },
      select: { email: true, company: { select: { companyCode: true } } },
    });

    const emailToCompanyCode = new Map<string, string>();
    let skippedByDedup = 0;
    for (const recipient of applicantRecipients) {
      if (alreadyNotifiedEmails.has(recipient.email)) {
        skippedByDedup += 1;
      } else {
        emailToCompanyCode.set(recipient.email, recipient.company.companyCode);
      }
    }

    result.notifiedRecipients += applicantRecipients.length - skippedByDedup;
    result.skippedByDedup += skippedByDedup;

    if (dryRun) {
      return;
    }

    // 送信の直前にも締切を確認する（送信・打刻前に打ち切れば、次回実行で当該宛先を再処理できる）。
    if (Date.now() >= deadlineAt) {
      result.abortedByDeadline = true;
      return;
    }

    const summary = await notifyAnnouncementEscalation(
      announcement.id,
      companyCodes,
      alreadyNotifiedEmails,
      { deadlineAt }
    );
    if (summary.deadlineReached) {
      result.abortedByDeadline = true;
    }
    result.sentRecipients += summary.sentEmails.length;
    result.skippedRecipients += summary.skipped;
    result.failedRecipients += summary.failed;

    // 実際にメール送信に成功した宛先を持つ未対応会社の担当者についてのみ、既存の手動リマインド
    // （`sendAnnouncementReminders`）と同一パターンでreminderSentAtをupsertする（要件38.6）。
    // SMTP未設定（skipped）・送信失敗（failed）のみの会社は「督促済み」と誤表示しないよう打刻しない。
    const sentCompanyCodes = new Set<string>();
    for (const email of summary.sentEmails) {
      const companyCode = emailToCompanyCode.get(email);
      if (companyCode) {
        sentCompanyCodes.add(companyCode);
      }
    }
    const recipientIdsToStamp = unresolved
      .filter((status) => sentCompanyCodes.has(status.companyCode))
      .map((status) => status.recipientId);

    await Promise.all(
      recipientIdsToStamp.map((recipientId) =>
        prisma.announcementRecipientStatus.upsert({
          where: {
            announcementId_recipientId: { announcementId: announcement.id, recipientId },
          },
          update: { reminderSentAt: now },
          create: { announcementId: announcement.id, recipientId, reminderSentAt: now },
        })
      )
    );
  } catch (error) {
    result.failedAnnouncements += 1;
    logger.error("[announcement-escalation] Failed to process escalation", {
      announcementId: announcement.id,
      ...errorFields(error),
    });
  }
}

async function runEscalation(
  now: Date,
  result: EscalationRunResult,
  dryRun: boolean,
  deadlineMs: number
): Promise<void> {
  const deadlineAt = Date.now() + deadlineMs;
  const records = await prisma.announcement.findMany({
    where: { status: "published", actionRequired: true, dueDate: { not: null } },
    include: ANNOUNCEMENT_INCLUDE,
  });

  const overdueAnnouncements = records
    .map(mapAnnouncement)
    .filter((announcement) => isAnnouncementDueDateOverdue(announcement.dueDate, now));

  result.overdueAnnouncements = overdueAnnouncements.length;

  for (const announcement of overdueAnnouncements) {
    if (!dryRun && Date.now() >= deadlineAt) {
      result.abortedByDeadline = true;
      break;
    }
    await processOverdueAnnouncement(announcement, now, result, dryRun, deadlineAt);
  }
}

/**
 * 対応期限を超過した公開済みお知らせ（`actionRequired`真・`published`・`dueDate`超過）に
 * ついて、未対応（`AnnouncementRecipientStatus.completedAt`未記録）の会社に属する
 * 有効な`ApplicantUser`へ自動的に督促メールを送る（要件38）。
 *
 * トリガー元（アクセス時トリガー・Cloud Scheduler向けAPI）に依存しない独立関数。
 * 当日（日本時間JST基準）に`sent`済みの宛先は除外するため、何度呼び出しても追加送信しない。
 * PostgreSQLのadvisory lockで同時実行を排他し、取得できなければ何もせず`skippedByLock`を返す。
 *
 * 個別お知らせの処理失敗は集計（`failedAnnouncements`）して継続するが、DB接続不可などの
 * 致命的失敗（お知らせ取得・ロック取得の失敗）はthrowする。呼び出し元（cronルート）が500に
 * 変換し、ベストエフォートが必要な呼び出し元（アクセス時トリガー）は自前でcatchする。
 */
export async function runAnnouncementAutoEscalation(
  now: Date = new Date(),
  options: EscalationRunOptions = {}
): Promise<EscalationRunResult> {
  const dryRun = options.dryRun === true;
  // 注入値も上限（トランザクション上限から導出した締切）で丸める。
  const deadlineMs = Math.min(options.deadlineMs ?? ESCALATION_RUN_DEADLINE_MS, ESCALATION_RUN_DEADLINE_MS);
  const result = newResult(dryRun);

  if (dryRun) {
    await runEscalation(now, result, true, deadlineMs);
    return result;
  }

  // トランザクション内でtransaction-levelのadvisory lockを取得し、処理完了（または失敗）まで保持する。
  // 同一コネクションでロックの取得・保持・解放を行うため、プール環境でもロックが漏れない。
  // 注意: このトランザクションは実行中1接続を占有し、内側のクエリ（グローバルprisma）は別接続を
  // 取るため、DATABASE_URLの`connection_limit`は2以上（推奨3以上）が必須（1だとP2024で毎回失敗）。
  // Prismaのinteractive transactionはロック保持以外に処理を止められないため、処理側で締切
  // （`ESCALATION_RUN_DEADLINE_MS`）を確認して打ち切る。
  await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${ESCALATION_ADVISORY_LOCK_KEY}::bigint) AS locked
      `;
      if (!rows[0]?.locked) {
        result.skippedByLock = true;
        return;
      }
      await runEscalation(now, result, false, deadlineMs);
      if (result.abortedByDeadline) {
        // 打ち切り分は翌日の実行まで持ち越される。ログベースアラートで検知する。
        logger.warn(
          "[announcement-escalation] Run aborted by deadline; remaining work is carried over to the next day's run.",
          {
            overdueAnnouncements: result.overdueAnnouncements,
            sentRecipients: result.sentRecipients,
            failedRecipients: result.failedRecipients,
          }
        );
      }
    },
    { maxWait: 5_000, timeout: ESCALATION_LOCK_TRANSACTION_TIMEOUT_MS }
  );

  return result;
}

/**
 * プロセス内メモリで保持する、アクセス時トリガーの最終実行暦日（JST）（スロットリング用）。
 * サーバーレス環境ではインスタンスごとに独立し、コールドスタートで揮発する前提。
 * その場合でも要件38.5の当日ログ重複判定が二重送信を防ぐ耐久ガードとして機能する。
 */
let lastTriggeredDateKey: string | null = null;

/**
 * ヘルプデスク側お知らせ管理一覧のアクセス時トリガー用の薄いラッパ（要件38.9）。
 * プロセス内メモリの「最終実行暦日（JST）」でスロットリングし、当日既に実行済みなら中核関数の
 * スキャン自体を省略する。例外は内部で握りつぶし、呼び出し元（一覧描画）を妨げない
 * （要件38.8）。
 */
export async function triggerAutoEscalationBestEffort(now: Date = new Date()): Promise<void> {
  const todayKey = toReferenceDateKey(now);
  if (lastTriggeredDateKey === todayKey) {
    return;
  }

  try {
    await runAnnouncementAutoEscalation(now);
  } catch (error) {
    logger.error("[announcement-escalation] triggerAutoEscalationBestEffort failed", errorFields(error));
  } finally {
    lastTriggeredDateKey = todayKey;
  }
}
