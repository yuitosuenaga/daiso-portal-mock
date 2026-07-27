"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
  languageJaTabLabel: string;
  languageEnTabLabel: string;
  languageAddButtonLabel: string;
  languageRemoveButtonLabel: string;
  languageLocaleCodeLabel: string;
  languageLocaleCodePlaceholder: string;
  languageLocaleDuplicateErrorMessage: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  submitErrorMessage: string;
  categoryOptions?: { value: string; label: string }[];
}

/**
 * FAQの新規作成・編集で共用するフォーム。質問・回答を`AnnouncementForm`と同型の
 * 言語タブUI（固定ja/enタブ＋任意の追加言語タブ）で言語別に入力できる。
 * カテゴリは言語に依存しない共通項目として言語タブの外に配置する。
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
  languageJaTabLabel,
  languageEnTabLabel,
  languageAddButtonLabel,
  languageRemoveButtonLabel,
  languageLocaleCodeLabel,
  languageLocaleCodePlaceholder,
  languageLocaleDuplicateErrorMessage,
  submitButtonLabel,
  requiredErrorMessage,
  submitErrorMessage,
  categoryOptions,
}: FaqFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("ja");
  const {
    register,
    handleSubmit,
    control,
    watch,
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
      questionEn: "",
      answerEn: "",
      translations: [],
    },
  });
  const {
    fields: translationFields,
    append: appendTranslation,
    remove: removeTranslation,
  } = useFieldArray({ control, name: "translations" });
  const previousTranslationCountRef = useRef(translationFields.length);

  // 言語を追加した直後、追加した行のタブへ自動的に切り替える。
  useEffect(() => {
    if (translationFields.length > previousTranslationCountRef.current) {
      const lastField = translationFields[translationFields.length - 1];
      if (lastField) {
        setActiveLanguageTab(lastField.id);
      }
    }
    previousTranslationCountRef.current = translationFields.length;
  }, [translationFields]);

  // 保存操作でja/en/追加言語のいずれかにエラーがある場合、そのタブへ自動的に切り替える
  // （非表示タブのフィールドにエラーが出ていても、閲覧者が気づけるようにするため）。
  useEffect(() => {
    if (errors.question || errors.answer) {
      setActiveLanguageTab("ja");
      return;
    }
    if (errors.questionEn || errors.answerEn) {
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

  const options =
    categoryOptions ??
    FAQ_CATEGORY_CODES.map((code) => ({ value: code, label: code }));

  async function onSubmit(values: FaqSubmitValues) {
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

  const languageTabButtonClassName = (isActive: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm ${
      isActive
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background text-foreground"
    }`;

  return (
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
            {languageJaTabLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeLanguageTab === "en"}
            className={languageTabButtonClassName(activeLanguageTab === "en")}
            onClick={() => setActiveLanguageTab("en")}
          >
            {languageEnTabLabel}
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
                {locale || languageLocaleCodeLabel}
              </button>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              appendTranslation({ locale: "", question: "", answer: "" });
            }}
          >
            {languageAddButtonLabel}
          </Button>
        </div>

        {activeLanguageTab === "ja" && (
          <div className="flex flex-col gap-4">
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
          </div>
        )}

        {activeLanguageTab === "en" && (
          <div className="flex flex-col gap-4">
            <FormField
              label={questionLabel}
              htmlFor="faq-question-en"
              error={errors.questionEn ? requiredErrorMessage : undefined}
            >
              <Input
                id="faq-question-en"
                placeholder={questionPlaceholder}
                aria-invalid={errors.questionEn ? true : undefined}
                {...register("questionEn")}
              />
            </FormField>
            <FormField
              label={answerLabel}
              htmlFor="faq-answer-en"
              error={errors.answerEn ? requiredErrorMessage : undefined}
            >
              <Textarea
                id="faq-answer-en"
                placeholder={answerPlaceholder}
                rows={5}
                aria-invalid={errors.answerEn ? true : undefined}
                {...register("answerEn")}
              />
            </FormField>
          </div>
        )}

        {translationFields.map((field, index) => {
          if (activeLanguageTab !== field.id) {
            return null;
          }
          const translationError = errors.translations?.[index];
          return (
            <div key={field.id} className="flex flex-col gap-4">
              <FormField
                label={languageLocaleCodeLabel}
                htmlFor={`faq-translation-${index}-locale`}
                error={
                  translationError?.locale
                    ? languageLocaleDuplicateErrorMessage
                    : undefined
                }
              >
                <Input
                  id={`faq-translation-${index}-locale`}
                  placeholder={languageLocaleCodePlaceholder}
                  aria-invalid={translationError?.locale ? true : undefined}
                  {...register(`translations.${index}.locale`)}
                />
              </FormField>
              <FormField
                label={questionLabel}
                htmlFor={`faq-translation-${index}-question`}
                error={translationError?.question ? requiredErrorMessage : undefined}
              >
                <Input
                  id={`faq-translation-${index}-question`}
                  placeholder={questionPlaceholder}
                  aria-invalid={translationError?.question ? true : undefined}
                  {...register(`translations.${index}.question`)}
                />
              </FormField>
              <FormField
                label={answerLabel}
                htmlFor={`faq-translation-${index}-answer`}
                error={translationError?.answer ? requiredErrorMessage : undefined}
              >
                <Textarea
                  id={`faq-translation-${index}-answer`}
                  placeholder={answerPlaceholder}
                  rows={5}
                  aria-invalid={translationError?.answer ? true : undefined}
                  {...register(`translations.${index}.answer`)}
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
                {languageRemoveButtonLabel}
              </Button>
            </div>
          );
        })}
      </div>

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
