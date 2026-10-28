import "server-only";

import type { Prisma } from "@prisma/client";

import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/db/prisma";
import {
  ANNOUNCEMENT_LIST_INCLUDE,
  mapAnnouncementSummary,
  resolveAnnouncementContent,
  targetApplicantUsersWhere,
} from "@/lib/server/announcement-mapper";
import { MailerNotConfiguredError, sendMail } from "@/lib/server/mailer";
import type { AnnouncementSummary } from "@/types/announcement";
import { errorFields, logger } from "./logger";

/**
 * 配信対象による絞り込みを行わず、指定したIDのお知らせを1件取得する。
 * `announcement-service.ts`の`findAnnouncementById`と同義だが、`announcement-service.ts`
 * との循環importを避けるため、本モジュールでは`announcement-mapper.ts`（leafモジュール）
 * のみに依存して直接Prismaへ問い合わせる。
 */
async function findAnnouncementForNotification(
  announcementId: string
): Promise<AnnouncementSummary | null> {
  const record = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: ANNOUNCEMENT_LIST_INCLUDE,
  });
  return record ? mapAnnouncementSummary(record) : null;
}

/** 通知メール本文に含めるポータルの詳細ページのパス（ロケールプレフィックスは含めない）。 */
const ANNOUNCEMENT_DETAIL_PATH_PREFIX = "/announcements";

/**
 * ローカル開発でのデフォルトのポータル公開URL。本番（Cloud Run）では`AUTH_URL`が
 * サービスの公開URLとして明示的に設定されている（Auth.jsのリダイレクト用途と共用）ため、
 * 通知メール内の詳細リンクにもこれを転用する。
 */
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

/**
 * 通知メール本文に埋め込む、スキーム・ホストを含む絶対URLのベース部分を解決する。
 * 末尾のスラッシュは除去する。
 */
function resolveAppBaseUrl(): string {
  const configured = process.env.AUTH_URL;
  if (!configured) {
    return DEFAULT_APP_BASE_URL;
  }
  return configured.replace(/\/+$/, "");
}

/**
 * 宛先の`preferredLocale`から、詳細リンクに用いるUIロケール（`next-intl`の`routing.locales`）
 * を解決する。`ApplicantUser.preferredLocale`はメール本文の言語選択用の自由入力に近い値
 * （`ko`・`id`等も許容）だが、ポータルのURLパスは`routing.locales`の8ロケールしかルーティング
 * されていないため、それ以外の値は`en`（20か国以上の受信者にとっての共通語。`resolveAnnouncementContent`
 * の`en`優先フォールバックと整合させる）にフォールバックする（要件36.6）。
 */
function resolveUiLocale(preferredLocale: string): string {
  return (routing.locales as readonly string[]).includes(preferredLocale)
    ? preferredLocale
    : "en";
}

/** 宛先1件の送信結果。`AnnouncementNotificationLog.status`と同値。 */
export type SendOutcome = "sent" | "skipped" | "failed";

interface NotificationRecipient {
  email: string;
  preferredLocale: string;
}

/**
 * 宛先1件分の通知メールを送信し、送信結果を`AnnouncementNotificationLog`に記録する。
 * `sendMail`が`MailerNotConfiguredError`をthrowした場合は`skipped`、それ以外の例外では
 * `failed`として記録する。例外はこの関数の外へは伝播させない（ベストエフォート、要件29.1）。
 */
