"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Select } from "@/components/ui/select";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/** ヘルプデスク代理登録モードで対象会社を選択するための会社情報。 */
export interface ProxyCompanyOption {
  id: string;
  name: string;
  country: string;
}

interface ApplicantInfoSectionProps {
  /** 既定値は`"self"`。`"helpdeskProxy"`のときのみ対象会社選択欄を表示する。 */
  mode?: "self" | "helpdeskProxy";
  /** `mode === "helpdeskProxy"`のときのみ使用する選択可能な会社一覧。 */
  companies?: ProxyCompanyOption[];
}

/**
 * ヘルプデスク代理登録モードの対象会社選択セクション。`self`モードでは何も表示しない
 * （会社名・国はサーバーがログイン会社から導出するため入力させない）。
 * `FormProvider` を親（InquiryForm）から供給される前提で `useFormContext` を利用する。
 */
export function ApplicantInfoSection({
  mode = "self",
  companies = [],
}: ApplicantInfoSectionProps) {
  const t = useTranslations("inquiryForm");
  const {
    register,
    formState: { errors },
  } = useFormContext<InquiryFormValues>();

  if (mode !== "helpdeskProxy") {
    return null;
  }

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: `${company.name} (${company.country})`,
  }));

  return (
    <div className="flex flex-col gap-4">
      {mode === "helpdeskProxy" && (
        <FormField
          label={t("fields.targetCompany.label")}
          required
          requiredIndicator={t("requiredMark")}
          htmlFor="targetCompanyId"
          error={
            errors.targetCompanyId
              ? t("validation.targetCompanyRequired")
              : undefined
          }
        >
          {companyOptions.length > 0 ? (
            <Select
              id="targetCompanyId"
              options={companyOptions}
              placeholder={t("fields.targetCompany.placeholder")}
              aria-invalid={errors.targetCompanyId ? true : undefined}
              {...register("targetCompanyId")}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("fields.targetCompany.empty")}
            </p>
          )}
        </FormField>
      )}
    </div>
  );
}
