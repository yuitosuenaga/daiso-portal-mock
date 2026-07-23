import { z } from "zod";

/**
 * 販社コード（companyCode）の命名規則を表す正規表現。
 * 半角英小文字・数字・ハイフンのみを許可し、先頭・末尾のハイフン、
 * 連続するハイフンを禁止する（例: `vn-daiso-vietnam`）。
 */
const COMPANY_CODE_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * 販社（Company）新規作成・編集フォームの入力値を検証する zod スキーマ。
 * 会社名・国・販社コードをすべて必須とし、空文字列・空白のみの入力を拒否する。
 * 販社コードは、必須チェックに加えて命名規則（半角英小文字・数字・ハイフンのみ、
 * 先頭・末尾および連続するハイフンを禁止）のフォーマット検証を行う。
 * `min(1)`（必須）と`regex`（フォーマット）をこの順にチェーンすることで、
 * 未入力時は`too_small`、フォーマット違反時は`invalid_format`（zod v4の regex 違反コード。
 * v3の`invalid_string`とは名称が異なる点に注意）という異なる issue code が発行され、
 * 呼び出し側（`CompanyForm`の`errors.companyCode.type`）で区別できるようにする。
 */
export const companyFormSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().trim().min(1),
  companyCode: z
    .string()
    .trim()
    .min(1)
    .regex(COMPANY_CODE_FORMAT),
});

/**
 * `companyFormSchema` から推論されるフォーム入力値の型。
 */
export type CompanyFormValues = z.infer<typeof companyFormSchema>;
