import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password1234";

/**
 * `DOCUMENT_COMPANY_OPTIONS`（`src/lib/constants/document-company-options.ts`）と同一の会社マスタ。
 * お知らせの配信対象・確認状況追跡のデモデータを成立させるため、フェーズ1モックと同じ8社を投入する。
 */
const COMPANY_OPTIONS = [
  { code: "jp-daiso-japan-trading", name: "Daiso Japan Trading Co.", country: "JP" },
  { code: "us-daiso-usa", name: "Daiso USA Inc.", country: "US" },
  { code: "kr-daiso-korea", name: "Daiso Korea Co., Ltd.", country: "KR" },
  { code: "th-daiso-thailand", name: "Daiso Thailand Co., Ltd.", country: "TH" },
  { code: "vn-daiso-vietnam", name: "Daiso Vietnam Co., Ltd.", country: "VN" },
  { code: "id-daiso-indonesia", name: "Daiso Indonesia Co., Ltd.", country: "ID" },
  { code: "tw-daiso-taiwan", name: "Daiso Taiwan Co., Ltd.", country: "TW" },
  { code: "sg-daiso-singapore", name: "Daiso Singapore Pte. Ltd.", country: "SG" },
] as const;

/** `ANNOUNCEMENT_RECIPIENTS`（`src/lib/constants/announcement-recipients.ts`）と同一の担当者名。 */
const CONTACT_NAMES_BY_COMPANY_CODE: Record<string, [string, string]> = {
  "jp-daiso-japan-trading": ["高橋 直子", "佐藤 健"],
  "us-daiso-usa": ["Robert Johnson", "Emily Davis"],
  "kr-daiso-korea": ["Kim Min-jun", "Lee Seo-yeon"],
  "th-daiso-thailand": ["Somchai Srisuk", "Nittaya Boonmee"],
  "vn-daiso-vietnam": ["Nguyen Van An", "Tran Thi Hoa"],
  "id-daiso-indonesia": ["Budi Santoso", "Siti Rahayu"],
  "tw-daiso-taiwan": ["Chen Chih-Ming", "Lin Mei-Ling"],
  "sg-daiso-singapore": ["Wei Ming Tan", "Priya Sharma"],
};

/** 既存モック（`MOCK_ANNOUNCEMENTS`）と同内容のお知らせ5件。 */
const ANNOUNCEMENT_SEEDS = [
  {
    id: "seed-announcement-001",
    title: "システムメンテナンスのお知らせ（7月15日 2:00〜4:00）",
    publishedAt: "2026-07-01T09:00:00Z",
    category: "maintenance" as const,
    body: "2026年7月15日 2:00〜4:00の間、システムメンテナンスを実施いたします。メンテナンス中はポータルサイトにアクセスできませんのでご注意ください。ご不便をおかけしますが、何卒ご理解のほどよろしくお願いいたします。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: true,
  },
  {
    id: "seed-announcement-002",
    title: "新しいFAQページを追加しました",
    publishedAt: "2026-06-28T09:00:00Z",
    category: "other" as const,
    body: "よくあるお問い合わせをまとめたFAQページを新設しました。お問い合わせの前にぜひご活用ください。今後も内容を随時更新してまいります。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: false,
  },
  {
    id: "seed-announcement-003",
    title: "問い合わせフォームの項目を更新しました",
    publishedAt: "2026-06-20T09:00:00Z",
    category: "policy" as const,
    body: "問い合わせ・申請フォームの入力項目を一部更新しました。案件種別・緊急度の選択肢が変更されておりますので、ご利用の際はご確認ください。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: true,
  },
  {
    id: "seed-announcement-004",
    title: "夏季休業期間のお知らせ（8月13日〜16日）",
    publishedAt: "2026-06-15T09:00:00Z",
    category: "other" as const,
    body: "誠に恐れ入りますが、8月13日〜16日は夏季休業期間とさせていただきます。休業期間中に受け付けた問い合わせは、休業明けに順次対応いたします。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: false,
  },
  {
    id: "seed-announcement-005",
    title: "決済システム障害の発生について",
    publishedAt: "2026-06-10T09:00:00Z",
    category: "incident" as const,
    body: "本日未明、決済システムに障害が発生し、一部の処理が正常に完了しない事象が確認されました。現在は復旧しておりますが、影響を受けた処理については別途ご案内いたします。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: true,
  },
];

