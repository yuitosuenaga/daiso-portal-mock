"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  createDocumentCategoryAction,
  updateDocumentCategoryAction,
} from "@/lib/actions/document-categories";
import {
  documentCategoryFormSchema,
  type DocumentCategoryFormValues,
  type DocumentCategorySubmitValues,
} from "@/lib/validation/document-category";
import type {
  CreateDocumentCategoryInput,
  DocumentCategory,
} from "@/types/document-category";

export interface DocumentCategoryFormProps {
  mode: "createParent" | "createChild" | "edit";
  /** "createChild"のとき、追加先の大分類ID（親選択UIは持たず固定表示する） */
  parentId?: string;
  /** "edit"のとき、編集対象の既存カテゴリ */
  category?: DocumentCategory;
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  onSaved: () => void;
  onCancel: () => void;
}

function toDefaultValues(
  mode: DocumentCategoryFormProps["mode"],
  parentId: string | undefined,
  category: DocumentCategory | undefined
): DocumentCategoryFormValues {
  if (category) {
    const enTranslation = category.translations.find(
      (translation) => translation.locale === "en"
    );
    const additionalTranslations = category.translations.filter(
      (translation) => translation.locale !== "en"
    );
    return {
      parentId: category.parentId,
      name: category.name,
      nameEn: enTranslation?.name ?? "",
      translations: additionalTranslations,
      // 保存済みデータは常に`documentCategoryFormSchema`で検証済みのため、
      // フォームの厳密な型へ安全に絞り込める（`DocumentDetailPanel`と同じ扱い）。
      targeting: category.targeting as DocumentCategoryFormValues["targeting"],
    };
  }

  return {
    parentId: mode === "createChild" ? (parentId ?? null) : null,
    name: "",
    nameEn: "",
    translations: [],
    targeting: { scope: "all" },
  };
}

/**
 * カテゴリの追加（大分類／中分類）・編集フォーム。名称は`DocumentForm`と同型の
 * 言語タブUI、公開範囲は`DocumentForm`と同型のtargeting入力で構成する。
 * 保存は`document-categories`のServer Actionsを呼び、成功時は`onSaved`を呼び出す。
 */
export function DocumentCategoryForm({
  mode,
  parentId,
  category,
  countryOptions,
  companyOptions,
  onSaved,
  onCancel,
}: DocumentCategoryFormProps) {
  const t = useTranslations("helpdeskDocumentCategories.form");
  const tInquiryForm = useTranslations("inquiryForm");
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [nameConflictError, setNameConflictError] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState("ja");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DocumentCategoryFormValues, unknown, DocumentCategorySubmitValues>({
    resolver: zodResolver(documentCategoryFormSchema) as unknown as Resolver<
      DocumentCategoryFormValues,
      unknown,
      DocumentCategorySubmitValues
    >,
    defaultValues: toDefaultValues(mode, parentId, category),
  });
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

  const scopeOptions: SelectOption[] = [
    { value: "all", label: t("targetingAllOption") },
    { value: "countries", label: t("targetingCountriesOption") },
    { value: "companies", label: t("targetingCompaniesOption") },
  ];
  const scope = watch("targeting.scope");

  const formTitle =
    mode === "edit"
      ? t("editTitle")
      : mode === "createChild"
        ? t("createChildTitle")
        : t("createParentTitle");

  async function onSubmit(values: DocumentCategorySubmitValues) {
    setHasSubmitError(false);
    setNameConflictError(false);
    try {
      if (mode === "edit" && category) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId, ...updateInput } = values;
        await updateDocumentCategoryAction(category.id, updateInput);
      } else {
        await createDocumentCategoryAction(
          values as unknown as CreateDocumentCategoryInput
        );
      }
      onSaved();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("already exists in this hierarchy")
      ) {
        setNameConflictError(true);
        return;
      }
      setHasSubmitError(true);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{formTitle}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                  className={languageTabButtonClassName(
                    activeLanguageTab === field.id
                  )}
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
              htmlFor="document-category-name"
              error={errors.name ? t("validation.required") : undefined}
            >
              <Input
                id="document-category-name"
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
              htmlFor="document-category-name-en"
              error={errors.nameEn ? t("validation.required") : undefined}
            >
              <Input
                id="document-category-name-en"
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
                  htmlFor={`document-category-translation-${index}-locale`}
                  error={
                    translationError?.locale
                      ? t("language.localeDuplicateError")
                      : undefined
                  }
                >
                  <Input
                    id={`document-category-translation-${index}-locale`}
                    placeholder={t("language.localeCodePlaceholder")}
                    aria-invalid={translationError?.locale ? true : undefined}
                    {...register(`translations.${index}.locale`)}
                  />
                </FormField>
                <FormField
                  label={t("nameLabel")}
                  required
                  requiredIndicator={tInquiryForm("requiredMark")}
                  htmlFor={`document-category-translation-${index}-name`}
                  error={translationError?.name ? t("validation.required") : undefined}
                >
                  <Input
                    id={`document-category-translation-${index}-name`}
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

        <FormField label={t("targetingLabel")} htmlFor="document-category-targeting-scope">
          <Controller
            control={control}
            name="targeting.scope"
            render={({ field }) => (
              <Select
                id="document-category-targeting-scope"
                options={scopeOptions}
                value={field.value}
                onChange={(event) =>
                  field.onChange(
                    event.target
                      .value as DocumentCategoryFormValues["targeting"]["scope"]
                  )
                }
              />
            )}
          />
        </FormField>

        {scope === "countries" && (
          <FormField
            label={t("countriesLabel")}
            required
            requiredIndicator={tInquiryForm("requiredMark")}
            htmlFor="document-category-targeting-countries"
            error={
              errors.targeting && "countries" in errors.targeting
                ? t("validation.countriesRequired")
                : undefined
            }
          >
            <Controller
              control={control}
              name="targeting.countries"
              render={({ field }) => (
                <Select
                  id="document-category-targeting-countries"
                  multiple
                  options={countryOptions}
                  value={field.value ?? []}
                  aria-invalid={
                    errors.targeting && "countries" in errors.targeting
                      ? true
                      : undefined
                  }
                  onChange={(event) =>
                    field.onChange(
                      Array.from(event.target.selectedOptions, (option) => option.value)
                    )
                  }
                />
              )}
            />
          </FormField>
        )}

        {scope === "companies" && (
          <FormField
            label={t("companiesLabel")}
            required
            requiredIndicator={tInquiryForm("requiredMark")}
            htmlFor="document-category-targeting-companies"
            error={
              errors.targeting && "companyCodes" in errors.targeting
                ? t("validation.companiesRequired")
                : undefined
            }
          >
            <Controller
              control={control}
              name="targeting.companyCodes"
              render={({ field }) => (
                <Select
                  id="document-category-targeting-companies"
                  multiple
                  options={companyOptions}
                  value={field.value ?? []}
                  aria-invalid={
                    errors.targeting && "companyCodes" in errors.targeting
                      ? true
                      : undefined
                  }
                  onChange={(event) =>
                    field.onChange(
                      Array.from(event.target.selectedOptions, (option) => option.value)
                    )
                  }
                />
              )}
            />
          </FormField>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {t("submitButton")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancelButton")}
          </Button>
          {(hasSubmitError || nameConflictError) && (
            <span role="status" className="text-sm text-destructive">
              {nameConflictError ? t("validation.nameConflict") : t("submitError")}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
