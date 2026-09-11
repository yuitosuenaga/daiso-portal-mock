/**
 * サマリパネルの各要素（ボタン化されたグラフの区間・行）をクリックしたときに、
 * 同じ条件を再クリックしたら絞り込みを解除できるようにするための共通処理。
 *
 * patchが複数キーを含む場合（例: 未着手かつ未解決）、キー単位で個別に一致判定すると
 * 一部のキーだけ現在値と一致したときに意図せず解除されてしまう。
 * そのため「patchの全キーが現在値と完全に一致する場合のみ」全キーを空値へ戻し、
 * そうでなければpatchをそのまま適用する。単一キーのpatchでは従来の挙動と一致する。
 */
export function toggleFilterPatch<T extends object>(
  current: T,
  patch: Partial<T>,
  emptyFilters: T
): Partial<T> {
  const keys = Object.keys(patch) as (keyof T)[];
  const allMatch = keys.every((key) => current[key] === patch[key]);

  if (!allMatch) {
    return patch;
  }

  const resolved: Partial<T> = {};
  for (const key of keys) {
    resolved[key] = emptyFilters[key];
  }
  return resolved;
}
