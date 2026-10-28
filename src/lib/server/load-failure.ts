import "server-only";

import { unstable_rethrow } from "next/navigation";

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { errorFields, logger } from "@/lib/server/logger";

/**
 * サーバーコンポーネントの読み込み失敗を記録する。エラーカード表示は呼び出し側が従来どおり行う。
 * PII（本文・メールアドレス等）は呼び出し側から渡さない（例外の詳細は errorFields が整形し、資格情報のみ伏字にする）。
 */
export function logLoadFailure(component: string, error: unknown, opts?: { optional?: boolean }): void {
  // redirect/notFound/DynamicServerError等のNext制御例外は握りつぶさず必ず再throwする（先頭で呼ぶ）。
  unstable_rethrow(error);
  // ForbiddenSessionErrorはUnauthorizedSessionErrorのサブクラスなので含まれる。
  if (error instanceof UnauthorizedSessionError) {
    logger.warn(`[${component}] load failed (unauthorized)`, { component, ...errorFields(error, { stack: false }) });
    return;
  }
  const fields = { component, ...errorFields(error) };
  if (opts?.optional) logger.warn(`[${component}] optional load failed`, fields);
  else logger.error(`[${component}] load failed`, fields);
}
