import { PrismaClient } from "@prisma/client";

type BackfillPrismaClient = Pick<PrismaClient, "company" | "announcementRecipient">;

/**
 * `AnnouncementRecipient`（お知らせの確認済み・実施済み状態やリマインド送信対象を追跡する
 * 会社単位のマスタ）を1件も持たない既存`Company`を検出し、各社に代表1件を補完する。
 *
 * `helpdesk-account-management`spec 導入前は`prisma/seed.ts`のみが`Company`と
 * `AnnouncementRecipient`を同時に投入していたが、同spec導入後の管理画面経由の
 * `Company`作成フロー（`src/lib/server/company-service.ts`の`createCompany`、修正前実装）は
 * `AnnouncementRecipient`を作らなかったため、修正より前に管理画面経由で作成された既存
 * `Company`は担当者0件のままお知らせのトラッキング・自己申告・リマインド選択の対象外に
 * なっている（要件13）。本関数はその既存データを後追いで救済する。
 *
 * 冪等（idempotent）: 既に`AnnouncementRecipient`を1件以上持つ`Company`はスキップするため、
 * 複数回実行しても重複したレコードは作られない（要件13.2）。
 * `AnnouncementRecipientStatus`（確認済み・実施済み・リマインド送信履歴）は一切変更しない
 * （要件13.5）。
 *
 * Prismaクライアントを引数で受け取ることで、実DBを使わないテストからも
 * （モックしたクライアントを渡して）同じロジックを検証できるようにしている。
 */
export async function backfillAnnouncementRecipients(
  prisma: BackfillPrismaClient
): Promise<{ backfilledCompanyCodes: string[] }> {
  const companiesMissingRecipients = await prisma.company.findMany({
    where: { announcementRecipients: { none: {} } },
    orderBy: { name: "asc" },
  });

  for (const company of companiesMissingRecipients) {
    await prisma.announcementRecipient.create({
      data: {
        companyId: company.id,
        contactName: company.name,
      },
    });
  }

  return {
    backfilledCompanyCodes: companiesMissingRecipients.map((company) => company.companyCode),
  };
}

/**
 * CLIエントリーポイント。`npm run db:backfill-announcement-recipients`
 * （`tsx prisma/backfill-announcement-recipients.ts`）から実行する。
 * 環境（ローカル・本番Cloud SQL等）ごとに手動で1回実行する運用とする
 * （`prisma migrate deploy`と同様、本番への反映は自動化されない）。
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const { backfilledCompanyCodes } = await backfillAnnouncementRecipients(prisma);

    if (backfilledCompanyCodes.length === 0) {
      console.log("Backfill complete: no Company is missing AnnouncementRecipient.");
      return;
    }

    for (const companyCode of backfilledCompanyCodes) {
      console.log(`Backfilled AnnouncementRecipient for ${companyCode}`);
    }
    console.log("Backfill complete:", { backfilledCompanies: backfilledCompanyCodes.length });
  } finally {
    await prisma.$disconnect();
  }
}

// テストからimportされた際にDB接続を伴う`main()`が実行されないよう、CLIとして
// 直接実行された場合（`tsx prisma/backfill-announcement-recipients.ts`）のみ起動する。
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
