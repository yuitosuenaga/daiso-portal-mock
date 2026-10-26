import "server-only";

/**
 * Cloud Logging向けの構造化ロガー（JSON 1行、`severity` / `message` フィールド）。
 *
 * PII（メールアドレス・氏名・本文・トークン・パスワード・接続文字列）はログに出さない。
 * 呼び出し側は識別子（ID等）だけを`fields`に渡し、例外は`errorFields`で整形して渡す。
 */
export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

const MAX_ERROR_MESSAGE_LENGTH = 200;
const EMAIL_PATTERN = /[^\s@<>"']+@[^\s@<>"']+/g;

/**
 * 例外をログ用フィールドに変換する。スタックは含めない。
 * Prismaのエラーはメッセージにクエリ引数（入力値）を含みうるため、name/codeのみを出す。
 * それ以外はメッセージからメールアドレス様の文字列を除去し、長さを制限する。
 */
export function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const fields: Record<string, unknown> = { errorName: error.name };
    if (typeof code === "string") {
      fields.errorCode = code;
    }
    if (!error.name.startsWith("PrismaClient")) {
      fields.errorMessage = error.message
        .replace(EMAIL_PATTERN, "[redacted-email]")
        .slice(0, MAX_ERROR_MESSAGE_LENGTH);
    }
    return fields;
  }
  return { errorName: typeof error };
}

function write(severity: LogSeverity, message: string, fields?: Record<string, unknown>): void {
  // `severity` / `message` は予約。fieldsで上書きされないよう最後に置く。
  const line = JSON.stringify({ ...fields, severity, message });
  if (severity === "ERROR" || severity === "WARNING") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("DEBUG", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("INFO", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("WARNING", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("ERROR", message, fields),
};
