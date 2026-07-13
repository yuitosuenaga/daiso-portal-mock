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
    publishStartDate: null as string | null,
    publishEndDate: null as string | null,
    dueDate: "2026-07-14" as string | null,
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
    publishStartDate: null as string | null,
    publishEndDate: "2026-12-31" as string | null,
    dueDate: null as string | null,
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
    publishStartDate: null as string | null,
    publishEndDate: null as string | null,
    dueDate: "2026-07-20" as string | null,
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
    publishStartDate: null as string | null,
    publishEndDate: null as string | null,
    dueDate: null as string | null,
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
    publishStartDate: null as string | null,
    publishEndDate: null as string | null,
    dueDate: "2026-06-17" as string | null,
  },
  {
    id: "seed-announcement-006",
    title: "【公開予定】次期ポータル機能の事前案内",
    publishedAt: "2026-07-08T09:00:00Z",
    category: "policy" as const,
    body: "公開開始日が未来に設定されたお知らせの動作確認用データです。海外販社側には公開開始日前は表示されません。",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    actionRequired: false,
    publishStartDate: "2099-01-01" as string | null,
    publishEndDate: null as string | null,
    dueDate: null as string | null,
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
        publishStartDate: seed.publishStartDate ? new Date(seed.publishStartDate) : null,
        publishEndDate: seed.publishEndDate ? new Date(seed.publishEndDate) : null,
        dueDate: seed.dueDate ? new Date(seed.dueDate) : null,
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

/**
 * フェーズ1のモックシード用PDF（1ページ、"Sample Document PDF"とだけ描画される最小限のPDF）。
 * `src/lib/api/documents.ts`の`SAMPLE_PDF_DATA_URL`と同一。
 */
const SAMPLE_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK";

/** 既存モック（`MOCK_DOCUMENTS`）と同内容のドキュメント5件。 */
const DOCUMENT_SEEDS = [
  {
    id: "seed-document-001",
    title: "店舗運営マニュアル（共通版）",
    description: "全販社共通の店舗運営における基本ルールをまとめたマニュアルです。",
    fileName: "store-operations-manual.pdf",
    fileSize: 245_760,
    uploadedAt: "2026-07-01T09:00:00Z",
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
  },
  {
    id: "seed-document-002",
    title: "商品陳列ガイドライン（東南アジア版）",
    description: "東南アジア地域向けの商品陳列レイアウトのガイドラインです。",
    fileName: "merchandising-guideline-sea.pdf",
    fileSize: 512_000,
    uploadedAt: "2026-06-25T09:00:00Z",
    targetingScope: "countries" as const,
    targetingCountries: ["VN", "TH", "ID"],
    targetingCompanyCodes: [] as string[],
  },
  {
    id: "seed-document-003",
    title: "レジ操作マニュアル（ベトナム限定）",
    description: "ベトナム販社向けのレジ端末操作手順をまとめた資料です。",
    fileName: "pos-manual-vietnam.pdf",
    fileSize: 189_440,
    uploadedAt: "2026-06-20T09:00:00Z",
    targetingScope: "companies" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: ["vn-daiso-vietnam"],
  },
  {
    id: "seed-document-004",
    title: "内部監査資料（本部限定）",
    description: "日本本部限定の内部監査に関する資料です。",
    fileName: "internal-audit-hq-only.pdf",
    fileSize: 1_048_576,
    uploadedAt: "2026-06-15T09:00:00Z",
    targetingScope: "companies" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: ["jp-daiso-japan-trading"],
  },
  {
    id: "seed-document-005",
    title: "什器組み立て手順書（北米向け）",
    description: "北米地域向け店舗什器の組み立て手順をまとめた資料です。",
    fileName: "fixture-assembly-us.pdf",
    fileSize: 358_400,
    uploadedAt: "2026-06-10T09:00:00Z",
    targetingScope: "countries" as const,
    targetingCountries: ["US"],
    targetingCompanyCodes: [] as string[],
  },
];

async function seedDocuments(): Promise<void> {
  for (const seed of DOCUMENT_SEEDS) {
    await prisma.document.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        title: seed.title,
        description: seed.description,
        fileName: seed.fileName,
        fileSize: seed.fileSize,
        dataUrl: SAMPLE_PDF_DATA_URL,
        uploadedAt: new Date(seed.uploadedAt),
        targetingScope: seed.targetingScope,
        targetingCountries: seed.targetingCountries,
        targetingCompanyCodes: seed.targetingCompanyCodes,
      },
    });
  }
}

