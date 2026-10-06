"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
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
import { RetranslateDocumentCategoryButton } from "@/components/features/helpdesk-document-categories/RetranslateDocumentCategoryButton";
import type {
  DocumentCategory,
  DocumentCategoryFormInput,
} from "@/types/document-category";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";

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
    return {
      parentId: category.parentId,
      name: category.name,
      // 保存済みデータは常に`documentCategoryFormSchema`で検証済みのため、
      // フォームの厳密な型へ安全に絞り込める（`DocumentDetailPanel`と同じ扱い）。
      targeting: category.targeting as DocumentCategoryFormValues["targeting"],
    };
  }

  return {
    parentId: mode === "createChild" ? (parentId ?? null) : null,
    name: "",
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
  // 保存後に一部言語の翻訳が失敗した場合の状態。保存済みIDを保持し、再送信で二重作成しない。
  const [savedCategoryId, setSavedCategoryId] = useState<string | undefined>(category?.id);
  const [translationFailed, setTranslationFailed] = useState(false);

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
    setTranslationFailed(false);
    try {
      let result;
      if (savedCategoryId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId, ...updateInput } = values;
        result = await updateDocumentCategoryAction(savedCategoryId, updateInput);
      } else {
        result = await createDocumentCategoryAction(values as DocumentCategoryFormInput);
      }
      if (result.failedLocales.length > 0) {
        // 保存は完了しているため、ダイアログを閉じず再翻訳を案内する。
        setSavedCategoryId(result.category.id);
        setTranslationFailed(true);
        return;
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
            maxLength={TEXT_LIMITS.categoryName}
            {...register("name")}
          />
        </FormField>

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

        {translationFailed && savedCategoryId && (
          <div className="flex flex-col gap-2 rounded-md border border-input p-3">
            <p role="status" className="text-sm text-destructive">
              {t("translationPartialFailed")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <RetranslateDocumentCategoryButton
                categoryId={savedCategoryId}
                label={t("retranslateButton")}
                successMessage={t("retranslateSuccess")}
                failureMessage={t("translationPartialFailed")}
                onCompleted={onSaved}
              />
              <Button type="button" variant="outline" onClick={onSaved}>
                {t("closeButton")}
              </Button>
            </div>
          </div>
        )}

        {mode === "edit" && category && !translationFailed && (
          <RetranslateDocumentCategoryButton
            categoryId={category.id}
            label={t("retranslateButton")}
            successMessage={t("retranslateSuccess")}
            failureMessage={t("translationPartialFailed")}
          />
        )}
      </form>
    </div>
  );
}
