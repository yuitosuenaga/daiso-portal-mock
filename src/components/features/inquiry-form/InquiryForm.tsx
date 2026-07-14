"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { InquiryDetailsSection } from "@/components/features/inquiry-form/InquiryDetailsSection";
import { InquiryDescriptionSection } from "@/components/features/inquiry-form/InquiryDescriptionSection";
import {
  ApplicantInfoSection,
  type ProxyCompanyOption,
} from "@/components/features/inquiry-form/ApplicantInfoSection";
import { AttachmentField } from "@/components/features/inquiry-form/AttachmentField";
import { createInquiryAction } from "@/lib/actions/inquiry";
import { toCreateInquiryInput } from "@/lib/inquiry-form-mapper";
import {
  inquiryFormSchema,
  type InquiryFormValues,
} from "@/lib/validation/inquiry";

/** 送信結果の表示状態。 */
type SubmissionState = "idle" | "success" | "error";

interface InquiryFormProps {
  /** 送信成功後に遷移先として表示する問い合わせ一覧のパス */
  listHref?: string;
  /**
   * 既定値は`"self"`（申請者本人による送信、既存動作）。
   * `"helpdeskProxy"`のときのみ対象会社選択欄を表示し、選択会社に紐付けて代理登録する。
   */
  mode?: "self" | "helpdeskProxy";
  /** `mode === "helpdeskProxy"`のときのみ使用する選択可能な会社一覧。 */
  companies?: ProxyCompanyOption[];
}

/**
 * 問い合わせ・申請フォーム全体の状態管理・バリデーション・送信処理を統括するコンポーネント。
 */
export function InquiryForm({
  listHref = "/inquiry",
  mode = "self",
  companies = [],
}: InquiryFormProps) {
  const t = useTranslations("inquiryForm");
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  // 送信成功時にAttachmentFieldを再マウントし、直前の選択に対する
  // ローカルなエラー表示（サイズ超過等）が残り続けないようにする
  const [attachmentFieldResetKey, setAttachmentFieldResetKey] = useState(0);

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      // 未選択の<select>がブラウザ標準動作で先頭の非活性オプションを自動選択し、
      // 必須バリデーションを素通りしてしまう不具合を防ぐため、明示的に空値を設定する
      category: "" as unknown as InquiryFormValues["category"],
      urgency: "" as unknown as InquiryFormValues["urgency"],
      originalLanguage: "" as unknown as InquiryFormValues["originalLanguage"],
      country: "" as unknown as InquiryFormValues["country"],
      attachments: [],
      mode,
      // "self"モードでは対象会社選択欄自体を表示しないため未設定（undefined）のままとする。
      // "helpdeskProxy"モードでは、他の必須<select>と同様に空文字を明示設定し、
      // ブラウザ標準動作による先頭オプションの自動選択（必須検証の素通り）を防ぐ。
      targetCompanyId:
        mode === "helpdeskProxy"
          ? ("" as unknown as InquiryFormValues["targetCompanyId"])
          : undefined,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: InquiryFormValues) => {
    try {
      const proxyCompanyId =
        mode === "helpdeskProxy" ? values.targetCompanyId : undefined;
      await createInquiryAction(toCreateInquiryInput(values), proxyCompanyId);
      setSubmissionState("success");
      reset();
      setAttachmentFieldResetKey((key) => key + 1);
    } catch {
      setSubmissionState("error");
    }
  };

  return (
    <div className="max-w-4xl">
      <BackLink href={listHref} label={t("backToList")} className="mb-4" />
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mb-6">{t("description")}</p>

      {submissionState === "success" && (
        <Alert variant="success" className="mb-6">
          <AlertTitle>{t("submit.successTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("submit.successDescription")}</p>
            <Link href={listHref} className="underline">
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
          <ApplicantInfoSection mode={mode} companies={companies} />

          <Controller
            key={attachmentFieldResetKey}
            name="attachments"
            control={form.control}
            render={({ field }) => (
              <AttachmentField
                value={field.value ?? []}
                onChange={field.onChange}
                label={t("fields.attachments.label")}
                hint={t("fields.attachments.hint")}
                removeButtonLabel={t("fields.attachments.removeButton")}
                sizeExceededMessage={t("validation.attachments.sizeExceeded")}
                typeNotAllowedMessage={t(
                  "validation.attachments.typeNotAllowed"
                )}
                countExceededMessage={t(
                  "validation.attachments.countExceeded"
                )}
                readFailedMessage={t("validation.attachments.readFailed")}
              />
            )}
          />

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
