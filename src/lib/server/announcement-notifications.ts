import "server-only";

import type { Prisma } from "@prisma/client";

import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/db/prisma";
import {
  ANNOUNCEMENT_INCLUDE,
  mapAnnouncement,
  resolveAnnouncementContent,
  targetApplicantUsersWhere,
} from "@/lib/server/announcement-mapper";
import { MailerNotConfiguredError, sendMail } from "@/lib/server/mailer";
import type { Announcement } from "@/types/announcement";

/**
 * 配信対象による絞り込みを行わず、指定したIDのお知らせを1件取得する。
 * `announcement-service.ts`の`findAnnouncementById`と同義だが、`announcement-service.ts`
 * との循環importを避けるため、本モジュールでは`announcement-mapper.ts`（leafモジュール）
 * のみに依存して直接Prismaへ問い合わせる。
 */
async function findAnnouncementForNotification(
  announcementId: string
): Promise<Announcement | null> {
  const record = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: ANNOUNCEMENT_INCLUDE,
  });
  return record ? mapAnnouncement(record) : null;
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
 * （`th`・`vi`等も許容）だが、ポータルのURLパスは`ja`/`en`の2ロケールしかルーティングされて
 * いないため、それ以外の値は既定ロケール（`ja`）にフォールバックする。
 */
function resolveUiLocale(preferredLocale: string): string {
  return (routing.locales as readonly string[]).includes(preferredLocale)
    ? preferredLocale
    : routing.defaultLocale;
}

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
  announcement: Announcement,
  kind: "publish" | "reminder" | "target_added",
  recipient: NotificationRecipient
): Promise<void> {
  const { title, body } = resolveAnnouncementContent(announcement, recipient.preferredLocale);
  const uiLocale = resolveUiLocale(recipient.preferredLocale);
  const detailUrl = `${resolveAppBaseUrl()}/${uiLocale}${ANNOUNCEMENT_DETAIL_PATH_PREFIX}/${announcement.id}`;
  const subject = title;
  const bodyLines = [body, "", detailUrl];
  if (kind === "reminder" && announcement.dueDate) {
    bodyLines.splice(1, 0, `Due: ${announcement.dueDate}`);
  }

  try {
    await sendMail({
      to: recipient.email,
      subject,
      text: bodyLines.join("\n"),
    });
    await prisma.announcementNotificationLog.create({
      data: {
        announcementId: announcement.id,
        kind,
        recipientEmail: recipient.email,
        locale: recipient.preferredLocale,
        status: "sent",
      },
    });
  } catch (error) {
    const isNotConfigured = error instanceof MailerNotConfiguredError;
    if (!isNotConfigured) {
      console.error(
        `[announcement-notifications] Failed to send ${kind} mail for announcement ${announcement.id} to ${recipient.email}:`,
        error
      );
    }
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
  }
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
