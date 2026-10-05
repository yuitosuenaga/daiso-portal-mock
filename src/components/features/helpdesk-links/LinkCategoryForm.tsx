"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import {
  createLinkCategoryAction,
  retranslateLinkCategoryAction,
  updateLinkCategoryAction,
} from "@/lib/actions/link-categories";
import {
  linkCategoryFormSchema,
  type LinkCategoryFormValues,
  type LinkCategorySubmitValues,
} from "@/lib/validation/link-category";
import type { LinkCategory } from "@/types/link-category";

export interface LinkCategoryFormProps {
  mode: "createParent" | "createChild" | "edit";
  /** "createChild"のとき、追加先の大分類ID（親選択UIは持たず固定表示する） */
  parentId?: string;
  /** "edit"のとき、編集対象の既存カテゴリ */
  category?: LinkCategory;
  onSaved: () => void;
  onCancel: () => void;
  /** 「再翻訳」ボタンのラベル（翻訳に一部失敗したときに表示する） */
  retranslateButtonLabel: string;
}

function toDefaultValues(
  mode: LinkCategoryFormProps["mode"],
  parentId: string | undefined,
  category: LinkCategory | undefined
): LinkCategoryFormValues {
  if (category) {
    return { parentId: category.parentId, name: category.name };
  }

  return { parentId: mode === "createChild" ? (parentId ?? null) : null, name: "" };
}

/**
 * リンクカテゴリ（大分類／中分類）の追加・編集フォーム。名称は日本語のみ入力し、他言語は保存時に自動翻訳される（`documents-management`の`DocumentCategoryForm`と異なり
 * 公開範囲(targeting)の入力は持たない）。
 */
export function LinkCategoryForm({
  mode,
  parentId,
  category,
  onSaved,
  onCancel,
  retranslateButtonLabel,
}: LinkCategoryFormProps) {
  const t = useTranslations("helpdeskLinks.categories.form");
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [nameConflictError, setNameConflictError] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const [savedCategoryId, setSavedCategoryId] = useState<string | null>(category?.id ?? null);
  const [isRetranslating, setIsRetranslating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinkCategoryFormValues, unknown, LinkCategorySubmitValues>({
    resolver: zodResolver(linkCategoryFormSchema) as unknown as Resolver<
      LinkCategoryFormValues,
      unknown,
      LinkCategorySubmitValues
    >,
    defaultValues: toDefaultValues(mode, parentId, category),
  });

  const formTitle =
    mode === "edit"
      ? t("editTitle")
      : mode === "createChild"
        ? t("createChildTitle")
        : t("createParentTitle");

  async function onSubmit(values: LinkCategorySubmitValues) {
    setHasSubmitError(false);
    setNameConflictError(false);
    setTranslationFailed(false);
    try {
      const result =
        mode === "edit" && category
          ? await updateLinkCategoryAction(category.id, { name: values.name })
          : await createLinkCategoryAction(values);
      if (result.failedLocales.length > 0) {
        // 保存は完了している。再翻訳できるよう、フォームを閉じずに案内する
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

  async function handleRetranslate() {
    if (!savedCategoryId) return;
    setIsRetranslating(true);
    try {
      const result = await retranslateLinkCategoryAction(savedCategoryId);
      if (result.failedLocales.length === 0) {
        onSaved();
        return;
      }
    } catch {
      // 失敗時は案内メッセージを表示したままにする
    } finally {
      setIsRetranslating(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{formTitle}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          label={t("nameLabel")}
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

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting || translationFailed}>
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
        {translationFailed && (
          <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
            <span>{t("translationFailed")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRetranslating}
              onClick={handleRetranslate}
            >
              {retranslateButtonLabel}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onSaved}>
              {t("cancelButton")}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
