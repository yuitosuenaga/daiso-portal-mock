import { z } from "zod";

/**
 * メールアドレスの共通スキーマ。前後の空白を除去して小文字化する
 * （重複判定・ログイン照合・Google照合が大文字小文字を区別しないため、保存値を小文字に揃える）。
 */
export const emailSchema = z.string().trim().toLowerCase().min(1).email();
