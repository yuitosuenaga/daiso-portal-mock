import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DocumentManagementListClient } from "@/components/features/helpdesk-documents/DocumentManagementListClient";
import type { Document } from "@/types/document";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/actions/documents", () => ({
  deleteDocumentAction: vi.fn(),
}));

const FILTER_MESSAGES: Record<string, string> = {
  keywordLabel: "キーワード検索",
  keywordPlaceholder: "タイトルや説明に含まれる語句",
  sourceTypeLabel: "登録方式",
  sourceTypeAll: "すべての登録方式",
  sourceTypeUpload: "アップロード",
  sourceTypeGoogle: "Googleリンク",
  scopeLabel: "公開範囲",
  scopeAll: "すべての公開範囲",
  scopeAllScope: "全体公開",
  scopeCountries: "国単位",
  scopeCompanies: "販社単位",
  clearButton: "条件をクリア",
  noResults: "該当するドキュメントがありません",
  categoryLabel: "大分類",
  categoryAll: "すべての大分類",
  categoryUnassigned: "未設定",
  subCategoryLabel: "中分類",
  subCategoryAll: "すべての中分類",
};

const PAGINATION_MESSAGES: Record<string, string> = {
  previousLabel: "前へ",
  nextLabel: "次へ",
  pageStatus: "{current} / {total} ページ",
};

const LIST_MESSAGES: Record<string, string> = {
  deleteButton: "削除",
  deleteConfirmTitle: "ドキュメントの削除",
  deleteConfirm: "『{title}』を削除します。この操作は取り消せません。よろしいですか？",
  deleteConfirmButton: "削除する",
  deleteCancelButton: "キャンセル",
  deleteError: "削除に失敗しました。時間を置いて再度お試しください。",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dict =
      namespace === "helpdeskDocuments.list.filter"
        ? FILTER_MESSAGES
        : namespace === "helpdeskDocuments.list.pagination"
          ? PAGINATION_MESSAGES
          : namespace === "helpdeskDocuments.list"
            ? LIST_MESSAGES
            : {};
    return (key: string, values?: Record<string, unknown>) => {
      const template = dict[key] ?? `${namespace}.${key}`;
      if (!values) {
        return template;
      }
      return template.replace(/\{(\w+)\}/g, (_, token: string) =>
        String(values[token] ?? `{${token}}`)
      );
    };
  },
}));

function buildDocument(overrides: Partial<Document> & { id: string }): Document {
  return {
    title: "ドキュメント",
    sourceType: "upload",
    status: "published",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  } as Document;
}

const DEFAULT_PROPS = {
  locale: "ja",
  listTitle: "ドキュメント管理",
  editLinkLabel: "編集",
  sourceTypeUploadBadgeLabel: "アップロード",
  sourceTypeGoogleBadgeLabel: "Googleリンク",
  statusDraftBadgeLabel: "下書き",
  statusPublishedBadgeLabel: "公開",
  targetingLabels: {
    allLabel: "全体公開",
    countriesLabel: "対象国・地域",
    companiesLabel: "対象販社",
    countryLabels: {},
    companyLabels: {},
  },
  categories: [],
  categoryLabel: "大分類",
  subCategoryLabel: "中分類",
  categoryUnassignedLabel: "未設定",
};