async function sendAndLog(
  announcement: AnnouncementSummary,
  kind: "publish" | "reminder" | "target_added" | "escalation" | "read_reminder",
  recipient: NotificationRecipient
): Promise<SendOutcome> {
  const { title, body } = resolveAnnouncementContent(announcement, recipient.preferredLocale);
  const uiLocale = resolveUiLocale(recipient.preferredLocale);
  const detailUrl = `${resolveAppBaseUrl()}/${uiLocale}${ANNOUNCEMENT_DETAIL_PATH_PREFIX}/${announcement.id}`;
  const subject = title;
  const bodyLines = [body, "", detailUrl];
  if ((kind === "reminder" || kind === "escalation") && announcement.dueDate) {
    bodyLines.splice(1, 0, `Due: ${announcement.dueDate}`);
  }

  try {
    await sendMail({
      to: recipient.email,
      subject,
      text: bodyLines.join("\n"),
    });
  } catch (error) {
    const isNotConfigured = error instanceof MailerNotConfiguredError;
    if (!isNotConfigured) {
      // 宛先メールアドレスはfieldsに入れない（#162の意図）。エラー情報はerrorFieldsで全量出力する。
      // 注意: SMTPエラー文に宛先が含まれる場合、errorMessage/stack_trace/errorPropsを通じて宛先メールがログに出うる
      // （「Cloud Loggingには全情報」方針どおり。閲覧権限・保持期間で管理する。runbook §3.5参照）。
      logger.error("[announcement-notifications] Failed to send mail", {
        kind,
        announcementId: announcement.id,
        ...errorFields(error),
      });
    }
    // 失敗ログの書込み自体が失敗しても例外は伝播させず、送信結果だけを返す。
    try {
      await prisma.announcementNotificationLog.create({
        data: {
          announcementId: announcement.id,
          kind,
          recipientEmail: recipient.email,
          locale: recipient.preferredLocale,
          status: isNotConfigured ? "skipped" : "failed",
          errorMessage: isNotConfigured ? null : (error as Error).message,
        },
      });
    } catch (logError) {
      logger.error("[announcement-notifications] Failed to write notification log", {
        kind,
        announcementId: announcement.id,
        ...errorFields(logError),
      });
    }
    return isNotConfigured ? "skipped" : "failed";
  }

  // メールは送信済み。ログ書込みの失敗で`failed`扱いにすると再送・未打刻を招くため、
  // `sent`を返して警告ログのみ残す。
  try {
    await prisma.announcementNotificationLog.create({
      data: {
        announcementId: announcement.id,
        kind,
        recipientEmail: recipient.email,
        locale: recipient.preferredLocale,
        status: "sent",
      },
    });
  } catch (logError) {
    logger.warn("[announcement-notifications] Mail sent but failed to write notification log", {
      kind,
      announcementId: announcement.id,
      ...errorFields(logError),
    });
  }
  return "sent";
}

/**
 * お知らせが公開されたことを、配信対象（`targeting`）に含まれる国に属する`ApplicantUser`の
 * うち有効なメールアドレスを持つ全員へメールで通知する（要件27）。宛先ごとの送信は
 * ベストエフォートで行い、この関数自体は例外をthrowしない。
 */
export async function notifyAnnouncementPublished(announcementId: string): Promise<void> {
  const announcement = await findAnnouncementForNotification(announcementId);
  if (!announcement) {
    return;
  }

  const recipients = await prisma.applicantUser.findMany({
    where: targetApplicantUsersWhere(announcement),
    select: { email: true, preferredLocale: true },
  });

  await Promise.all(
    recipients.map((recipient) => sendAndLog(announcement, "publish", recipient))
  );
}

/**
 * 公開済みお知らせの配信対象が編集で拡大したとき、新たに配信対象へ含まれることになった国に
 * 属する`ApplicantUser`のうち有効なメールアドレスを持つ者へのみメールで通知する（要件35）。
 * `recipientWhere`は呼び出し元（`announcement-service.ts`の`updateAnnouncementRecord`）が
 * `announcement-mapper.ts`の`addedTargetApplicantUsersWhere`で算出した、新規追加分のみを
 * 表す`where`であることを前提とする（差分算出そのものは行わない）。本文は公開通知
 * （`notifyAnnouncementPublished`）と同型（`Due:`行なし）。宛先ごとの送信はベストエフォートで
 * 行い、この関数自体は例外をthrowしない。
 */
export async function notifyAnnouncementTargetExpanded(
  announcementId: string,
  recipientWhere: Prisma.ApplicantUserWhereInput
): Promise<void> {
  const announcement = await findAnnouncementForNotification(announcementId);
  if (!announcement) {
    return;
  }

  const recipients = await prisma.applicantUser.findMany({
    where: recipientWhere,
    select: { email: true, preferredLocale: true },
  });

  await Promise.all(
    recipients.map((recipient) => sendAndLog(announcement, "target_added", recipient))
  );
}

/**
 * 指定した会社コードに属する`ApplicantUser`へ、未対応のお知らせについてのリマインドメールを
 * 送信する（要件28）。宛先ごとの送信はベストエフォートで行い、この関数自体は例外をthrowしない。
 */
export async function notifyAnnouncementReminder(
  announcementId: string,
  companyCodes: string[]
): Promise<void> {
  if (companyCodes.length === 0) {
    return;
  }

  const announcement = await findAnnouncementForNotification(announcementId);
  if (!announcement) {
    return;
  }

  const recipients = await prisma.applicantUser.findMany({
    where: {
      AND: [
        targetApplicantUsersWhere(announcement),
        { company: { companyCode: { in: companyCodes } } },
      ],
    },
    select: { email: true, preferredLocale: true },
  });

  await Promise.all(
    recipients.map((recipient) => sendAndLog(announcement, "reminder", recipient))
  );
}

