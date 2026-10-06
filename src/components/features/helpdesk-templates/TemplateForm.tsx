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
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";
import {
  replyTemplateFormSchema,
  type ReplyTemplateFormValues,
} from "@/lib/validation/reply-template";
import {
  createReplyTemplateAction,
  retranslateReplyTemplateAction,
  updateReplyTemplateAction,
} from "@/lib/actions/helpdesk";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";

export interface TemplateFormProps {
  mode: "create" | "edit";
  templateId?: string;
  defaultValues?: ReplyTemplateFormValues;
  nameLabel: string;
  namePlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  nameTooLongErrorMessage: string;
  submitErrorMessage: string;
  /** 一部言語の自動翻訳に失敗した旨のメッセージ（保存自体は成功している）。 */
  translationFailedMessage: string;
  /** 不足言語の再翻訳ボタンのラベル。 */
  retranslateButtonLabel: string;
  categoryOptions?: { value: string; label: string }[];
}

/**
 * テンプレートの新規作成・編集で共用するフォーム。
 * `mode` に応じて `createReplyTemplateAction`/`updateReplyTemplateAction` を呼び分ける。
 */
export function TemplateForm({
  mode,
  templateId,
  defaultValues,
  nameLabel,
  namePlaceholder,
  categoryLabel,
  categoryPlaceholder,
  bodyLabel,
  bodyPlaceholder,
  submitButtonLabel,
  requiredErrorMessage,
  nameTooLongErrorMessage,
  submitErrorMessage,
  translationFailedMessage,
  retranslateButtonLabel,
  categoryOptions,
}: TemplateFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  // 新規作成で保存済みになった場合のID（以後の送信は更新として扱い、重複作成を防ぐ）
  const [savedTemplateId, setSavedTemplateId] = useState<string | undefined>(templateId);
  const [failedLocales, setFailedLocales] = useState<string[]>([]);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReplyTemplateFormValues>({
    resolver: zodResolver(replyTemplateFormSchema),
    // 案件種別セレクトのプレースホルダーは disabled な選択肢のため、明示的に
    // 空文字列を初期値として渡さないと、ブラウザがプレースホルダーを飛ばして
    // 最初の選択可能な選択肢を暗黙に選択してしまい、未選択時の必須チェックが
    // 機能しなくなる。
    defaultValues: defaultValues ?? {
      category: "" as unknown as ReplyTemplateFormValues["category"],
      name: "",
      body: "",
    },
  });

  const options =
    categoryOptions ??
    INQUIRY_CATEGORY_CODES.map((code) => ({ value: code, label: code }));

  async function onSubmit(values: ReplyTemplateFormValues) {
    setHasSubmitError(false);
    setFailedLocales([]);
    try {
      const result = savedTemplateId
        ? await updateReplyTemplateAction(savedTemplateId, values)
        : await createReplyTemplateAction(values);
      setSavedTemplateId(result.template.id);
      if (result.failedLocales.length > 0) {
        setFailedLocales(result.failedLocales);
        return;
      }
      router.push("/helpdesk/templates");
    } catch {
      setHasSubmitError(true);
    }
  }

  async function onRetranslate() {
    if (!savedTemplateId) return;
    setHasSubmitError(false);
    setIsRetranslating(true);
    try {
      const result = await retranslateReplyTemplateAction(savedTemplateId);
      setFailedLocales(result.failedLocales);
      if (result.failedLocales.length === 0) {
        router.push("/helpdesk/templates");
      }
    } catch {
      setHasSubmitError(true);
    } finally {
      setIsRetranslating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={nameLabel}
        htmlFor="template-name"
        error={
          errors.name?.type === "too_big"
            ? nameTooLongErrorMessage
            : errors.name
              ? requiredErrorMessage
              : undefined
        }
      >
        <Input
          id="template-name"
          placeholder={namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        label={categoryLabel}
        htmlFor="template-category"
        error={errors.category ? requiredErrorMessage : undefined}
      >
        <Select
          id="template-category"
          options={options}
          placeholder={categoryPlaceholder}
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
        />
      </FormField>

      <FormField
        label={bodyLabel}
        htmlFor="template-body"
        error={errors.body ? requiredErrorMessage : undefined}
      >
        <Textarea
          id="template-body"
          placeholder={bodyPlaceholder}
          rows={5}
          aria-invalid={errors.body ? true : undefined}
          maxLength={TEXT_LIMITS.body}
          {...register("body")}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || isRetranslating}>
          {submitButtonLabel}
        </Button>
        {savedTemplateId && (failedLocales.length > 0 || mode === "edit") && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isRetranslating}
            onClick={onRetranslate}
          >
            {retranslateButtonLabel}
          </Button>
        )}
        {failedLocales.length > 0 && (
          <span role="status" className="text-sm text-destructive">
            {translationFailedMessage}
          </span>
        )}
        {hasSubmitError && (
          <span role="status" className="text-sm text-destructive">
            {submitErrorMessage}
          </span>
        )}
      </div>
    </form>
  );
}
