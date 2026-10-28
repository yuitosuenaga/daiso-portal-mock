/**
 * onRequestError用の純粋関数群（Edge/Node共用。server-onlyもloggerもimportしない）。
 * リクエストのヘッダ・クエリ・本文は扱わない（pathとmethodのみ明示取得する）。
 */
const MAX_PATH = 2048;
const MAX_FIELD = 256;

export type RequestErrorRequest = { path?: unknown; method?: unknown; headers?: unknown };
export type RequestErrorContextLike = {
  routerKind?: unknown;
  routePath?: unknown;
  routeType?: unknown;
  renderSource?: unknown;
  revalidateReason?: unknown;
};

export const REQUEST_ERROR_MESSAGE = "[request-error] Unhandled request error";

export function sanitizeRequestPath(path: unknown): string | undefined {
  if (typeof path !== "string") return undefined;
  if (/^https?:\/\//i.test(path)) {
    try {
      return new URL(path).pathname.slice(0, MAX_PATH);
    } catch {
      return undefined;
    }
  }
  return path.split(/[?#]/)[0].slice(0, MAX_PATH);
}

const CONTROL_FLOW_PREFIXES = [
  "NEXT_REDIRECT",
  "NEXT_HTTP_ERROR_FALLBACK;",
  "NEXT_NOT_FOUND",
  "DYNAMIC_SERVER_USAGE",
  "BAILOUT_TO_CLIENT_SIDE_RENDERING",
];

/** redirect/notFound等のNext制御フロー（エラーではない）のdigestか。防御的フィルタ。 */
export function isNextControlFlowDigest(digest: unknown): boolean {
  return typeof digest === "string" && CONTROL_FLOW_PREFIXES.some((p) => digest.startsWith(p));
}

export function getErrorDigest(error: unknown): string | undefined {
  try {
    const d = (error as { digest?: unknown } | null | undefined)?.digest;
    return typeof d === "string" ? d : undefined;
  } catch {
    return undefined;
  }
}

function str(value: unknown, max = MAX_FIELD): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export function buildRequestContextFields(
  error: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContextLike,
): Record<string, string> {
  const candidates: Record<string, string | undefined> = {
    digest: str(getErrorDigest(error)),
    requestPath: sanitizeRequestPath(request?.path),
    requestMethod: str(request?.method, 16),
    routerKind: str(context?.routerKind),
    routePath: str(context?.routePath, MAX_PATH),
    routeType: str(context?.routeType),
    renderSource: str(context?.renderSource),
    revalidateReason: str(context?.revalidateReason),
    renderType: str((context as { renderType?: unknown } | undefined)?.renderType),
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(candidates)) if (v !== undefined) out[k] = v;  return out;
}

/** Edge用の構造化ログ1行。Edgeでは秘密値を伏字にできないため、errorMessage/stackは出さない。 */
export function buildEdgeRequestErrorLine(
  error: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContextLike,
): string {
  let errorName: string = typeof error;
  try {
    if (error instanceof Error) errorName = String(error.name).slice(0, 200);
  } catch {
    // typeofのまま
  }
  return JSON.stringify({
    ...buildRequestContextFields(error, request, context),
    errorName,
    runtime: "edge",
    severity: "ERROR",
    message: REQUEST_ERROR_MESSAGE,
  });
}
