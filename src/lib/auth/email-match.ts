/**
 * 大文字小文字を無視して絞り込んだ候補行から、照合対象のアカウントを1件に決める（副作用なし）。
 * - 0件: null
 * - 1件: その行（保存値が大文字入りの既存データでも照合できる）
 * - 複数: 入力（trimのみ。大文字小文字は保持）と完全一致する行。無ければ"ambiguous"（呼び出し側で拒否する）
 */
export function pickAccountByEmail<T extends { email: string }>(
  rows: readonly T[],
  rawInput: string
): T | null | "ambiguous" {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0];
  const exact = rows.find((row) => row.email === rawInput.trim());
  return exact ?? "ambiguous";
}