describe("DocumentManagementListClient", () => {
  it("キーワードでタイトル・説明を絞り込む", async () => {
    const documents = [
      buildDocument({ id: "1", title: "利用規約" }),
      buildDocument({ id: "2", title: "Onboarding Guide" }),
    ];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "Onboarding");

    expect(screen.getByText("Onboarding Guide")).toBeTruthy();
    expect(screen.queryByText("利用規約")).toBeNull();
  });

  it("登録方式で絞り込む", async () => {
    const documents = [
      buildDocument({ id: "1", title: "アップロード文書", sourceType: "upload" }),
      buildDocument({
        id: "2",
        title: "Google文書",
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/abc/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/abc/preview",
      }),
    ];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.selectOptions(screen.getByLabelText("登録方式"), "google");

    expect(screen.getByText("Google文書")).toBeTruthy();
    expect(screen.queryByText("アップロード文書")).toBeNull();
  });

  it("公開範囲種別で絞り込む", async () => {
    const documents = [
      buildDocument({ id: "1", title: "全体公開文書", targeting: { scope: "all" } }),
      buildDocument({
        id: "2",
        title: "国限定文書",
        targeting: { scope: "countries", countries: ["vn"] },
      }),
    ];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.selectOptions(screen.getByLabelText("公開範囲"), "countries");

    expect(screen.getByText("国限定文書")).toBeTruthy();
    expect(screen.queryByText("全体公開文書")).toBeNull();
  });

  it("キーワード・登録方式・公開範囲種別を組み合わせて絞り込む", async () => {
    const documents = [
      buildDocument({
        id: "1",
        title: "共通マニュアル",
        sourceType: "upload",
        targeting: { scope: "all" },
      }),
      buildDocument({
        id: "2",
        title: "共通マニュアル Google版",
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/abc/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/abc/preview",
        targeting: { scope: "all" },
      }),
    ];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "共通マニュアル");
    await user.selectOptions(screen.getByLabelText("登録方式"), "google");

    expect(screen.getByText("共通マニュアル Google版")).toBeTruthy();
    expect(screen.queryByText("共通マニュアル")).toBeNull();
  });

  it("絞り込み条件を変更するとページが先頭に戻る", async () => {
    const aaaDocuments = Array.from({ length: 12 }, (_, index) =>
      buildDocument({ id: `aaa-${index}`, title: `AAA${index}` })
    );
    const bbbDocuments = Array.from({ length: 3 }, (_, index) =>
      buildDocument({ id: `bbb-${index}`, title: `BBB${index}` })
    );
    const documents = [...aaaDocuments, ...bbbDocuments];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    // ページ2（AAA10・AAA11・BBB0〜2）へ移動しておく
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("AAA10")).toBeTruthy();
    expect(screen.queryByText("AAA0")).toBeNull();

    // キーワード「AAA」で絞り込むと、依然2ページ分（12件）該当するが、
    // ページが先頭（AAA0〜AAA9を含むページ1）へリセットされることを確認する
    await user.type(screen.getByLabelText("キーワード検索"), "AAA");

    expect(screen.getByText("AAA0")).toBeTruthy();
    expect(screen.queryByText("AAA11")).toBeNull();
  });

  it("絞り込み結果が0件のとき0件メッセージを表示する", async () => {
    const documents = [buildDocument({ id: "1", title: "利用規約" })];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");

    expect(screen.getByText("該当するドキュメントがありません")).toBeTruthy();
  });

  it("条件クリアで絞り込み・ページ状態がリセットされる", async () => {
    const documents = [
      buildDocument({ id: "1", title: "利用規約" }),
      buildDocument({ id: "2", title: "Onboarding Guide" }),
    ];
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");
    expect(screen.getByText("該当するドキュメントがありません")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("利用規約")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();
  });

  it("ページ切り替えで該当ページのみを表示し、アップロード日降順の入力順序を維持する", async () => {
    const documents = Array.from({ length: 12 }, (_, index) =>
      buildDocument({ id: `doc-${index}`, title: `文書${index}` })
    );
    const user = userEvent.setup();
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    expect(screen.getByText("文書0")).toBeTruthy();
    expect(screen.queryByText("文書11")).toBeNull();
    expect(screen.getByText("1 / 2 ページ")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.queryByText("文書0")).toBeNull();
    expect(screen.getByText("文書11")).toBeTruthy();
    expect(screen.getByText("2 / 2 ページ")).toBeTruthy();
  });

  it("既存の登録方式バッジ・編集/削除導線を表示する", () => {
    const documents = [buildDocument({ id: "1", title: "利用規約" })];
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "削除" })).toBeTruthy();
    expect(screen.getAllByText("アップロード").length).toBeGreaterThanOrEqual(1);
  });

  it("下書き・公開が混在する一覧で、行ごとに正しい状態バッジを表示する", () => {
    const documents = [
      buildDocument({ id: "1", title: "下書き文書", status: "draft" }),
      buildDocument({ id: "2", title: "公開文書", status: "published" }),
    ];
    render(<DocumentManagementListClient documents={documents} {...DEFAULT_PROPS} />);

    expect(screen.getAllByText("下書き").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("公開").length).toBeGreaterThanOrEqual(1);
  });

  describe("大分類・中分類の絞り込み", () => {
    const CATEGORIES = [
      {
        id: "category-1",
        name: "大分類1",
        subCategories: [{ id: "sub-1", name: "中分類1" }],
      },
      { id: "category-2", name: "大分類2", subCategories: [] },
    ];

    it("大分類で絞り込むと該当カテゴリのドキュメントのみ表示する", async () => {
      const documents = [
        buildDocument({ id: "1", title: "文書A", categoryId: "category-1" }),
        buildDocument({ id: "2", title: "文書B", categoryId: "category-2" }),
      ];
      const user = userEvent.setup();
      render(
        <DocumentManagementListClient
          documents={documents}
          {...DEFAULT_PROPS}
          categories={CATEGORIES}
        />
      );

      await user.selectOptions(screen.getByLabelText("大分類"), "id:category-1");

      expect(screen.getByText("文書A")).toBeTruthy();
      expect(screen.queryByText("文書B")).toBeNull();
    });

    it("「未設定」でカテゴリ未割当のドキュメントのみを抽出する", async () => {
      const documents = [
        buildDocument({ id: "1", title: "未分類文書", categoryId: null }),
        buildDocument({ id: "2", title: "分類済み文書", categoryId: "category-1" }),
      ];
      const user = userEvent.setup();
      render(
        <DocumentManagementListClient
          documents={documents}
          {...DEFAULT_PROPS}
          categories={CATEGORIES}
        />
      );

      await user.selectOptions(screen.getByLabelText("大分類"), "unassigned");

      expect(screen.getByText("未分類文書")).toBeTruthy();
      expect(screen.queryByText("分類済み文書")).toBeNull();
    });

    it("大分類を「すべて」に戻すと中分類の絞り込みもリセットされる", async () => {
      const documents = [
        buildDocument({
          id: "1",
          title: "文書A",
          categoryId: "category-1",
          subCategoryId: "sub-1",
        }),
        buildDocument({ id: "2", title: "文書B", categoryId: "category-2" }),
      ];
      const user = userEvent.setup();
      render(
        <DocumentManagementListClient
          documents={documents}
          {...DEFAULT_PROPS}
          categories={CATEGORIES}
        />
      );

      await user.selectOptions(screen.getByLabelText("大分類"), "id:category-1");
      await user.selectOptions(screen.getByLabelText("中分類"), "id:sub-1");
      expect(screen.getByText("文書A")).toBeTruthy();
      expect(screen.queryByText("文書B")).toBeNull();

      await user.selectOptions(screen.getByLabelText("大分類"), "all");

      expect(
        (screen.getByLabelText("中分類") as HTMLSelectElement).value
      ).toBe("all");
      expect(screen.getByText("文書A")).toBeTruthy();
      expect(screen.getByText("文書B")).toBeTruthy();
    });

    it("キーワード・登録方式・公開範囲種別・大分類・中分類のAND条件で絞り込む", async () => {
      const documents = [
        buildDocument({
          id: "1",
          title: "共通マニュアル",
          sourceType: "upload",
          targeting: { scope: "all" },
          categoryId: "category-1",
          subCategoryId: "sub-1",
        }),
        buildDocument({
          id: "2",
          title: "共通マニュアル",
          sourceType: "upload",
          targeting: { scope: "all" },
          categoryId: "category-2",
        }),
      ];
      const user = userEvent.setup();
      render(
        <DocumentManagementListClient
          documents={documents}
          {...DEFAULT_PROPS}
          categories={CATEGORIES}
        />
      );

      await user.type(screen.getByLabelText("キーワード検索"), "共通マニュアル");
      await user.selectOptions(screen.getByLabelText("大分類"), "id:category-1");
      await user.selectOptions(screen.getByLabelText("中分類"), "id:sub-1");

      expect(screen.getAllByText("共通マニュアル")).toHaveLength(1);
    });
  });
});
