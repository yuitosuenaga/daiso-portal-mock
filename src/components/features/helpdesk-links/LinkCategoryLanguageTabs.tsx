"use client";

import { useEffect, useRef, useState } from "react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LinkCategoryFormValues } from "@/lib/validation/link-category";

export interface LinkCategoryLanguageTabsProps {
  register: UseFormRegister<LinkCategoryFormValues>;
  control: Control<LinkCategoryFormValues>;
  watch: UseFormWatch<LinkCategoryFormValues>;
  errors: FieldErrors<LinkCategoryFormValues>;
}

/**
 * カテゴリ名の言語タブUI（`ja`/`en`固定タブ＋「言語を追加」による動的追加言語タブ）。
 * `DocumentCategoryForm`の言語タブ部分を独立コンポーネントとして切り出したもの
 * （`documents-management`と異なり公開範囲(targeting)入力は持たないため、フォーム全体を
 * 1コンポーネントにまとめる必要がなく、名称入力部分のみを本コンポーネントへ分離できる）。
 */
export function LinkCategoryLanguageTabs({
  register,
  control,
  watch,
  errors,
}: LinkCategoryLanguageTabsProps) {
  const t = useTranslations("helpdeskLinks.categories.form");
  const tInquiryForm = useTranslations("inquiryForm");
  const [activeLanguageTab, setActiveLanguageTab] = useState("ja");

  const {
    fields: translationFields,
    append: appendTranslation,
    remove: removeTranslation,
  } = useFieldArray({ control, name: "translations" });
  const previousTranslationCountRef = useRef(translationFields.length);

  useEffect(() => {
    if (translationFields.length > previousTranslationCountRef.current) {
      const lastField = translationFields[translationFields.length - 1];
      if (lastField) {
        setActiveLanguageTab(lastField.id);
      }
    }
    previousTranslationCountRef.current = translationFields.length;
  }, [translationFields]);

  useEffect(() => {
    if (errors.name) {
      setActiveLanguageTab("ja");
      return;
    }
    if (errors.nameEn) {
      setActiveLanguageTab("en");
      return;
    }
    const translationErrors = errors.translations;
    const translationErrorIndex = Array.isArray(translationErrors)
      ? translationErrors.findIndex((entry) => entry)
      : -1;
    if (translationErrorIndex >= 0) {
      const field = translationFields[translationErrorIndex];
      if (field) {
        setActiveLanguageTab(field.id);
      }
    }
  }, [errors, translationFields]);

  const languageTabButtonClassName = (isActive: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm ${
      isActive
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeLanguageTab === "ja"}
          className={languageTabButtonClassName(activeLanguageTab === "ja")}
          onClick={() => setActiveLanguageTab("ja")}
        >
          {t("language.jaTab")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeLanguageTab === "en"}
          className={languageTabButtonClassName(activeLanguageTab === "en")}
          onClick={() => setActiveLanguageTab("en")}
        >
          {t("language.enTab")}
        </button>
        {translationFields.map((field, index) => {
          const locale = watch(`translations.${index}.locale`);
          return (
            <button
              key={field.id}
              type="button"
              role="tab"
              aria-selected={activeLanguageTab === field.id}
              className={languageTabButtonClassName(activeLanguageTab === field.id)}
              onClick={() => setActiveLanguageTab(field.id)}
            >
              {locale || t("language.localeCodeLabel")}
            </button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() => appendTranslation({ locale: "", name: "" })}
        >
          {t("language.addButton")}
        </Button>
      </div>

      {activeLanguageTab === "ja" && (
        <FormField
          label={t("nameLabel")}
          required
          requiredIndicator={tInquiryForm("requiredMark")}
          htmlFor="link-category-name"
          error={errors.name ? t("validation.required") : undefined}
        >
          <Input
            id="link-category-name"
            placeholder={t("namePlaceholder")}
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
        </FormField>
      )}

      {activeLanguageTab === "en" && (
        <FormField
          label={t("nameLabel")}
          required
          requiredIndicator={tInquiryForm("requiredMark")}
          htmlFor="link-category-name-en"
          error={errors.nameEn ? t("validation.required") : undefined}
        >
          <Input
            id="link-category-name-en"
            placeholder={t("namePlaceholder")}
            aria-invalid={errors.nameEn ? true : undefined}
            {...register("nameEn")}
          />
        </FormField>
      )}

      {translationFields.map((field, index) => {
        if (activeLanguageTab !== field.id) {
          return null;
        }
        const translationError = errors.translations?.[index];
        return (
          <div key={field.id} className="flex flex-col gap-4">
            <FormField
              label={t("language.localeCodeLabel")}
              required
              requiredIndicator={tInquiryForm("requiredMark")}
              htmlFor={`link-category-translation-${index}-locale`}
              error={
                translationError?.locale ? t("language.localeDuplicateError") : undefined
              }
            >
              <Input
                id={`link-category-translation-${index}-locale`}
                placeholder={t("language.localeCodePlaceholder")}
                aria-invalid={translationError?.locale ? true : undefined}
                {...register(`translations.${index}.locale`)}
              />
            </FormField>
            <FormField
              label={t("nameLabel")}
              required
              requiredIndicator={tInquiryForm("requiredMark")}
              htmlFor={`link-category-translation-${index}-name`}
              error={translationError?.name ? t("validation.required") : undefined}
            >
              <Input
                id={`link-category-translation-${index}-name`}
                placeholder={t("namePlaceholder")}
                aria-invalid={translationError?.name ? true : undefined}
                {...register(`translations.${index}.name`)}
              />
            </FormField>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => {
                removeTranslation(index);
                setActiveLanguageTab("ja");
              }}
            >
              {t("language.removeButton")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
