import "server-only";

import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * `auth()`はミドルウェア呼び出し等の複数のオーバーロードを持つため、
 * Route Handler・Server Action・テストコードから扱いやすい単一の戻り値型に固定する。
 */
export function getSession(): Promise<Session | null> {
  return auth();
}
