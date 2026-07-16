import "server-only";

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

/** 通知メール本文に含めるポータルの詳細ページのベースパス（ロケールプレフィックスは含めない）。 */
const ANNOUNCEMENT_DETAIL_PATH_PREFIX = "/announcements";

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
  kind: "publish" | "reminder",
  recipient: NotificationRecipient
): Promise<void> {
  const { title, body } = resolveAnnouncementContent(announcement, recipient.preferredLocale);
  const detailUrl = `${ANNOUNCEMENT_DETAIL_PATH_PREFIX}/${announcement.id}`;
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
