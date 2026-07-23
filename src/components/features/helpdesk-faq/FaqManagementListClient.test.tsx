import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FaqManagementListClient } from "@/components/features/helpdesk-faq/FaqManagementListClient";
import type { Faq } from "@/types/faq";

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

vi.mock("@/lib/actions/faqs", () => ({
  deleteFaqAction: vi.fn(),
}));

const LIST_MESSAGES: Record<string, string> = {
  editLink: "編集",
  deleteButton: "削除",
  deleteConfirmTitle: "FAQの削除",
  deleteConfirm: "『{question}』を削除します。この操作は取り消せません。よろしいですか？",
  deleteConfirmButton: "削除する",
  deleteCancelButton: "キャンセル",
  deleteError: "削除に失敗しました。時間を置いて再度お試しください。",
};

const FILTER_MESSAGES: Record<string, string> = {
  keywordLabel: "キーワード検索",
  keywordPlaceholder: "質問や回答に含まれる語句",
  categoryLabel: "カテゴリ",
  categoryAll: "すべて",
  clearButton: "条件をクリア",
  noResults: "該当するFAQがありません",
};

const PAGINATION_MESSAGES: Record<string, string> = {
  previousLabel: "前へ",
  nextLabel: "次へ",
  pageStatus: "{current} / {total} ページ",
};

const CATEGORY_MESSAGES: Record<string, string> = {
  inquiry_method: "問い合わせ方法",
  form_input: "フォーム入力",
  status: "対応状況",
  other: "その他",
};

function interpolate(template: string, values?: Record<string, unknown>) {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(values[token] ?? `{${token}}`)
  );
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dict =
      namespace === "helpdeskFaq.list"
        ? LIST_MESSAGES
        : namespace === "helpdeskFaq.list.filter"
          ? FILTER_MESSAGES
          : namespace === "helpdeskFaq.list.pagination"
            ? PAGINATION_MESSAGES
            : namespace === "faq.categories"
              ? CATEGORY_MESSAGES
              : {};
    return (key: string, values?: Record<string, unknown>) =>
      interpolate(dict[key] ?? `${namespace}.${key}`, values);
  },
}));

function buildFaq(overrides: Partial<Faq> & { id: string }): Faq {
  return {
    category: "other",
    question: "質問",
    answer: "回答",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as Faq;
}

const DEFAULT_PROPS = { locale: "ja", listTitle: "FAQ管理" };

describe("FaqManagementListClient", () => {
  it("キーワードで質問・回答を絞り込む", async () => {
    const faqs = [
      buildFaq({ id: "1", question: "利用規約について" }),
      buildFaq({ id: "2", question: "Onboarding steps" }),
    ];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "Onboarding");

    expect(screen.getByText("Onboarding steps")).toBeTruthy();
    expect(screen.queryByText("利用規約について")).toBeNull();
  });

  it("カテゴリで絞り込む", async () => {
    const faqs = [
      buildFaq({ id: "1", question: "Q1", category: "inquiry_method" }),
      buildFaq({ id: "2", question: "Q2", category: "form_input" }),
    ];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "form_input");

    expect(screen.getByText("Q2")).toBeTruthy();
    expect(screen.queryByText("Q1")).toBeNull();
  });

  it("キーワード・カテゴリを組み合わせて絞り込む（AND条件）", async () => {
    const faqs = [
      buildFaq({
        id: "1",
        question: "共通マニュアル",
        category: "inquiry_method",
      }),
      buildFaq({
        id: "2",
        question: "共通マニュアル 別版",
        category: "form_input",
      }),
    ];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "共通マニュアル");
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "form_input");

    expect(screen.getByText("共通マニュアル 別版")).toBeTruthy();
    expect(screen.queryByText("共通マニュアル")).toBeNull();
  });

  it("絞り込み条件を変更するとページが先頭に戻る", async () => {
    const faqs = Array.from({ length: 12 }, (_, index) =>
      buildFaq({ id: `faq-${index}`, question: `AAA${index}` })
    );
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("AAA10")).toBeTruthy();

    await user.type(screen.getByLabelText("キーワード検索"), "AAA");

    expect(screen.getByText("AAA0")).toBeTruthy();
    expect(screen.queryByText("AAA11")).toBeNull();
  });

  it("絞り込み結果が0件のとき0件メッセージを表示する", async () => {
    const faqs = [buildFaq({ id: "1", question: "利用規約について" })];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(
      screen.getByLabelText("キーワード検索"),
      "存在しないキーワード"
    );

    expect(screen.getByText("該当するFAQがありません")).toBeTruthy();
  });

  it("条件クリアで絞り込み・ページ状態がリセットされる", async () => {
    const faqs = [
      buildFaq({ id: "1", question: "利用規約について" }),
      buildFaq({ id: "2", question: "Onboarding Guide" }),
    ];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(
      screen.getByLabelText("キーワード検索"),
      "存在しないキーワード"
    );
    expect(screen.getByText("該当するFAQがありません")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("利用規約について")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();
  });

  it("ページ切り替えで該当ページのみを表示し、登録日降順の入力順序を維持する", async () => {
    const faqs = Array.from({ length: 12 }, (_, index) =>
      buildFaq({ id: `faq-${index}`, question: `質問${index}` })
    );
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    expect(screen.getByText("質問0")).toBeTruthy();
    expect(screen.queryByText("質問11")).toBeNull();
    expect(screen.getByText("1 / 2 ページ")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.queryByText("質問0")).toBeNull();
    expect(screen.getByText("質問11")).toBeTruthy();
    expect(screen.getByText("2 / 2 ページ")).toBeTruthy();
  });

  it("削除確認モーダルの本文に対象の質問文が表示される", async () => {
    const faqs = [buildFaq({ id: "1", question: "対象のFAQ質問" })];
    const user = userEvent.setup();
    render(<FaqManagementListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(
      screen.getByText("『対象のFAQ質問』を削除します。この操作は取り消せません。よろしいですか？")
    ).toBeTruthy();
  });
});
