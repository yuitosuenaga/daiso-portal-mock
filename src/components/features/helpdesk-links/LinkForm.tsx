"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import { linkFormSchema, type LinkFormValues } from "@/lib/validation/link";
import { createLinkAction, updateLinkAction } from "@/lib/actions/links";

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
  descriptionLabel: string;
  descriptionPlaceholder: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  invalidUrlErrorMessage: string;
  submitErrorMessage: string;
  categoryOptions?: { value: string; label: string }[];
}

/**
 * リンクの新規作成・編集で共用するフォーム。`helpdesk-faq`の`FaqForm`と
 * 同じ構造パターンを踏襲する（説明の任意項目・URL形式検証のみが異なる）。
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
    formState: { errors, isSubmitting },
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    // カテゴリセレクトのプレースホルダーは disabled な選択肢のため、明示的に
    // 空文字列を初期値として渡さないと、ブラウザがプレースホルダーを飛ばして
    // 最初の選択可能な選択肢を暗黙に選択してしまい、未選択時の必須チェックが
    // 機能しなくなる。
    defaultValues: defaultValues ?? {
      category: "" as unknown as LinkFormValues["category"],
      title: "",
      url: "",
      description: "",
    },
  });

  const options =
    categoryOptions ??
    LINK_CATEGORY_CODES.map((code) => ({ value: code, label: code }));

  async function onSubmit(values: LinkFormValues) {
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
        error={errors.category ? requiredErrorMessage : undefined}
      >
        <Select
          id="link-category"
          options={options}
          placeholder={categoryPlaceholder}
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
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