/**
 * 既存モック（`createInitialStatuses`）と同内容の確認済み・実施済み・リマインド送信状況。
 * 担当者IDは`${companyCode}-1`・`${companyCode}-2`（`ANNOUNCEMENT_RECIPIENTS`と同じ採番）。
 */
const RECIPIENT_STATUS_SEEDS: {
  announcementId: string;
  confirmed: string[];
  completed: string[];
  reminded: string[];
}[] = [
  {
    announcementId: "seed-announcement-001",
    confirmed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "vn-daiso-vietnam-1",
      "id-daiso-indonesia-1",
      "tw-daiso-taiwan-1",
      "sg-daiso-singapore-1",
      "jp-daiso-japan-trading-2",
      "us-daiso-usa-2",
    ],
    completed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "jp-daiso-japan-trading-2",
      "us-daiso-usa-2",
    ],
    reminded: [],
  },
  {
    announcementId: "seed-announcement-002",
    confirmed: [
      "jp-daiso-japan-trading-1",
      "jp-daiso-japan-trading-2",
      "us-daiso-usa-1",
      "us-daiso-usa-2",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "th-daiso-thailand-2",
      "vn-daiso-vietnam-1",
      "vn-daiso-vietnam-2",
      "id-daiso-indonesia-1",
      "tw-daiso-taiwan-1",
      "sg-daiso-singapore-1",
    ],
    completed: [],
    reminded: [],
  },
  {
    announcementId: "seed-announcement-003",
    confirmed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "vn-daiso-vietnam-1",
      "id-daiso-indonesia-1",
      "tw-daiso-taiwan-1",
      "sg-daiso-singapore-1",
    ],
    completed: ["jp-daiso-japan-trading-1", "us-daiso-usa-1", "kr-daiso-korea-1"],
    reminded: [],
  },
  {
    announcementId: "seed-announcement-004",
    confirmed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "vn-daiso-vietnam-1",
      "id-daiso-indonesia-1",
      "id-daiso-indonesia-2",
      "tw-daiso-taiwan-1",
      "sg-daiso-singapore-1",
    ],
    completed: [],
    reminded: [],
  },
  {
    announcementId: "seed-announcement-005",
    confirmed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
      "vn-daiso-vietnam-1",
      "id-daiso-indonesia-1",
      "tw-daiso-taiwan-1",
      "sg-daiso-singapore-1",
    ],
    completed: [
      "jp-daiso-japan-trading-1",
      "us-daiso-usa-1",
      "kr-daiso-korea-1",
      "th-daiso-thailand-1",
    ],
    // 対応要否ありだが未実施のまま、リマインドを送信済みのケース（デモ用シード）。
    reminded: ["vn-daiso-vietnam-1", "id-daiso-indonesia-1"],
  },
];

const CONFIRMED_AT = "2026-07-02T03:00:00Z";
const COMPLETED_AT = "2026-07-02T05:00:00Z";
const REMINDER_SENT_AT = "2026-07-05T00:00:00Z";

async function seedCompanies(): Promise<Map<string, string>> {
  const companyIdByCode = new Map<string, string>();

  for (const option of COMPANY_OPTIONS) {
    const company = await prisma.company.upsert({
      where: { companyCode: option.code },
      update: {},
      create: {
        name: option.name,
        country: option.country,
        companyCode: option.code,
      },
    });
    companyIdByCode.set(option.code, company.id);
  }

  return companyIdByCode;
}

