import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqAccordion } from "@/components/features/faq/FaqAccordion";
import type { Faq } from "@/types/faq";

const FAQS: Faq[] = [
  {
    id: "1",
    category: "inquiry_method",
    question: "問い合わせはどの方法で行えば良いですか。",
    answer: "ポータル上の問い合わせ申請ページから送信してください。",
  },
  {
    id: "2",
    category: "form_input",
    question: "原文言語は何のために入力しますか。",
    answer: "翻訳・確認作業に利用します。",
  },
];

/**
 * トリガー（質問ボタン）のdata-state属性で開閉状態を判定する。
 * Radixは閉じている間、対応するAccordionContent配下のテキストをDOMに
 * レンダリングしない実装のため、質問側の`data-state`/`aria-expanded`を基準にする。
 */
function getTriggerState(question: string): string | null {
  return screen
    .getByRole("button", { name: question })
    .getAttribute("data-state");
}

describe("FaqAccordion", () => {
  it("初期表示時、すべての回答が折りたたまれている（非表示）", () => {
    render(<FaqAccordion faqs={FAQS} />);

    expect(getTriggerState(FAQS[0].question)).toBe("closed");
    expect(getTriggerState(FAQS[1].question)).toBe("closed");
    // 折りたたみ状態では回答テキストは(表示クエリでは)見つからない
    expect(screen.queryByText(FAQS[0].answer)).toBeNull();
    expect(screen.queryByText(FAQS[1].answer)).toBeNull();
  });

  it("質問をクリックすると、その質問の回答が表示される", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion faqs={FAQS} />);

    await user.click(screen.getByRole("button", { name: FAQS[0].question }));

    expect(getTriggerState(FAQS[0].question)).toBe("open");
    expect(screen.getByText(FAQS[0].answer)).toBeTruthy();
  });

  it("1つの質問を展開した状態で別の質問をクリックすると、両方が展開された状態になる", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion faqs={FAQS} />);

    await user.click(screen.getByRole("button", { name: FAQS[0].question }));
    await user.click(screen.getByRole("button", { name: FAQS[1].question }));

    expect(getTriggerState(FAQS[0].question)).toBe("open");
    expect(getTriggerState(FAQS[1].question)).toBe("open");
    expect(screen.getByText(FAQS[0].answer)).toBeTruthy();
    expect(screen.getByText(FAQS[1].answer)).toBeTruthy();
  });

  it("キーボード操作（Tabでフォーカス、Enterキー）でも開閉が切り替わる", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion faqs={FAQS} />);

    await user.tab();
    const firstTrigger = screen.getByRole("button", {
      name: FAQS[0].question,
    });
    expect(document.activeElement).toBe(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");

    await user.keyboard("{Enter}");
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(getTriggerState(FAQS[0].question)).toBe("open");
    expect(screen.getByText(FAQS[0].answer)).toBeTruthy();

    await user.keyboard("{Enter}");
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(getTriggerState(FAQS[0].question)).toBe("closed");
  });
});
