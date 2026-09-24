import type { Inquiry } from "@/types/inquiry";

export interface ResolvedInquiryContent {
  title: string;
  body: string;
  /** 表示中の内容が翻訳（原文以外）かどうか */
  isTranslated: boolean;
}

/**
 * 問い合わせのタイトル・本文を表示ロケールに合わせて解決する。
 * 解決順: (1) `originalLanguage`と`locale`が一致すれば原文 (2) `translations`に
 * `locale`一致の行があれば翻訳 (3) 旧`translatedText`（ja本文のみ、タイトルは原文のまま） (4) 原文。
 */
export function resolveInquiryContent(
  inquiry: Pick<
    Inquiry,
    "title" | "originalText" | "originalLanguage" | "translations" | "translatedText"
  >,
  locale: string
): ResolvedInquiryContent {
  if (inquiry.originalLanguage === locale) {
    return { title: inquiry.title, body: inquiry.originalText, isTranslated: false };
  }

  const translation = inquiry.translations?.find((t) => t.locale === locale);
  if (translation) {
    return { title: translation.title, body: translation.body, isTranslated: true };
  }

  if (locale === "ja" && inquiry.translatedText) {
    return { title: inquiry.title, body: inquiry.translatedText, isTranslated: true };
  }

  return { title: inquiry.title, body: inquiry.originalText, isTranslated: false };
}