async function seedAnnouncementRecipients(
  companyIdByCode: Map<string, string>
): Promise<void> {
  for (const option of COMPANY_OPTIONS) {
    const [firstContactName, secondContactName] =
      CONTACT_NAMES_BY_COMPANY_CODE[option.code];
    const companyId = companyIdByCode.get(option.code)!;

    await prisma.announcementRecipient.upsert({
      where: { id: `${option.code}-1` },
      update: {},
      create: { id: `${option.code}-1`, companyId, contactName: firstContactName },
    });
    await prisma.announcementRecipient.upsert({
      where: { id: `${option.code}-2` },
      update: {},
      create: { id: `${option.code}-2`, companyId, contactName: secondContactName },
    });
  }
}

async function seedAnnouncements(): Promise<void> {
  for (const seed of ANNOUNCEMENT_SEEDS) {
    await prisma.announcement.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        title: seed.title,
        body: seed.body,
        category: seed.category,
        publishedAt: new Date(seed.publishedAt),
        actionRequired: seed.actionRequired,
        targetingScope: seed.targetingScope,
        targetingCountries: seed.targetingCountries,
      },
    });
  }
}

async function seedAnnouncementRecipientStatuses(): Promise<void> {
  for (const seed of RECIPIENT_STATUS_SEEDS) {
    const recipientIds = Array.from(
      new Set([...seed.confirmed, ...seed.completed, ...seed.reminded])
    );

    for (const recipientId of recipientIds) {
      await prisma.announcementRecipientStatus.upsert({
        where: {
          announcementId_recipientId: {
            announcementId: seed.announcementId,
            recipientId,
          },
        },
        update: {},
        create: {
          announcementId: seed.announcementId,
          recipientId,
          confirmedAt: seed.confirmed.includes(recipientId) ? new Date(CONFIRMED_AT) : null,
          completedAt: seed.completed.includes(recipientId) ? new Date(COMPLETED_AT) : null,
          reminderSentAt: seed.reminded.includes(recipientId)
            ? new Date(REMINDER_SENT_AT)
            : null,
        },
      });
    }
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const companyIdByCode = await seedCompanies();
  const vietnamCompanyId = companyIdByCode.get("vn-daiso-vietnam")!;

  const applicantUser = await prisma.applicantUser.upsert({
    where: { email: "applicant@daiso-vietnam.example.com" },
    update: {},
    create: {
      email: "applicant@daiso-vietnam.example.com",
      passwordHash,
      displayName: "Nguyen Van A",
      companyId: vietnamCompanyId,
    },
  });

  const helpdeskStaff = await prisma.helpdeskStaff.upsert({
    where: { email: "staff@helpdesk.example.com" },
    update: {},
    create: {
      email: "staff@helpdesk.example.com",
      passwordHash,
      displayName: "田中 太郎",
    },
  });

  const inquiry = await prisma.inquiry.upsert({
    where: { id: "seed-inquiry-001" },
    update: {},
    create: {
      id: "seed-inquiry-001",
      category: "defect",
      urgency: "high",
      storeRegion: "Ho Chi Minh City",
      originalText: "納品された商品に破損が見られます。至急対応をお願いします。",
      originalLanguage: "ja",
      status: "new",
      companyId: vietnamCompanyId,
      submittedByCompanyName: "Daiso Vietnam Co., Ltd.",
      submittedByCountry: "VN",
    },
  });

  await seedAnnouncementRecipients(companyIdByCode);
  await seedAnnouncements();
  await seedAnnouncementRecipientStatuses();

  console.log("Seed complete:", {
    companies: COMPANY_OPTIONS.length,
    applicantUser: applicantUser.email,
    helpdeskStaff: helpdeskStaff.email,
    inquiry: inquiry.id,
    announcements: ANNOUNCEMENT_SEEDS.length,
  });
  console.log(`Seed password for both accounts: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