/** 既存モック（`MOCK_FAQS`）と同内容のFAQ12件。 */
const FAQ_SEEDS = [
  {
    id: "seed-faq-001",
    category: "inquiry_method" as const,
    question: "本社への問い合わせはどの方法で行えば良いですか。",
    answer:
      "ポータル上の「問い合わせ申請」ページから、案件種別・緊急度・内容を入力して送信してください。メールや電話での問い合わせは受け付けておりません。",
  },
  {
    id: "seed-faq-002",
    category: "inquiry_method" as const,
    question: "複数の案件をまとめて1件の問い合わせとして送信できますか。",
    answer:
      "1件の問い合わせにつき1つの案件のみご記入ください。複数の案件がある場合は、それぞれ個別に問い合わせを作成してください。",
  },
  {
    id: "seed-faq-003",
    category: "inquiry_method" as const,
    question: "緊急度の高い問い合わせを行った場合、対応は早くなりますか。",
    answer:
      "緊急度は対応の優先順位付けの参考情報として利用しますが、対応順序や対応完了時期を保証するものではありません。緊急性の高い内容は具体的な状況を本文に記載してください。",
  },
  {
    id: "seed-faq-004",
    category: "form_input" as const,
    question: "問い合わせフォームの「原文言語」は何のために入力しますか。",
    answer:
      "「原文言語」は、問い合わせ内容（自由記述）が元々どの言語で書かれているかを示す項目です。本社側での翻訳・確認作業に利用します。",
  },
  {
    id: "seed-faq-005",
    category: "form_input" as const,
    question: "自由記述欄の文字数に上限はありますか。",
    answer:
      "自由記述欄には文字数の上限があります。入力欄の下に表示される残り文字数を確認しながら入力し、上限を超える場合は内容を要約して記載してください。",
  },
  {
    id: "seed-faq-006",
    category: "form_input" as const,
    question: "会社名や国の情報は毎回入力する必要がありますか。",
    answer:
      "現在のフェーズでは問い合わせごとに会社名・国を入力していただく仕様となっています。入力内容に誤りがあると対応が遅れる可能性がありますので、正確にご入力ください。",
  },
  {
    id: "seed-faq-007",
    category: "status" as const,
    question: "送信した問い合わせの対応状況はどこで確認できますか。",
    answer:
      "「問い合わせ一覧」ページで、自社が送信した問い合わせの対応状況（新規・対応中・解決済み）を確認できます。",
  },
  {
    id: "seed-faq-008",
    category: "status" as const,
    question: "「対応中」から「解決済み」に変わるまでの目安期間はどれくらいですか。",
    answer:
      "案件の内容や混雑状況により対応期間は異なるため、一律の目安期間は設けておりません。進捗が気になる場合は、問い合わせ一覧の詳細画面をご確認ください。",
  },
  {
    id: "seed-faq-009",
    category: "status" as const,
    question: "解決済みになった問い合わせについて、追加で質問したい場合はどうすれば良いですか。",
    answer:
      "解決済みの問い合わせに対する追記機能は現在提供しておりません。追加で確認したい内容がある場合は、新規の問い合わせとして改めて送信してください。",
  },
  {
    id: "seed-faq-010",
    category: "other" as const,
    question: "ポータルの表示言語はどこで切り替えられますか。",
    answer:
      "画面上部のヘッダーにある言語切り替えメニューから、日本語・英語の表示を切り替えることができます。",
  },
  {
    id: "seed-faq-011",
    category: "other" as const,
    question: "ポータルにログインできない場合はどうすれば良いですか。",
    answer:
      "ログインに関するトラブルは、社内の情報システム管理者または導入時にご案内した連絡先にお問い合わせください。本ポータルの問い合わせフォームでは対応できません。",
  },
  {
    id: "seed-faq-012",
    category: "other" as const,
    question: "リンク集やお知らせの内容はどのくらいの頻度で更新されますか。",
    answer:
      "リンク集やお知らせは、本社側で随時更新しています。更新頻度は内容によって異なり、一定のスケジュールは定めていません。",
  },
];

