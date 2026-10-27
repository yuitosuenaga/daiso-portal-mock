import "server-only";

/**
 * Cloud Logging向けの構造化ロガー（JSON 1行、`severity` / `message` フィールド）。
 *
 * 呼び出し側は識別子（ID等）を`fields`に渡し、例外は`errorFields`で整形して渡す。
 * 呼び出し側が意図して外した値（宛先・件名・ハッシュ化対象等）は`fields`に戻さない。
 * エラー詳細は全情報を出す（個人情報を含みうる）。資格情報のみ`errorFields`が伏字にする。
 */
export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

const MAX_STRING_LENGTH = 8192;
const MAX_CAUSE_DEPTH = 3;
const MAX_VALUE_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_KEYS = 30;
const REDACTED = "[redacted]";

/**
 * 資格情報の再流出防止（最低限）。エラー詳細は全情報を出す方針だが、次の形式だけは伏字にする。
 * - `scheme://user:pass@host`（スキーム非依存: postgres/mongodb/redis/amqp等）
 * - `Bearer xxx` / `sk-ant-...` / `Authorization: ...` / `Cookie:`・`Set-Cookie:` ヘッダ行
 * - `password|passwd|pwd|token|secret|api_key|apikey`を名前に含む`key=value` / `key: value`（`x-api-key: ...`・`client_secret=...`含む）
 * 限界: 上記以外の形式の秘密値（独自形式のトークン、キー名を伴わない値）は検出できない。
 * 逆に`Invalid token: expired`のように「token」の直後に`:`/`=`が続く普通の文は値部分が伏字になりうる。
 */