/**
 * 個人単位の既読リマインド（要件39.6）を、指定した宛先（未確認の`ApplicantUser`）へ
 * メールで送信する。会社単位の完了督促（`notifyAnnouncementReminder`）と同型だが、宛先を
 * 呼び出し元（`announcement-service.ts`の`sendUserReadReminders`）が解決済みの個人一覧に
 * 限定する点が異なる。`kind: "read_reminder"`で記録するため、自動エスカレーションの
 * 当日重複判定（`DEDUP_KINDS`＝`escalation`/`reminder`）には影響しない（要件42.2）。
 * 宛先ごとの送信はベストエフォートで行い、この関数自体は例外をthrowしない。
 */
export async function notifyAnnouncementUserReadReminder(
  announcementId: string,
  recipients: NotificationRecipient[]
): Promise<void> {
  if (recipients.length === 0) {
    return;
  }

  const announcement = await findAnnouncementForNotification(announcementId);
  if (!announcement) {
    return;
  }

  await Promise.all(
    recipients.map((recipient) => sendAndLog(announcement, "read_reminder", recipient))
  );
}

/** `notifyAnnouncementEscalation`の送信結果サマリ（宛先のPII以外は件数のみ）。 */
export interface EscalationSendSummary {
  /** 実際に送信に成功した宛先メール（呼び出し元が会社単位の打刻判定にのみ使う。ログ・レスポンスへ出さない）。 */
  sentEmails: string[];
  /** SMTP未設定により送信しなかった件数。 */
  skipped: number;
  /** 送信に失敗した件数。 */
  failed: number;
  /** 締切（`deadlineAt`）到達により、未送信の宛先を残して打ち切った場合のみtrue。 */
  deadlineReached?: boolean;
}

/** 督促メールの並列送信数の上限。SMTPサーバーへの同時接続と処理時間の見積りを有界にする。 */
export const ESCALATION_SEND_CONCURRENCY = 5;

export interface EscalationNotifyOptions {
  /** この時刻（`Date.now()`基準のミリ秒）以降は新規の送信を開始しない。 */
  deadlineAt?: number;
}

/**
 * 対応期限超過の自動エスカレーション（要件38）により、指定した会社コードに属する
 * `ApplicantUser`のうち、当日まだ督促（`escalation`/手動`reminder`）を受け取っていない
 * 宛先へのみ督促メールを送信する。宛先解決自体は`notifyAnnouncementReminder`と同型だが、
 * 呼び出し元（`announcement-escalation.ts`）が算出した当日重複除外集合
 * （`alreadyNotifiedEmails`）で絞り込む点が異なる。宛先ごとの送信はベストエフォートで
 * 行い、この関数自体は例外をthrowしない。
 */
export async function notifyAnnouncementEscalation(
  announcementId: string,
  companyCodes: string[],
  alreadyNotifiedEmails: ReadonlySet<string>,
  options: EscalationNotifyOptions = {}
): Promise<EscalationSendSummary> {
  const summary: EscalationSendSummary = { sentEmails: [], skipped: 0, failed: 0 };
  if (companyCodes.length === 0) {
    return summary;
  }

  const announcement = await findAnnouncementForNotification(announcementId);
  if (!announcement) {
    return summary;
  }

  const recipients = await prisma.applicantUser.findMany({
    where: {
      AND: [
        targetApplicantUsersWhere(announcement),
        { company: { companyCode: { in: companyCodes } } },
      ],
    },
    select: { email: true, preferredLocale: true },
  });

  const targets = recipients.filter((recipient) => !alreadyNotifiedEmails.has(recipient.email));

  // 並列数を`ESCALATION_SEND_CONCURRENCY`に制限したワーカープールで送信する（督促経路のみ。
  // 他の通知経路は従来どおり）。締切到達後は新規の送信を開始しない。
  const outcomes: { email: string; outcome: SendOutcome }[] = [];
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < targets.length) {
      if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) {
        summary.deadlineReached = true;
        return;
      }
      const recipient = targets[nextIndex];
      nextIndex += 1;
      let outcome: SendOutcome;
      try {
        outcome = await sendAndLog(announcement, "escalation", recipient);
      } catch (error) {
        // sendAndLogは通常throwしないが、想定外でもworkerを落とさず（完了済みの結果を捨てず、
        // 他workerの継続による同時送信数超過も防ぐ）failedとして集計する。
        logger.error("[announcement-notifications] Unexpected escalation send error", {
          announcementId: announcement.id,
          ...errorFields(error),
        });
        outcome = "failed";
      }
      outcomes.push({ email: recipient.email, outcome });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(ESCALATION_SEND_CONCURRENCY, targets.length) }, worker)
  );
  for (const { email, outcome } of outcomes) {
    if (outcome === "sent") {
      summary.sentEmails.push(email);
    } else if (outcome === "skipped") {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
    }
  }
  return summary;
}
