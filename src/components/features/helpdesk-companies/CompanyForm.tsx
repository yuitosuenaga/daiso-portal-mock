"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { companyFormSchema, type CompanyFormValues } from "@/lib/validation/company";
import {
  checkCompanyCodeAvailabilityAction,
  createCompanyAction,
  updateCompanyAction,
} from "@/lib/actions/companies";

export interface CompanyFormProps {
  mode: "create" | "edit";
  companyId?: string;
  defaultValues?: CompanyFormValues;
  countryOptions: SelectOption[];
  nameLabel: string;
  namePlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  companyCodeLabel: string;
  companyCodePlaceholder: string;
  /** 販社コード入力欄付近に表示する、命名規則・一意性の案内ヘルプテキスト */
  companyCodeHelpText: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  /** 販社コードのフォーマット（命名規則）違反時に表示するエラーメッセージ */
  companyCodeFormatErrorMessage: string;
  companyCodeDuplicateMessage: string;
  submitErrorMessage: string;
}

const COMPANY_CODE_HELP_ID = "company-code-help";

/**
 * 販社（Company）の新規作成・編集で共用するフォーム。`FaqForm`と同じ構造パターンを踏襲する。
 * 販社コードの重複エラーはServer Action側から送出されるメッセージを識別して
 * `companyCode`フィールドにエラー表示する（要件2.3・3.3）。
 * 販社コードはフォーマット（命名規則）検証を`companyFormSchema`側で行い、必須・
 * フォーマット・重複の3種のエラー/警告を出し分ける。またblur時に軽量な
 * Server Action（`checkCompanyCodeAvailabilityAction`）で重複を事前照会し、
 * 送信前に警告を表示する（要件18）。
 */
export function CompanyForm({
  mode,
  companyId,
  defaultValues,
  countryOptions,
  nameLabel,
  namePlaceholder,
  countryLabel,
  countryPlaceholder,
  companyCodeLabel,
  companyCodePlaceholder,
  companyCodeHelpText,
  submitButtonLabel,
  requiredErrorMessage,
  companyCodeFormatErrorMessage,
  companyCodeDuplicateMessage,
  submitErrorMessage,
}: CompanyFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      country: "" as unknown as CompanyFormValues["country"],
      companyCode: "",
    },
  });

  const companyCodeField = register("companyCode");
  // blur時の重複照会は非同期のため、後から短時間で連続してblurした場合に
  // 先に発行したリクエストの応答が後から届いて最新の入力値の判定結果を
  // 上書きしてしまう競合状態が起こり得る。世代カウンタを持たせ、応答が
  // 届いた時点で最新のリクエストでなければ結果を破棄する。
  const companyCodeCheckRequestId = useRef(0);

  async function handleCompanyCodeBlur(
    event: React.FocusEvent<HTMLInputElement>
  ) {
    await companyCodeField.onBlur(event);

    const value = event.target.value.trim();
    if (!value || !companyFormSchema.shape.companyCode.safeParse(value).success) {
      // 未入力・フォーマット違反は同期バリデーション（zodResolver）に委ねる
      return;
    }

    const requestId = ++companyCodeCheckRequestId.current;

    try {
      const isTaken = await checkCompanyCodeAvailabilityAction(
        value,
        mode === "edit" ? companyId : undefined
      );

      if (requestId !== companyCodeCheckRequestId.current) {
        // 応答が届くまでの間に、より新しいblurによる照会が発行済みのため破棄する
        return;
      }

      if (isTaken) {
        setError("companyCode", {
          type: "duplicate",
          message: companyCodeDuplicateMessage,
        });
      } else {
        clearErrors("companyCode");
      }
    } catch {
      // 重複照会自体の失敗は送信前の事前案内に過ぎないため、無視して送信時チェックに委ねる
    }
  }

  async function onSubmit(values: CompanyFormValues) {
    setHasSubmitError(false);
    try {
      const saved =
        mode === "edit" && companyId
          ? await updateCompanyAction(companyId, values)
          : await createCompanyAction(values);
      router.push(`/helpdesk/companies/${saved.id}`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Company code already taken")
      ) {
        setError("companyCode", {
          type: "duplicate",
          message: companyCodeDuplicateMessage,
        });
        return;
      }
      setHasSubmitError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={nameLabel}
        htmlFor="company-name"
        error={errors.name ? requiredErrorMessage : undefined}
      >
        <Input
          id="company-name"
          placeholder={namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        label={countryLabel}
        htmlFor="company-country"
        error={errors.country ? requiredErrorMessage : undefined}
      >
        <Select
          id="company-country"
          options={countryOptions}
          placeholder={countryPlaceholder}
          aria-invalid={errors.country ? true : undefined}
          {...register("country")}
        />
      </FormField>

      <FormField
        label={companyCodeLabel}
        htmlFor="company-code"
        errorId="company-code-error"
        error={
          errors.companyCode
            ? errors.companyCode.type === "duplicate"
              ? companyCodeDuplicateMessage
              : errors.companyCode.type === "invalid_format"
                ? companyCodeFormatErrorMessage
                : requiredErrorMessage
            : undefined
        }
      >
        <p id={COMPANY_CODE_HELP_ID} className="text-sm text-muted-foreground">
          {companyCodeHelpText}
        </p>
        <Input
          id="company-code"
          placeholder={companyCodePlaceholder}
          aria-invalid={errors.companyCode ? true : undefined}
          aria-describedby={
            errors.companyCode
              ? `${COMPANY_CODE_HELP_ID} company-code-error`
              : COMPANY_CODE_HELP_ID
          }
          {...companyCodeField}
          onBlur={handleCompanyCodeBlur}
        />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {submitButtonLabel}
        </Button>
        {hasSubmitError && (
          <span role="status" className="text-sm text-destructive">
            {submitErrorMessage}
          </span>
        )}
      </div>
    </form>
  );
}
