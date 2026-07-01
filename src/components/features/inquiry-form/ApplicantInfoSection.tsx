"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/**
 * 会社名（companyName）・国（country）の入力セクション。
 * `FormProvider` を親（InquiryForm、タスク4で実装予定）から供給される前提で
 * `useFormContext` を利用する。
 */
export function ApplicantInfoSection() {
  const t = useTranslations("inquiryForm");
  const {
    register,
    formState: { errors },
  } = useFormContext<InquiryFormValues>();

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: t(`options.country.${code}`),
  }));

  return (
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
  );
}
