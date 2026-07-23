import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqListClient } from "@/components/features/faq/FaqListClient";
import type { Faq } from "@/types/faq";

const DEFAULT_PROPS = {
  locale: "ja",
  categoryLabels: {
    inquiry_method: "問い合わせ方法",
    form_input: "フォーム入力",
    status: "対応状況",
    other: "その他",
  },
  updatedLabel: "更新日",
  newBadgeLabel: "新着",
  searchLabel: "キーワード検索",
  searchPlaceholder: "質問や回答に含まれる語句",
  searchNoResults: "該当するFAQがありません",
  searchClearButton: "条件をクリア",
};

function buildFaq(overrides: Partial<Faq> & { id: string }): Faq {
  return {
    category: "other",
    question: "質問",
    answer: "回答",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  } as Faq;
}

describe("FaqListClient", () => {
  it("キーワードで質問・回答を絞り込み、カテゴリ別グループ表示を保つ", async () => {
    const faqs = [
      buildFaq({
        id: "1",
        category: "inquiry_method",
        question: "問い合わせ方法について",
        answer: "ポータルから送信してください。",
      }),
      buildFaq({
        id: "2",
        category: "form_input",
        question: "Onboarding steps",
        answer: "Please refer to the guide.",
      }),
    ];
    const user = userEvent.setup();
    render(<FaqListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "Onboarding");

    expect(screen.getByText("Onboarding steps")).toBeTruthy();
    expect(screen.getByText("フォーム入力")).toBeTruthy();
    expect(screen.queryByText("問い合わせ方法について")).toBeNull();
    expect(screen.queryByText("問い合わせ方法")).toBeNull();
  });

  it("キーワードが空のとき全件を表示する", () => {
    const faqs = [
      buildFaq({ id: "1", category: "inquiry_method", question: "Q1" }),
      buildFaq({ id: "2", category: "form_input", question: "Q2" }),
    ];
    render(<FaqListClient faqs={faqs} {...DEFAULT_PROPS} />);

    expect(screen.getByText("Q1")).toBeTruthy();
    expect(screen.getByText("Q2")).toBeTruthy();
  });

  it("一致するFAQが1件もないとき0件メッセージを表示する", async () => {
    const faqs = [buildFaq({ id: "1", question: "利用規約について" })];
    const user = userEvent.setup();
    render(<FaqListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(
      screen.getByLabelText("キーワード検索"),
      "存在しないキーワード"
    );

    expect(screen.getByText("該当するFAQがありません")).toBeTruthy();
  });

  it("絞り込み結果が0件のカテゴリグループは表示しない", async () => {
    const faqs = [
      buildFaq({
        id: "1",
        category: "inquiry_method",
        question: "問い合わせ方法A",
      }),
      buildFaq({ id: "2", category: "form_input", question: "フォームB" }),
    ];
    const user = userEvent.setup();
    render(<FaqListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(screen.getByLabelText("キーワード検索"), "問い合わせ方法A");

    expect(screen.getByText("問い合わせ方法")).toBeTruthy();
    expect(screen.queryByText("フォーム入力")).toBeNull();
  });

  it("条件クリアで絞り込みがリセットされる", async () => {
    const faqs = [buildFaq({ id: "1", question: "利用規約について" })];
    const user = userEvent.setup();
    render(<FaqListClient faqs={faqs} {...DEFAULT_PROPS} />);

    await user.type(
      screen.getByLabelText("キーワード検索"),
      "存在しないキーワード"
    );
    expect(screen.getByText("該当するFAQがありません")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("利用規約について")).toBeTruthy();
  });
});