export function redactSecrets(text: string): string {
  // 可変長部分はすべて有界量指定にする（`a-a-a-...`のような入力で`\b`の開始点ごとに全長を走査するO(n^2)を避ける）。
  return text
    .replace(/\b([a-z][a-z0-9+.-]{0,31}:\/\/[^:/\s@]{0,256}):[^@\s/]{0,1024}@/gi, `$1:${REDACTED}@`)
    .replace(/\bBearer\s{1,16}[A-Za-z0-9._~+/=-]{1,2048}/gi, `Bearer ${REDACTED}`)
    .replace(/\bsk-ant-[A-Za-z0-9_-]{1,512}/g, REDACTED)
    .replace(/\bAuthorization\s{0,16}[:=]\s{0,16}(?:(?:Basic|Digest|Token|Bearer)\s{1,16})?[^\s\"',;]{1,2048}/gi, `Authorization: ${REDACTED}`)
    .replace(/\b((?:set-)?cookie)\s{0,16}:[^\r\n]{1,8192}/gi, `$1: ${REDACTED}`)
    .replace(
      /\b([A-Za-z0-9_-]{0,64}(?:password|passwd|pwd|token|secret|api[_-]?key)(?![A-Za-z0-9_-]))(["']?\s{0,16}[:=]\s{0,16})(["']?)[^\s"'&,;}]{1,1024}/gi,
      `$1$2$3${REDACTED}`
    );
}

// 正規化（小文字化・区切り除去）したキー名が、秘密情報を表す語で始まる/終わる場合は値を伏字にする。
const SENSITIVE_KEY = /^(secret|password|passwd|pwd|authorization|cookie)|(password|passwd|pwd|token|secret|apikey|authorization|cookie|credentials?|privatekey|sessionid)$/;
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

// 伏字の対象が切り詰め境界をまたぐ場合に断片を残さないための余白。
const CLIP_MARGIN = 256;

function clip(text: string): string {
  // 先に切ってから伏字にする（巨大入力に対する正規表現の走査量を上限で抑える）。
  const head = text.length > MAX_STRING_LENGTH + CLIP_MARGIN ? text.slice(0, MAX_STRING_LENGTH + CLIP_MARGIN) : text;
  const redacted = redactSecrets(head);
  return redacted.length > MAX_STRING_LENGTH || head.length < text.length
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...[truncated]`
    : redacted;
}

/** 任意の値を、循環・巨大化を防いでJSON化可能な形にする（文字列は伏字+上限）。 */
function safeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case "string":
      return clip(value);
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "function":
    case "symbol":
      return `[${typeof value}]`;
  }
  const obj = value as object;
  if (seen.has(obj)) return "[circular]";
  if (depth >= MAX_VALUE_DEPTH) return "[max-depth]";
  seen.add(obj);
  try {
    if (obj instanceof Error) return clip(`${obj.name}: ${obj.message}`);
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
    if (obj instanceof Set) {
      const items: unknown[] = [];
      obj.forEach((v) => {
        if (items.length < MAX_ARRAY_ITEMS) items.push(v);
      });
      return items.map((v) => safeValue(v, depth + 1, seen));
    }
    if (obj instanceof Map) {
      const items: unknown[] = [];
      obj.forEach((v, k) => {
        if (items.length < MAX_ARRAY_ITEMS) items.push([k, v]);
      });
      return items.map((v) => safeValue(v, depth + 1, seen));
    }
    if (Array.isArray(obj)) {
      return obj.slice(0, MAX_ARRAY_ITEMS).map((v) => safeValue(v, depth + 1, seen));
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).slice(0, MAX_KEYS)) {
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
        continue;
      }
      try {
        out[key] = safeValue((obj as Record<string, unknown>)[key], depth + 1, seen);
      } catch {
        out[key] = "[unreadable]";
      }
    }
    return out;
  } finally {
    seen.delete(obj);
  }
}

// 標準のError/プロトタイプ由来で個別に出すもの、または出さないもの
const HANDLED_KEYS = new Set(["issues", "name", "message", "stack", "cause", "code", "meta", "status", "statusCode"]);

export type ErrorFieldsOptions = {
  /** falseならstack_traceを出さない（400/401/403/404/409等の想定内エラー向け）。 */
  stack?: boolean;
};

function describeError(error: Error, depth: number, seen: Set<unknown>, opts: ErrorFieldsOptions): Record<string, unknown> {
  seen.add(error);
  const fields: Record<string, unknown> = { errorName: error.name };
  const rec = error as unknown as Record<string, unknown>;
  const code = rec.code;
  if (typeof code === "string" || typeof code === "number") fields.errorCode = code;
  const isZod = error.name === "ZodError";
  if (isZod) {
    // ZodErrorのmessageはissues全件のJSON。要約のみ出し、issuesは呼び出し側(api-errors)がpath/code/messageだけ出す。
    const issues = (error as { issues?: unknown }).issues;
    fields.errorMessage = `${Array.isArray(issues) ? issues.length : 0} validation issue(s)`;
  } else {
    fields.errorMessage = clip(error.message);
    if (opts.stack !== false && typeof error.stack === "string") fields.stack_trace = clip(error.stack);
  }
  if (rec.meta !== undefined) fields.meta = safeValue(rec.meta, 0, new WeakSet());
  if (typeof rec.status === "number") fields.status = rec.status;
  if (typeof rec.statusCode === "number") fields.statusCode = rec.statusCode;
  // SDKエラーのrequest_id等、列挙可能な追加プロパティ
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(error).filter((k) => !HANDLED_KEYS.has(k)).slice(0, MAX_KEYS)) {
    if (isSensitiveKey(key)) {
      extra[key] = REDACTED;
      continue;
    }
    try {
      extra[key] = safeValue(rec[key], 0, new WeakSet());
    } catch {
      extra[key] = "[unreadable]";
    }
  }
  if (Object.keys(extra).length > 0) fields.errorProps = extra;
  const cause = (error as { cause?: unknown }).cause;
  if (cause !== undefined) {
    if (depth >= MAX_CAUSE_DEPTH) {
      fields.cause = "[max-cause-depth]";
    } else if (cause instanceof Error) {
      fields.cause = seen.has(cause) ? "[circular]" : describeError(cause, depth + 1, seen, opts);
    } else {
      fields.cause = safeValue(cause, 0, new WeakSet());
    }
  }
  return fields;
}

/**
 * 例外をログ用フィールドに変換する（サーバーログ向け・エラーの全情報）。
 * name/code/message/stack(`stack_trace`: Error Reportingが解釈)/cause連鎖/Prisma meta/status/追加プロパティを出す。
 * 個人情報・DB値を含みうる。資格情報のみ`redactSecrets`で伏字にする。
 */
export function errorFields(error: unknown, opts: ErrorFieldsOptions = {}): Record<string, unknown> {
  // getter/Proxyが例外を投げても、呼び出し元（エラーハンドラ）を壊さない。
  try {
    if (error instanceof Error) return describeError(error, 0, new Set(), opts);
    return { errorName: typeof error, errorValue: safeValue(error, 0, new WeakSet()) };
  } catch {
    return { errorName: "unknown", logError: "errorFields failed" };
  }
}

function emit(severity: LogSeverity, line: string): void {
  if (severity === "ERROR" || severity === "WARNING") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

/** Cloud Loggingの1エントリ上限(256KB)未満に収めるための1行上限（バイト）。 */
export const MAX_LINE_BYTES = 200_000;
const FALLBACK_MESSAGE_CHARS = 2048;
const FALLBACK_ERROR_MESSAGE_CHARS = 4096;

function oversizeFallback(severity: LogSeverity, message: string, fields: Record<string, unknown> | undefined, originalBytes: number): string {
  const minimal: Record<string, unknown> = {
    severity,
    message: message.slice(0, FALLBACK_MESSAGE_CHARS),
    logError: "line too large",
    originalBytes,
  };
  const pick = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
  const name = pick(fields?.errorName, 200);
  if (name !== undefined) minimal.errorName = name;
  const code = fields?.errorCode;
  if (typeof code === "string" || typeof code === "number") minimal.errorCode = code;
  const msg = pick(fields?.errorMessage, FALLBACK_ERROR_MESSAGE_CHARS);
  if (msg !== undefined) minimal.errorMessage = msg;
  return JSON.stringify(minimal);
}

function write(severity: LogSeverity, message: string, fields?: Record<string, unknown>): void {
  // ログ出力の失敗（循環参照・BigInt・toJSONの例外・書き込み失敗）を呼び出し元へ伝播させない。
  try {
    // `severity` / `message` は予約。fieldsで上書きされないよう最後に置く。
    let line = JSON.stringify({ ...fields, severity, message });
    const bytes = Buffer.byteLength(line);
    if (bytes > MAX_LINE_BYTES) line = oversizeFallback(severity, message, fields, bytes);
    emit(severity, line);
  } catch {
    try {
      emit(severity, JSON.stringify({ severity, message, logError: "serialize failed" }));
    } catch {
      // 握りつぶす
    }
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("DEBUG", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("INFO", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("WARNING", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("ERROR", message, fields),
};