async function seedFaqs(): Promise<void> {
  for (const seed of FAQ_SEEDS) {
    await prisma.faq.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        category: seed.category,
        question: seed.question,
        answer: seed.answer,
      },
    });
  }
}

/** 既存モック（`MOCK_LINKS`）と同内容のリンク11件。 */
const LINK_SEEDS = [
  {
    id: "seed-link-001",
    title: "社内ポータル（グループウェア）",
    url: "https://example.com/internal/groupware",
    category: "internal" as const,
    description: "スケジュール管理・社内連絡に使用する社内ポータルです。",
  },
  {
    id: "seed-link-002",
    title: "販売管理システム",
    url: "https://example.com/internal/sales-system",
    category: "internal" as const,
    description: "受発注状況・在庫状況を確認できる販売管理システムです。",
  },
  {
    id: "seed-link-003",
    title: "勤怠管理システム",
    url: "https://example.com/internal/attendance",
    category: "internal" as const,
    description: null,
  },
  {
    id: "seed-link-004",
    title: "Daiso公式サイト",
    url: "https://example.com/external/daiso-official",
    category: "external" as const,
    description: "商品情報・店舗情報を掲載する公式サイトです。",
  },
  {
    id: "seed-link-005",
    title: "取引先向けサプライヤーポータル",
    url: "https://example.com/external/supplier-portal",
    category: "external" as const,
    description: "取引先企業との連携に利用する外部ポータルです。",
  },
  {
    id: "seed-link-006",
    title: "為替レート情報サイト",
    url: "https://example.com/external/exchange-rate",
    category: "external" as const,
    description: null,
  },
  {
    id: "seed-link-007",
    title: "販社担当者向け業務マニュアル",
    url: "https://example.com/document/operation-manual.pdf",
    category: "document" as const,
    description: "日常業務の手順をまとめたマニュアルです。",
  },
  {
    id: "seed-link-008",
    title: "問い合わせ対応フローチャート",
    url: "https://example.com/document/inquiry-flowchart.pdf",
    category: "document" as const,
    description: "問い合わせ受付から解決までの対応フローです。",
  },
  {
    id: "seed-link-009",
    title: "よくある質問集（FAQ）",
    url: "https://example.com/document/faq.pdf",
    category: "document" as const,
    description: null,
  },
  {
    id: "seed-link-010",
    title: "本社連絡先一覧",
    url: "https://example.com/other/contact-list",
    category: "other" as const,
    description: "各拠点の本社窓口の連絡先一覧です。",
  },
  {
    id: "seed-link-011",
    title: "システム利用規約",
    url: "https://example.com/other/terms-of-use",
    category: "other" as const,
    description: null,
  },
];

async function seedLinks(): Promise<void> {
  for (const seed of LINK_SEEDS) {
    await prisma.link.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        title: seed.title,
        url: seed.url,
        category: seed.category,
        description: seed.description,
      },
    });
  }
}

/** 既存モック（`MOCK_REPLY_TEMPLATES`）と同内容の返信テンプレート7件。 */
const REPLY_TEMPLATE_SEEDS = [
  {
    id: "seed-reply-template-001",
    category: "defect" as const,
    name: "不良品対応（交換・返金案内）",
    body: "この度はご不便をおかけし申し訳ございません。不良品の詳細を確認のうえ、交換または返金の対応についてご案内いたします。",
  },
  {
    id: "seed-reply-template-002",
    category: "defect" as const,
    name: "不良品対応（詳細確認依頼）",
    body: "お問い合わせいただいた不良の状況について、恐れ入りますが写真または詳細な症状をご共有いただけますでしょうか。確認のうえ改めてご案内いたします。",
  },
  {
    id: "seed-reply-template-003",
    category: "order" as const,
    name: "発注内容確認（発送日未定）",
    body: "お問い合わせいただいた発注内容について確認いたしました。発送予定日が確定次第、改めてご連絡いたします。",
  },
  {
    id: "seed-reply-template-004",
    category: "order" as const,
    name: "発注内容確認（発送日確定案内）",
    body: "ご注文いただいた商品の発送日が確定いたしましたのでご案内いたします。発送後、追跡番号を別途ご連絡いたします。",
  },
  {
    id: "seed-reply-template-005",
    category: "system" as const,
    name: "システム不具合（受付・調査中）",
    body: "システムの不具合について報告いただきありがとうございます。現在状況を確認しておりますので、今しばらくお待ちください。",
  },
  {
    id: "seed-reply-template-006",
    category: "system" as const,
    name: "システム不具合（対応完了報告）",
    body: "ご報告いただいたシステムの不具合について、修正対応が完了いたしましたのでご報告いたします。ご不便をおかけし申し訳ございませんでした。",
  },
  {
    id: "seed-reply-template-007",
    category: "other" as const,
    name: "その他問い合わせ（受付案内）",
    body: "お問い合わせいただきありがとうございます。内容を確認のうえ、担当部署より改めてご連絡いたします。",
  },
];

