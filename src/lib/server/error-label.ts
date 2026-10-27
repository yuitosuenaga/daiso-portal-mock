/**
 * ログ出力用の安全なエラー識別子。エラーメッセージ（宛先メール等のPIIや接続先情報を含みうる）は
 * 含めず、エラー名とPrismaのエラーコード（`P1001`等、固定形式のもの）のみを返す。
 */
export function safeErrorLabel(error: unknown): string {
  if (!(error instanceof Error)) {
    return "UnknownError";
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? `${error.name} ${code}` : error.name;
}
