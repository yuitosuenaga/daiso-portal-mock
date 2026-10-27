import * as React from "react";

/**
 * React の `cache()` で、同一リクエスト（RSC のレンダリング）内の同一引数の重複呼び出しを
 * 1回にまとめる。キャッシュはリクエスト単位で、リクエストをまたいで共有されない。
 *
 * Next.js（App Router）のサーバー側 React は `cache` を提供するが、安定版 React 18 を
 * 直接読み込む環境（Vitest など）には存在しないため、無い場合は素通し（キャッシュなし）にする。
 */
type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T;

export const requestCache: CacheFn =
  (React as unknown as { cache?: CacheFn }).cache ?? ((fn) => fn);
