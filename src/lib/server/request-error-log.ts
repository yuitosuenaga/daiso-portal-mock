import "server-only";

import {
  buildRequestContextFields,
  getErrorDigest,
  isNextControlFlowDigest,
  REQUEST_ERROR_MESSAGE,
  type RequestErrorContextLike,
  type RequestErrorRequest,
} from "@/lib/request-error-context";

import { errorFields, logger } from "./logger";

/**
 * 捕捉されなかったリクエストエラーを構造化ログ（severity=ERROR）に出す。Node専用。
 * フックから例外を投げない。
 */
export function reportRequestError(error: unknown, request: RequestErrorRequest, context: RequestErrorContextLike): void {
  try {
    if (isNextControlFlowDigest(getErrorDigest(error))) return;
    logger.error(REQUEST_ERROR_MESSAGE, {
      ...errorFields(error),
      ...buildRequestContextFields(error, request, context),
      runtime: "nodejs",
    });
  } catch {
    // ログ失敗で応答を壊さない
  }
}
