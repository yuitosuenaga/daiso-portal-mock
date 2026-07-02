import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqCategoryGroup } from "@/components/features/faq/FaqCategoryGroup";
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
    category: "inquiry_method",
    question: "返信までどれくらいかかりますか。",
    answer: "通常2営業日以内に返信します。",
  },
];

describe("FaqCategoryGroup", () => {
  it("カテゴリ見出し（categoryLabel）が表示される", () => {
    render(
      <FaqCategoryGroup
        category="inquiry_method"
        categoryLabel="問い合わせ方法"
        faqs={FAQS}
      />
    );

    expect(screen.getByText("問い合わせ方法")).toBeTruthy();
  });

  it("渡した質問がすべて表示される", () => {
    render(
      <FaqCategoryGroup
        category="inquiry_method"
        categoryLabel="問い合わせ方法"
        faqs={FAQS}
      />
    );

    expect(screen.getByText(FAQS[0].question)).toBeTruthy();
    expect(screen.getByText(FAQS[1].question)).toBeTruthy();
  });

  it("質問をクリックすると対応する回答が表示される", async () => {
    const user = userEvent.setup();
    render(
      <FaqCategoryGroup
        category="inquiry_method"
        categoryLabel="問い合わせ方法"
        faqs={FAQS}
      />
    );

    expect(screen.queryByText(FAQS[0].answer)).toBeNull();

    await user.click(screen.getByRole("button", { name: FAQS[0].question }));

    expect(screen.getByText(FAQS[0].answer)).toBeTruthy();
    expect(screen.queryByText(FAQS[1].answer)).toBeNull();
  });
});
