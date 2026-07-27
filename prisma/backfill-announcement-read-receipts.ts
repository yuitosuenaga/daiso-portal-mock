import { PrismaClient } from "@prisma/client";

type BackfillPrismaClient = Pick<
  PrismaClient,
  "$queryRaw" | "applicantUser" | "announcementReadReceipt"
>;

interface ConfirmedCompanyStatusRow {
  announcementId: string;
  companyId: string;
  confirmedAt: Date;
}

/**
 * 会社単位の確認済み（`AnnouncementRecipientStatus.confirmedAt`）を、個人単位の受信レシート
 * （`AnnouncementReadReceipt`）へキャリーフォワードする（要件41.2, 41.3）。
 *
 * 会社単位で確認済み（`confirmedAt`が非`null`）の各`AnnouncementRecipientStatus`行について、
 * その担当者（`AnnouncementRecipient`）が属する会社の`isActive: true`な全`ApplicantUser`に対し、
 * 当該お知らせの受信レシートを`confirmedAt`＝元の会社単位`confirmedAt`で補完する。
 *
 * 冪等（idempotent）: 既にレシートが存在する組み合わせ（`announcementId` × `applicantUserId`）は
 * 上書きしない。複数回実行しても重複や巻き戻しは発生しない（要件41.2）。
 * `completedAt`・`reminderSentAt`（会社単位）は一切変更しない（要件41.4）。
 *
 * 実行順序が重要: `AnnouncementReadReceipt`テーブル追加のマイグレーション（マイグレーションA）
 * の後、`AnnouncementRecipientStatus.confirmedAt`を削除するマイグレーション（マイグレーションB）
 * より前に実行すること（要件41.5）。マイグレーションB適用後は`confirmedAt`列自体がDBから
 * 削除されるため、本スクリプトは実行できない（この時点で既に不要になっている想定）。
 *
 * `confirmedAt`列は本ラウンドの最終スキーマ（マイグレーションB適用後）にはもう存在しないため、
 * 型付きのPrisma Client API（現在のschema.prismaから生成される型）では参照できない。
 * そのため会社単位の確認済み状態の読み取りのみ`$queryRaw`（生SQL）で行い、マイグレーションA
 * とBの間（列がまだ存在する期間）にのみ正しく動作するようにする。書き込み先の
 * `AnnouncementReadReceipt`・読み取り元の`ApplicantUser`は最終スキーマでも存在するため、
 * 通常の型付きAPIを使う。
 *
 * Prismaクライアントを引数で受け取ることで、実DBを使わないテストからも
 * （モックしたクライアントを渡して）同じロジックを検証できるようにしている。
 */
export async function backfillAnnouncementReadReceipts(
  prisma: BackfillPrismaClient
): Promise<{ backfilledCount: number }> {
  const confirmedStatuses = await prisma.$queryRaw<ConfirmedCompanyStatusRow[]>`
    SELECT s."announcementId" AS "announcementId", r."companyId" AS "companyId", s."confirmedAt" AS "confirmedAt"
    FROM "AnnouncementRecipientStatus" s
    JOIN "AnnouncementRecipient" r ON r.id = s."recipientId"
    WHERE s."confirmedAt" IS NOT NULL
  `;

  let backfilledCount = 0;

  for (const status of confirmedStatuses) {
    const applicantUsers = await prisma.applicantUser.findMany({
      where: { companyId: status.companyId, isActive: true },
    });

    for (const applicantUser of applicantUsers) {
      const existing = await prisma.announcementReadReceipt.findUnique({
        where: {
          announcementId_applicantUserId: {
            announcementId: status.announcementId,
            applicantUserId: applicantUser.id,
          },
        },
      });
      if (existing) {
        // 既存レシートは上書きしない（冪等・巻き戻し防止）
        continue;
      }

      await prisma.announcementReadReceipt.create({
        data: {
          announcementId: status.announcementId,
          applicantUserId: applicantUser.id,
          confirmedAt: status.confirmedAt,
        },
      });
      backfilledCount += 1;
    }
  }

  return { backfilledCount };
}

/**
 * CLIエントリーポイント。`npm run db:backfill-announcement-read-receipts`
 * （`tsx prisma/backfill-announcement-read-receipts.ts`）から実行する。
 * 環境（ローカル・本番Cloud SQL等）ごとに手動で1回実行する運用とする
 * （`prisma migrate deploy`と同様、本番への反映は自動化されない）。
 * マイグレーションA（`AnnouncementReadReceipt`追加）の後、マイグレーションB
 * （`AnnouncementRecipientStatus.confirmedAt`削除）より前に実行すること。
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const { backfilledCount } = await backfillAnnouncementReadReceipts(prisma);

    console.log("Backfill complete:", { backfilledReadReceipts: backfilledCount });
  } finally {
    await prisma.$disconnect();
  }
}

// テストからimportされた際にDB接続を伴う`main()`が実行されないよう、CLIとして
// 直接実行された場合（`tsx prisma/backfill-announcement-read-receipts.ts`）のみ起動する。
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
