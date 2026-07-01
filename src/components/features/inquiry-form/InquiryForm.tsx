"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InquiryDetailsSection } from "@/components/features/inquiry-form/InquiryDetailsSection";
import { InquiryDescriptionSection } from "@/components/features/inquiry-form/InquiryDescriptionSection";
import { ApplicantInfoSection } from "@/components/features/inquiry-form/ApplicantInfoSection";
import { createInquiry } from "@/lib/api/inquiries";
import { toCreateInquiryInput } from "@/lib/inquiry-form-mapper";
import {
  inquiryFormSchema,
  type InquiryFormValues,
} from "@/lib/validation/inquiry";

/** 送信結果の表示状態。 */
type SubmissionState = "idle" | "success" | "error";

/**
 * 問い合わせ・申請フォーム全体の状態管理・バリデーション・送信処理を統括するコンポーネント。
 */
export function InquiryForm() {
  const t = useTranslations("inquiryForm");
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: InquiryFormValues) => {
    try {
      await createInquiry(toCreateInquiryInput(values));
      setSubmissionState("success");
      reset();
    } catch {
      setSubmissionState("error");
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mb-6">{t("description")}</p>

      {submissionState === "success" && (
        <Alert variant="success" className="mb-6">
          <AlertTitle>{t("submit.successTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("submit.successDescription")}</p>
            <Link href="/inquiry" className="underline">
              {t("submit.viewInquiryListLink")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {submissionState === "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>{t("submit.errorTitle")}</AlertTitle>
          <AlertDescription>{t("submit.errorDescription")}</AlertDescription>
        </Alert>
      )}

      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <InquiryDetailsSection />
          <InquiryDescriptionSection />
          <ApplicantInfoSection />

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submit.submitting") : t("submit.button")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
