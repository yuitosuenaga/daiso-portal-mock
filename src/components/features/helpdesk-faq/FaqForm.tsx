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
import { faqFormSchema, type FaqFormValues } from "@/lib/validation/faq";
import { createFaqAction, updateFaqAction } from "@/lib/actions/faqs";

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
  categoryOptions?: { value: string; label: string }[];
}

/**
 * FAQの新規作成・編集で共用するフォーム。`helpdesk-templates`の`TemplateForm`と
 * 同じ構造パターンを踏襲する。
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
  categoryOptions,
}: FaqFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FaqFormValues>({
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

  async function onSubmit(values: FaqFormValues) {
    setHasSubmitError(false);
    try {
      if (mode === "edit" && faqId) {
        await updateFaqAction(faqId, values);
      } else {
        await createFaqAction(values);
      }
      router.push("/helpdesk/faq");
    } catch {
      setHasSubmitError(true);
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
