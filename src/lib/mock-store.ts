/**
 * フェーズ1のモックAPIが使う可変配列を `globalThis` 上に保持するためのヘルパー。
 *
 * Next.jsのServer Actionsは、呼び出し元のRSCレンダリングとは別のwebpackチャンクとして
 * コンパイルされることがあり、モジュールスコープの `const` 配列では実行コンテキストごとに
 * 別インスタンスが生成されて状態が共有されない場合がある。プロセス全体で単一の
 * `globalThis` を参照させることで、どのチャンク経由で読み書きしても同一の配列を指す
 * ようにする。
 */
export function getGlobalMockStore<T>(key: string, createInitial: () => T): T {
  const globalKey = `__portalMockStore_${key}__`;
  const globalWithStore = globalThis as typeof globalThis &
    Record<string, T | undefined>;

  if (!globalWithStore[globalKey]) {
    globalWithStore[globalKey] = createInitial();
  }

  return globalWithStore[globalKey] as T;
}
