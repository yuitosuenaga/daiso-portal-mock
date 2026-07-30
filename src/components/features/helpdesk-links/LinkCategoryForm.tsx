"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LinkCategoryLanguageTabs } from "@/components/features/helpdesk-links/LinkCategoryLanguageTabs";
import {
  createLinkCategoryAction,
  updateLinkCategoryAction,
} from "@/lib/actions/link-categories";
import {
  linkCategoryFormSchema,
  type LinkCategoryFormValues,
  type LinkCategorySubmitValues,
} from "@/lib/validation/link-category";
import type { CreateLinkCategoryInput, LinkCategory } from "@/types/link-category";

export interface LinkCategoryFormProps {
  mode: "createParent" | "createChild" | "edit";
  /** "createChild"のとき、追加先の大分類ID（親選択UIは持たず固定表示する） */
  parentId?: string;
  /** "edit"のとき、編集対象の既存カテゴリ */
  category?: LinkCategory;
  onSaved: () => void;
  onCancel: () => void;
}

function toDefaultValues(
  mode: LinkCategoryFormProps["mode"],
  parentId: string | undefined,
  category: LinkCategory | undefined
): LinkCategoryFormValues {
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
    };
  }

  return {
    parentId: mode === "createChild" ? (parentId ?? null) : null,
    name: "",
    nameEn: "",
    translations: [],
  };
}

/**
 * リンクカテゴリ（大分類／中分類）の追加・編集フォーム。名称は`LinkCategoryLanguageTabs`
 * による言語タブUIのみを持つ（`documents-management`の`DocumentCategoryForm`と異なり
 * 公開範囲(targeting)の入力は持たない）。
 */
export function LinkCategoryForm({
  mode,
  parentId,
  category,
  onSaved,
  onCancel,
}: LinkCategoryFormProps) {
  const t = useTranslations("helpdeskLinks.categories.form");
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [nameConflictError, setNameConflictError] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
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
    try {
      if (mode === "edit" && category) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId: _parentId, ...updateInput } = values;
        await updateLinkCategoryAction(category.id, updateInput);
      } else {
        await createLinkCategoryAction(values as unknown as CreateLinkCategoryInput);
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
        <LinkCategoryLanguageTabs
          register={register}
          control={control}
          watch={watch}
          errors={errors}
        />

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
