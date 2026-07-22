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
};

const PAGINATION_MESSAGES: Record<string, string> = {
  previousLabel: "前へ",
  nextLabel: "次へ",
  pageStatus: "{current} / {total} ページ",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dict =
      namespace === "helpdeskDocuments.list.filter"
        ? FILTER_MESSAGES
        : namespace === "helpdeskDocuments.list.pagination"
          ? PAGINATION_MESSAGES
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
  deleteButtonLabel: "削除",
  deleteConfirmMessage: "このドキュメントを削除しますか？",
  deleteErrorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
  sourceTypeUploadBadgeLabel: "アップロード",
  sourceTypeGoogleBadgeLabel: "Googleリンク",
  targetingLabels: {
    allLabel: "全体公開",
    countriesLabel: "対象国・地域",
    companiesLabel: "対象販社",
    countryLabels: {},
    companyLabels: {},
  },
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
});
