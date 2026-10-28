import type { Instrumentation } from "next";

/**
 * 捕捉されなかったリクエストエラーをCloud Loggingで検出できる構造化ログにする。
 * Node専用モジュール（server-only/logger）はnodejsランタイムでのみdynamic importする。
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      const { reportRequestError } = await import("@/lib/server/request-error-log");
      reportRequestError(error, request, context);
    } else if (process.env.NEXT_RUNTIME === "edge") {
      const { buildEdgeRequestErrorLine, getErrorDigest, isNextControlFlowDigest } = await import("@/lib/request-error-context");
      if (isNextControlFlowDigest(getErrorDigest(error))) return;
      console.error(buildEdgeRequestErrorLine(error, request, context));
    }
  } catch {
    // ログ失敗で応答を壊さない
  }
};
