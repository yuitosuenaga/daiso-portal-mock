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
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import {
  faqFormSchema,
  type FaqFormValues,
  type FaqSubmitValues,
} from "@/lib/validation/faq";
import {
  createFaqAction,
  retranslateFaqAction,
  updateFaqAction,
} from "@/lib/actions/faqs";

export interface FaqFormProps {
  mode: "create" | "edit";
  faqId?: string;
  defaultValues?: FaqFormValues;
  questionLabel: string;
  questionPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  answerLabel: string;
  answerPlaceholder: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  submitErrorMessage: string;
  /** 一部言語の自動翻訳に失敗した旨のメッセージ（保存自体は成功している）。 */
  translationFailedMessage: string;
  /** 不足言語の再翻訳ボタンのラベル。 */
  retranslateButtonLabel: string;
  categoryOptions?: { value: string; label: string }[];
}

/**
 * FAQの新規作成・編集で共用するフォーム。質問・回答は日本語のみ入力し、
 * 他言語は保存時にサーバー側で自動翻訳される。翻訳に失敗した言語がある場合は
 * メッセージと再翻訳ボタンを表示する（保存自体は完了済み）。
 */
export function FaqForm({
  mode,
  faqId,
  defaultValues,
  questionLabel,
  questionPlaceholder,
  categoryLabel,
  categoryPlaceholder,
  answerLabel,
  answerPlaceholder,
  submitButtonLabel,
  requiredErrorMessage,
  submitErrorMessage,
  translationFailedMessage,
  retranslateButtonLabel,
  categoryOptions,
}: FaqFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  // 新規作成で保存済みになった場合のID（以後の送信は更新として扱い、重複作成を防ぐ）
  const [savedFaqId, setSavedFaqId] = useState<string | undefined>(faqId);
  const [failedLocales, setFailedLocales] = useState<string[]>([]);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FaqFormValues, unknown, FaqSubmitValues>({
    resolver: zodResolver(faqFormSchema),
    // カテゴリセレクトのプレースホルダーは disabled な選択肢のため、明示的に
    // 空文字列を初期値として渡さないと、ブラウザがプレースホルダーを飛ばして
    // 最初の選択可能な選択肢を暗黙に選択してしまい、未選択時の必須チェックが
    // 機能しなくなる。
    defaultValues: defaultValues ?? {
      category: "" as unknown as FaqFormValues["category"],
      question: "",
      answer: "",
    },
  });

  const options =
    categoryOptions ??
    FAQ_CATEGORY_CODES.map((code) => ({ value: code, label: code }));

  async function onSubmit(values: FaqSubmitValues) {
    setHasSubmitError(false);
    setFailedLocales([]);
    try {
      const result =
        savedFaqId
          ? await updateFaqAction(savedFaqId, values)
          : await createFaqAction(values);
      setSavedFaqId(result.faq.id);
      if (result.failedLocales.length > 0) {
        setFailedLocales(result.failedLocales);
        return;
      }
      router.push("/helpdesk/faq");
    } catch {
      setHasSubmitError(true);
    }
  }

  async function onRetranslate() {
    if (!savedFaqId) return;
    setHasSubmitError(false);
    setIsRetranslating(true);
    try {
      const result = await retranslateFaqAction(savedFaqId);
      setFailedLocales(result.failedLocales);
      if (result.failedLocales.length === 0) {
        router.push("/helpdesk/faq");
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
        label={questionLabel}
        htmlFor="faq-question"
        error={errors.question ? requiredErrorMessage : undefined}
      >
        <Input
          id="faq-question"
          placeholder={questionPlaceholder}
          aria-invalid={errors.question ? true : undefined}
          {...register("question")}
        />
      </FormField>
      <FormField
        label={answerLabel}
        htmlFor="faq-answer"
        error={errors.answer ? requiredErrorMessage : undefined}
      >
        <Textarea
          id="faq-answer"
          placeholder={answerPlaceholder}
          rows={5}
          aria-invalid={errors.answer ? true : undefined}
          {...register("answer")}
        />
      </FormField>

      <FormField
        label={categoryLabel}
        htmlFor="faq-category"
        error={errors.category ? requiredErrorMessage : undefined}
      >
        <Select
          id="faq-category"
          options={options}
          placeholder={categoryPlaceholder}
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || isRetranslating}>
          {submitButtonLabel}
        </Button>
        {savedFaqId && (failedLocales.length > 0 || mode === "edit") && (
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
