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
 * 資格情報の再流出防止（最低限）。エラー詳細は全情報を出す方針だが、
 * Bearer/APIキー/password=/Authorization:/接続文字列のパスワードだけは伏字にする。
 * 限界: 上記以外の形式の秘密値（独自形式のトークン等）は検出できない。
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/(postgres(?:ql)?:\/\/[^:/\s@]*):[^@\s/]*@/gi, `$1:${REDACTED}@`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/\bsk-ant-[A-Za-z0-9_-]+/g, REDACTED)
    .replace(/\bAuthorization\s*[:=]\s*(?:(?:Basic|Digest|Token|Bearer)\s+)?[^\s\"',;]+/gi, `Authorization: ${REDACTED}`)
    .replace(/\b(password|passwd|pwd)(["']?\s*[:=]\s*)(["']?)[^\s"'&,;}]+/gi, `$1$2$3${REDACTED}`);
}

function clip(text: string): string {
  const redacted = redactSecrets(text);
  return redacted.length > MAX_STRING_LENGTH
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
    if (Array.isArray(obj)) {
      return obj.slice(0, MAX_ARRAY_ITEMS).map((v) => safeValue(v, depth + 1, seen));
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).slice(0, MAX_KEYS)) {
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
const HANDLED_KEYS = new Set(["name", "message", "stack", "cause", "code", "meta", "status", "statusCode"]);

function describeError(error: Error, depth: number, seen: Set<unknown>): Record<string, unknown> {
  seen.add(error);
  const fields: Record<string, unknown> = { errorName: error.name };
  const rec = error as unknown as Record<string, unknown>;
  const code = rec.code;
  if (typeof code === "string" || typeof code === "number") fields.errorCode = code;
  fields.errorMessage = clip(error.message);
  if (typeof error.stack === "string") fields.stack_trace = clip(error.stack);
  if (rec.meta !== undefined) fields.meta = safeValue(rec.meta, 0, new WeakSet());
  if (typeof rec.status === "number") fields.status = rec.status;
  if (typeof rec.statusCode === "number") fields.statusCode = rec.statusCode;
  // SDKエラーのrequest_id等、列挙可能な追加プロパティ
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(error).filter((k) => !HANDLED_KEYS.has(k)).slice(0, MAX_KEYS)) {
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
      fields.cause = seen.has(cause) ? "[circular]" : describeError(cause, depth + 1, seen);
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
export function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return describeError(error, 0, new Set());
  return { errorName: typeof error, errorValue: safeValue(error, 0, new WeakSet()) };
}

function emit(severity: LogSeverity, line: string): void {
  if (severity === "ERROR" || severity === "WARNING") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

function write(severity: LogSeverity, message: string, fields?: Record<string, unknown>): void {
  // ログ出力の失敗（循環参照・BigInt・toJSONの例外・書き込み失敗）を呼び出し元へ伝播させない。
  try {
    // `severity` / `message` は予約。fieldsで上書きされないよう最後に置く。
    emit(severity, JSON.stringify({ ...fields, severity, message }));
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
