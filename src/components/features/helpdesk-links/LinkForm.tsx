"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  linkFormSchema,
  type LinkFormValues,
  type LinkSubmitValues,
} from "@/lib/validation/link";
import { createLinkAction, updateLinkAction } from "@/lib/actions/links";

/** 大分類1件分の選択肢（`getAllLinkCategories()`の大分類一覧、中分類を含む）。 */
export interface LinkCategoryFormOption {
  id: string;
  name: string;
  subCategories: { id: string; name: string }[];
}

export interface LinkFormProps {
  mode: "create" | "edit";
  linkId?: string;
  defaultValues?: LinkFormValues;
  titleLabel: string;
  titlePlaceholder: string;
  urlLabel: string;
  urlPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  subCategoryLabel: string;
  subCategoryPlaceholder: string;
  subCategoryNoneOption: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  invalidUrlErrorMessage: string;
  submitErrorMessage: string;
  /** 大分類の選択肢（`getAllLinkCategories()`の大分類一覧、`links-management`要件12.5） */
  categoryOptions: LinkCategoryFormOption[];
}

/**
 * リンクの新規作成・編集で共用するフォーム。`helpdesk-faq`の`FaqForm`と
 * 同じ構造パターンを踏襲する（説明の任意項目・URL形式検証・大分類/中分類2段Selectが異なる）。
 * 大分類必須・中分類任意（要件12.5）、中分類の選択肢は選択中の大分類配下のみに限定し
 * （要件12.7）、大分類変更時に中分類選択をリセットする（要件12.8、`DocumentForm`と同型）。
 */
export function LinkForm({
  mode,
  linkId,
  defaultValues,
  titleLabel,
  titlePlaceholder,
  urlLabel,
  urlPlaceholder,
  categoryLabel,
  categoryPlaceholder,
  subCategoryLabel,
  subCategoryPlaceholder,
  subCategoryNoneOption,
  descriptionLabel,
  descriptionPlaceholder,
  submitButtonLabel,
  requiredErrorMessage,
  invalidUrlErrorMessage,
  submitErrorMessage,
  categoryOptions,
}: LinkFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LinkFormValues, unknown, LinkSubmitValues>({
    resolver: zodResolver(linkFormSchema) as unknown as Resolver<
      LinkFormValues,
      unknown,
      LinkSubmitValues
    >,
    // カテゴリセレクトのプレースホルダーは disabled な選択肢のため、明示的に
    // 空文字列を初期値として渡さないと、ブラウザがプレースホルダーを飛ばして
    // 最初の選択可能な選択肢を暗黙に選択してしまい、未選択時の必須チェックが
    // 機能しなくなる。
    defaultValues: defaultValues ?? {
      categoryId: "",
      subCategoryId: "",
      title: "",
      url: "",
      description: "",
    },
  });

  const categoryId = watch("categoryId");
  const previousCategoryIdRef = useRef(categoryId);
  const selectedCategory = categoryOptions.find(
    (option) => option.id === categoryId
  );

  useEffect(() => {
    if (previousCategoryIdRef.current !== categoryId) {
      setValue("subCategoryId", "", { shouldValidate: true });
    }
    previousCategoryIdRef.current = categoryId;
  }, [categoryId, setValue]);

  async function onSubmit(values: LinkSubmitValues) {
    setHasSubmitError(false);
    try {
      if (mode === "edit" && linkId) {
        await updateLinkAction(linkId, values);
      } else {
        await createLinkAction(values);
      }
      router.push("/helpdesk/links");
    } catch {
      setHasSubmitError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={titleLabel}
        htmlFor="link-title"
        error={errors.title ? requiredErrorMessage : undefined}
      >
        <Input
          id="link-title"
          placeholder={titlePlaceholder}
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
      </FormField>

      <FormField
        label={urlLabel}
        htmlFor="link-url"
        error={
          errors.url?.type === "invalid_string" || errors.url?.type === "invalid_format"
            ? invalidUrlErrorMessage
            : errors.url
              ? requiredErrorMessage
              : undefined
        }
      >
        <Input
          id="link-url"
          type="text"
          placeholder={urlPlaceholder}
          aria-invalid={errors.url ? true : undefined}
          {...register("url")}
        />
      </FormField>

      <FormField
        label={categoryLabel}
        htmlFor="link-category"
        error={errors.categoryId ? requiredErrorMessage : undefined}
      >
        <Select
          id="link-category"
          options={categoryOptions.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
          placeholder={categoryPlaceholder}
          aria-invalid={errors.categoryId ? true : undefined}
          {...register("categoryId")}
        />
      </FormField>

      <FormField label={subCategoryLabel} htmlFor="link-subcategory">
        <Select
          id="link-subcategory"
          options={[
            { value: "", label: subCategoryNoneOption },
            ...(selectedCategory?.subCategories.map((subCategory) => ({
              value: subCategory.id,
              label: subCategory.name,
            })) ?? []),
          ]}
          placeholder={subCategoryPlaceholder}
          disabled={!selectedCategory}
          {...register("subCategoryId")}
        />
      </FormField>

      <FormField label={descriptionLabel} htmlFor="link-description">
        <Textarea
          id="link-description"
          placeholder={descriptionPlaceholder}
          rows={3}
          {...register("description")}
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