async function seedReplyTemplates(): Promise<void> {
  for (const seed of REPLY_TEMPLATE_SEEDS) {
    await prisma.replyTemplate.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        category: seed.category,
        name: seed.name,
        body: seed.body,
      },
    });
  }
}

/**
 * 問い合わせ一覧のデモ用に、様々なカテゴリ・緊急度・ステータス・国を持つ
 * 問い合わせ10件を追加投入する（`seed-inquiry-001`とは別に、各社の窓口担当者からの
 * 問い合わせを想定したサンプル）。
 */
const ADDITIONAL_INQUIRY_SEEDS = [
  {
    id: "inquiry-001",
    title: "納品商品の一部破損について",
    category: "defect" as const,
    urgency: "high" as const,
    storeRegion: "Kanto",
    originalText: "店舗に納品された商品の一部に破損が見られます。至急対応をお願いします。",
    originalLanguage: "ja",
    translatedText: null as string | null,
    status: "new" as const,
    companyCode: "jp-daiso-japan-trading",
    createdAt: "2026-06-28T18:15:00Z",
  },
  {
    id: "inquiry-002",
    title: "Additional order request for next shipment",
    category: "order" as const,
    urgency: "medium" as const,
    storeRegion: "West Coast",
    originalText: "We would like to place an additional order for next month's shipment.",
    originalLanguage: "en",
    translatedText: "来月分の配送に向けて追加発注をお願いしたいです。",
    status: "in_progress" as const,
    companyCode: "us-daiso-usa",
    createdAt: "2026-06-25T23:30:00Z",
  },
  {
    id: "inquiry-003",
    title: "포털 시스템 로그인 불가 문제",
    category: "system" as const,
    urgency: "high" as const,
    storeRegion: "Seoul",
    originalText: "포털 시스템에 로그인할 수 없는 문제가 발생하고 있습니다.",
    originalLanguage: "ko",
    translatedText: "ポータルシステムにログインできない問題が発生しています。",
    status: "new" as const,
    companyCode: "kr-daiso-korea",
    createdAt: "2026-06-29T11:45:00Z",
  },
  {
    id: "inquiry-004",
    title: "販促キャンペーン資料の共有依頼",
    category: "other" as const,
    urgency: "low" as const,
    storeRegion: "Bangkok",
    originalText: "次回の販促キャンペーンに関する資料の共有をお願いしたいです。",
    originalLanguage: "ja",
    translatedText: null as string | null,
    status: "resolved" as const,
    companyCode: "th-daiso-thailand",
    createdAt: "2026-06-10T15:00:00Z",
  },
  {
    id: "inquiry-005",
    title: "部分商品外包裝輕微破損",
    category: "defect" as const,
    urgency: "medium" as const,
    storeRegion: "Taipei",
    originalText: "部分商品外包裝有輕微破損，請確認是否需要更換。",
    originalLanguage: "zh",
    translatedText: "一部商品の外装に軽微な破損が見られます。交換の必要があるかご確認ください。",
    status: "in_progress" as const,
    companyCode: "tw-daiso-taiwan",
    createdAt: "2026-06-20T20:20:00Z",
  },
  {
    id: "inquiry-006",
    title: "Delivery date confirmation for order #4821",
    category: "order" as const,
    urgency: "low" as const,
    storeRegion: "Singapore",
    originalText: "Could you confirm the estimated delivery date for order #4821?",
    originalLanguage: "en",
    translatedText: "注文番号#4821の配送予定日をご確認いただけますでしょうか。",
    status: "resolved" as const,
    companyCode: "sg-daiso-singapore",
    createdAt: "2026-05-30T17:10:00Z",
  },
  {
    id: "inquiry-007",
    title: "Cổng thông tin tải chậm khi xem đơn hàng",
    category: "system" as const,
    urgency: "low" as const,
    storeRegion: "Ho Chi Minh City",
    originalText: "Trang cổng thông tin hiển thị chậm khi tải danh sách đơn hàng.",
    originalLanguage: "vi",
    translatedText: "ポータルサイトで注文一覧を読み込む際の表示が遅くなっています。",
    status: "new" as const,
    companyCode: "vn-daiso-vietnam",
    createdAt: "2026-06-27T22:05:00Z",
  },
  {
    id: "inquiry-008",
    title: "Pertanyaan perpanjangan kontrak distribusi",
    category: "other" as const,
    urgency: "medium" as const,
    storeRegion: "Jakarta",
    originalText: "Kami ingin menanyakan mengenai perpanjangan kontrak distribusi.",
    originalLanguage: "id",
    translatedText: "販売契約の更新についてお伺いしたいです。",
    status: "in_progress" as const,
    companyCode: "id-daiso-indonesia",
    createdAt: "2026-06-15T14:40:00Z",
  },
  {
    id: "inquiry-009",
    title: "Đặt thêm hàng cho đợt giao tháng sau",
    category: "order" as const,
    urgency: "medium" as const,
    storeRegion: "Da Nang",
    originalText: "Chúng tôi muốn đặt thêm hàng cho đợt giao tháng sau.",
    originalLanguage: "vi",
    translatedText: "来月分の配送に向けて追加発注をお願いしたいです。",
    status: "in_progress" as const,
    companyCode: "vn-daiso-vietnam",
    createdAt: "2026-06-22T18:30:00Z",
  },
  {
    id: "inquiry-010",
    title: "Sản phẩm lỗi đã đổi trả - đã xử lý xong",
    category: "defect" as const,
    urgency: "high" as const,
    storeRegion: "Hanoi",
    originalText: "Sản phẩm giao đến bị lỗi, đã được đổi trả và xử lý xong.",
    originalLanguage: "vi",
    translatedText: "納品された商品に不具合があり、交換・対応は既に完了しております。",
    status: "resolved" as const,
    companyCode: "vn-daiso-vietnam",
    createdAt: "2026-06-05T11:15:00Z",
  },
];

