import type { ReplyTemplate } from "@/types/reply-template";

/**
 * 返信テンプレートの名称・本文を、指定した言語で解決する。
 * フォールバック順序は他の翻訳対象（資料・リンク等）と同一: `locale`一致 → `en` → 既定言語`ja`。
 * `translations`が無い（旧データ・翻訳未保存）場合は`ja`（親の値）を返す。
 */
export function resolveReplyTemplateContent(
  template: Pick<ReplyTemplate, "name" | "body" | "translations">,
  locale: string
): { name: string; body: string } {
  if (locale !== "ja") {
    const translations = template.translations ?? [];
    const match =
      translations.find((item) => item.locale === locale) ??
      translations.find((item) => item.locale === "en");
    if (match) {
      return { name: match.name, body: match.body };
    }
  }

  return { name: template.name, body: template.body };
}

/**
 * 返信フォーム向けに、テンプレート一覧を「名称＝スタッフのUI言語」「本文＝問い合わせ送信者の言語」
 * へ解決する。海外の送信者へ返信する際、選択したテンプレートが送信者の言語で挿入される。
 */
export function localizeReplyTemplates(
  templates: ReplyTemplate[],
  options: { displayLocale: string; replyLocale: string }
): ReplyTemplate[] {
  return templates.map((template) => ({
    ...template,
    name: resolveReplyTemplateContent(template, options.displayLocale).name,
    body: resolveReplyTemplateContent(template, options.replyLocale).body,
  }));
}
