"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/**
 * 分類（category）・緊急度（urgency）・地域（storeRegion）の入力セクション。
 * `FormProvider` を親（InquiryForm、タスク4で実装予定）から供給される前提で
 * `useFormContext` を利用する。
 */
export function InquiryDetailsSection() {
  const t = useTranslations("inquiryForm");
  const {
    register,
    formState: { errors },
  } = useFormContext<InquiryFormValues>();

  const categoryOptions = INQUIRY_CATEGORY_CODES.map((code) => ({
    value: code,
    label: t(`options.category.${code}`),
  }));

  const urgencyOptions = INQUIRY_URGENCY_CODES.map((code) => ({
    value: code,
    label: t(`options.urgency.${code}`),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        label={t("fields.category.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="category"
        error={
          errors.category ? t("validation.required") : undefined
        }
      >
        <Select
          id="category"
          options={categoryOptions}
          placeholder={t("fields.category.placeholder")}
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
        />
      </FormField>

      <FormField
        label={t("fields.urgency.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="urgency"
        error={
          errors.urgency ? t("validation.required") : undefined
        }
      >
        <Select
          id="urgency"
          options={urgencyOptions}
          placeholder={t("fields.urgency.placeholder")}
          aria-invalid={errors.urgency ? true : undefined}
          {...register("urgency")}
        />
      </FormField>

      <FormField
        label={t("fields.storeRegion.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="storeRegion"
        error={
          errors.storeRegion ? t("validation.required") : undefined
        }
      >
        <Input
          id="storeRegion"
          type="text"
          placeholder={t("fields.storeRegion.placeholder")}
          aria-invalid={errors.storeRegion ? true : undefined}
          {...register("storeRegion")}
        />
      </FormField>
    </div>
  );
}
