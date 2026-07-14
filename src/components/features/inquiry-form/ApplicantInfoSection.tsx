"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
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
 * 会社名（companyName）・国（country）の入力セクション。
 * `FormProvider` を親（InquiryForm、タスク4で実装予定）から供給される前提で
 * `useFormContext` を利用する。
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

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: t(`options.country.${code}`),
  }));

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: `${company.name} (${company.country})`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label={t("fields.companyName.label")}
          required
          requiredIndicator={t("requiredMark")}
          htmlFor="companyName"
          error={
            errors.companyName ? t("validation.required") : undefined
          }
        >
          <Input
            id="companyName"
            type="text"
            placeholder={t("fields.companyName.placeholder")}
            aria-invalid={errors.companyName ? true : undefined}
            {...register("companyName")}
          />
        </FormField>

        <FormField
          label={t("fields.country.label")}
          required
          requiredIndicator={t("requiredMark")}
          htmlFor="country"
          error={errors.country ? t("validation.required") : undefined}
        >
          <Select
            id="country"
            options={countryOptions}
            placeholder={t("fields.country.placeholder")}
            aria-invalid={errors.country ? true : undefined}
            {...register("country")}
          />
        </FormField>
      </div>

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
