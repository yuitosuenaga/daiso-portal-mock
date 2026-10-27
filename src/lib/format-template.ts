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
  // 単一パスで置換する。逐次置換だと、先に埋めた値に含まれる `{別キー}` が
  // 後続の置換で再度置き換わってしまうため。
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  );
}
