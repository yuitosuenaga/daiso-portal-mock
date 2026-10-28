/**
 * クライアントコンポーネント(`useTranslations`)が参照するトップレベル namespace。
 * `[locale]/layout.tsx` の NextIntlClientProvider にはここに列挙したものだけを渡し、
 * RSC ペイロードを縮める。サーバー側 `getTranslations` のみの namespace は含めない。
 * 追加漏れは `client-namespaces.test.ts` が静的検査する。
 *
 * このモジュールは import を持たない純粋モジュールに保つこと。
 */
export const CLIENT_NAMESPACES = [
  "announcements", // announcements/*
  "documents", // documents/*
  "faq", // faq/*, helpdesk-faq/*(faq.categories)
  "header", // layout/Header
  "helpdeskAnnouncements", // helpdesk-announcements/*
  "helpdeskDocumentCategories", // helpdesk-document-categories/*
  "helpdeskDocuments", // helpdesk-documents/*
  "helpdeskFaq", // helpdesk-faq/*
  "helpdeskHeader", // layout/HelpdeskHeader
  "helpdeskInquiries", // helpdesk-inquiries/*
  "helpdeskLinks", // helpdesk-links/*
  "helpdeskManuals", // helpdesk-manuals/*
  "helpdeskNav", // layout/MobileNav(動的 namespace)
  "inquiryAnalytics", // inquiry-list/*, helpdesk-inquiries/*
  "inquiryForm", // inquiry-form/*, DocumentCategoryForm
  "inquiryList", // inquiry-list/*
  "links", // links/*
  "login", // auth/LoginForm
  "manuals", // manuals/*, helpdesk-manuals/*
] as const;

export function pickClientMessages<T extends Record<string, unknown>>(
  messages: T,
): Partial<T> {
  const picked: Record<string, unknown> = {};
  for (const ns of CLIENT_NAMESPACES) {
    if (ns in messages) picked[ns] = messages[ns];
  }
  return picked as Partial<T>;
}
