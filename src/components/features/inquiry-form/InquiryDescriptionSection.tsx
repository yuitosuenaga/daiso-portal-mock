"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { INQUIRY_ORIGINAL_LANGUAGE_CODES } from "@/lib/constants/inquiry-options";
import {
  ORIGINAL_TEXT_MAX_LENGTH,
  type InquiryFormValues,
} from "@/lib/validation/inquiry";

/**
 * 自由記述（originalText）・原文言語（originalLanguage）の入力セクション。
 * `FormProvider` を親（InquiryForm、タスク4で実装予定）から供給される前提で
 * `useFormContext` を利用する。
 */
export function InquiryDescriptionSection() {
  const t = useTranslations("inquiryForm");
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<InquiryFormValues>();

  const originalLanguageOptions = INQUIRY_ORIGINAL_LANGUAGE_CODES.map(
    (code) => ({
      value: code,
      label: t(`options.originalLanguage.${code}`),
    })
  );

  const originalText = watch("originalText") ?? "";
  const remainingCharacters = ORIGINAL_TEXT_MAX_LENGTH - originalText.length;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        label={t("fields.title.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="title"
        className="md:col-span-2"
        error={
          errors.title
            ? errors.title.type === "too_big"
              ? t("validation.maxLength")
              : t("validation.required")
            : undefined
        }
      >
        <Input
          id="title"
          type="text"
          placeholder={t("fields.title.placeholder")}
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
      </FormField>

      <FormField
        label={t("fields.originalText.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="originalText"
        className="md:col-span-2"
        error={
          errors.originalText
            ? errors.originalText.type === "too_big"
              ? t("validation.maxLength")
              : t("validation.required")
            : undefined
        }
      >
        <Textarea
          id="originalText"
          placeholder={t("fields.originalText.placeholder")}
          aria-invalid={errors.originalText ? true : undefined}
          {...register("originalText")}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("fields.originalText.remainingCharacters", {
            count: remainingCharacters,
          })}
        </p>
      </FormField>

      <FormField
        label={t("fields.originalLanguage.label")}
        required
        requiredIndicator={t("requiredMark")}
        htmlFor="originalLanguage"
        error={
          errors.originalLanguage ? t("validation.required") : undefined
        }
      >
        <Select
          id="originalLanguage"
          options={originalLanguageOptions}
          placeholder={t("fields.originalLanguage.placeholder")}
          aria-invalid={errors.originalLanguage ? true : undefined}
          {...register("originalLanguage")}
        />
      </FormField>
    </div>
  );
}
