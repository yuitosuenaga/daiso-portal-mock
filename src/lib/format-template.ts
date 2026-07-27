/**
 * `{key}`形式のプレースホルダーを含む翻訳済みテンプレート文字列に、実行時に
 * 判明する値（件数等）を埋め込む純粋関数。CSV一括登録の成功件数表示・
 * 一括無効化確認モーダルの対象件数表示のように、next-intlのサーバー側解決
 * （`getTranslations`）の時点では値が未確定なClient Component側で使う。
 */
export function formatTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
