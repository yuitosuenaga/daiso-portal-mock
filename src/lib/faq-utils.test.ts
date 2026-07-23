import { describe, expect, it } from "vitest";

import {
  FAQ_NEW_BADGE_DAYS,
  filterFaqs,
  isRecentlyUpdated,
} from "@/lib/faq-utils";
import type { Faq } from "@/types/faq";

function buildFaq(overrides: Partial<Faq> = {}): Faq {
  return {
    id: "faq-1",
    category: "other",
    question: "質問",
    answer: "回答",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isRecentlyUpdated", () => {
  const now = new Date("2026-07-22T00:00:00.000Z");

  it(`${FAQ_NEW_BADGE_DAYS}日ちょうどのときtrueを返す`, () => {
    const updatedAt = new Date(now);
    updatedAt.setDate(updatedAt.getDate() - FAQ_NEW_BADGE_DAYS);

    expect(isRecentlyUpdated(updatedAt.toISOString(), now)).toBe(true);
  });

  it(`${FAQ_NEW_BADGE_DAYS}日を超えるときfalseを返す`, () => {
    const updatedAt = new Date(now);
    updatedAt.setDate(updatedAt.getDate() - (FAQ_NEW_BADGE_DAYS + 1));

    expect(isRecentlyUpdated(updatedAt.toISOString(), now)).toBe(false);
  });

  it("未来日のときfalseを返す", () => {
    const updatedAt = new Date(now);
    updatedAt.setDate(updatedAt.getDate() + 1);

    expect(isRecentlyUpdated(updatedAt.toISOString(), now)).toBe(false);
  });
});

describe("filterFaqs", () => {
  const faqs = [
    buildFaq({ id: "1", question: "問い合わせ方法について", answer: "ポータルから送信してください。" }),
    buildFaq({ id: "2", question: "Onboarding steps", answer: "Please refer to the guide." }),
  ];

  it("キーワードが空のとき、入力配列をそのまま返す", () => {
    expect(filterFaqs(faqs, "")).toEqual(faqs);
  });

  it("キーワードが空白のみのとき、入力配列をそのまま返す", () => {
    expect(filterFaqs(faqs, "   ")).toEqual(faqs);
  });

  it("質問文の部分一致（大文字小文字を区別しない）で絞り込む", () => {
    expect(filterFaqs(faqs, "onboarding")).toEqual([faqs[1]]);
  });

  it("回答文の部分一致で絞り込む", () => {
    expect(filterFaqs(faqs, "ポータル")).toEqual([faqs[0]]);
  });

  it("一致するFAQが1件もないとき空配列を返す", () => {
    expect(filterFaqs(faqs, "存在しないキーワード")).toEqual([]);
  });
});