async function seedAdditionalInquiries(
  companyIdByCode: Map<string, string>
): Promise<void> {
  for (const seed of ADDITIONAL_INQUIRY_SEEDS) {
    const companyId = companyIdByCode.get(seed.companyCode)!;
    const company = COMPANY_OPTIONS.find((c) => c.code === seed.companyCode)!;

    await prisma.inquiry.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        title: seed.title,
        category: seed.category,
        urgency: seed.urgency,
        storeRegion: seed.storeRegion,
        originalText: seed.originalText,
        originalLanguage: seed.originalLanguage,
        translatedText: seed.translatedText ?? undefined,
        status: seed.status,
        createdAt: new Date(seed.createdAt),
        companyId,
        submittedByCompanyName: company.name,
        submittedByCountry: company.country,
      },
    });
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
      title: "納品商品の破損について（至急）",
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

  await seedAdditionalInquiries(companyIdByCode);
  await seedAnnouncementRecipients(companyIdByCode);
  await seedAnnouncements();
  await seedAnnouncementRecipientStatuses();
  await seedDocuments();
  await seedFaqs();
  await seedLinks();
  await seedReplyTemplates();

  console.log("Seed complete:", {
    companies: COMPANY_OPTIONS.length,
    applicantUser: applicantUser.email,
    helpdeskStaff: helpdeskStaff.email,
    inquiry: inquiry.id,
    additionalInquiries: ADDITIONAL_INQUIRY_SEEDS.length,
    announcements: ANNOUNCEMENT_SEEDS.length,
    documents: DOCUMENT_SEEDS.length,
    faqs: FAQ_SEEDS.length,
    links: LINK_SEEDS.length,
    replyTemplates: REPLY_TEMPLATE_SEEDS.length,
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
