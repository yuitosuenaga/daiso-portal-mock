/**
 * ファイル本体（PDF）の配信URL。一覧・フォームのpropsにdataUrlを載せず、iframe/aから
 * 認可付きRoute Handlerを参照するために使う（client/serverどちらからも使える）。
 */
export function documentFileUrl(id: string, options: { download?: boolean } = {}): string {
  const base = `/api/documents/${encodeURIComponent(id)}/file`;
  return options.download ? `${base}?download=1` : base;
}
