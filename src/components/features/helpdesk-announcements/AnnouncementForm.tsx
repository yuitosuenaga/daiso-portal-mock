"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { AttachmentField } from "@/components/features/inquiry-form/AttachmentField";
import { AnnouncementDocumentLinkDialog } from "@/components/features/helpdesk-announcements/AnnouncementDocumentLinkDialog";
import { CountryTargetingSelect } from "@/components/features/helpdesk-announcements/CountryTargetingSelect";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import { Select, type SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/actions/announcements";
import {
  announcementFormSchema,
  type AnnouncementFormValues,
  type AnnouncementSubmitValues,
} from "@/lib/validation/announcement";
import { ATTACHMENT_MAX_COUNT } from "@/lib/constants/attachment";
import type { Document } from "@/types/document";

export interface AnnouncementFormProps {
  mode: "create" | "edit";
  announcementId?: string;
  defaultValues?: AnnouncementFormValues;
  categoryOptions: SelectOption[];
  countryOptions: SelectOption[];
  /** ドキュメント紐づけダイアログの選択候補となる、登録済みドキュメント全件（絞り込みなし）。 */
  documentOptions: Document[];
  titleLabel: string;
  titlePlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  languageJaTabLabel: string;
  languageEnTabLabel: string;
  languageAddButtonLabel: string;
  languageRemoveButtonLabel: string;
  languageLocaleCodeLabel: string;
  languageLocaleCodePlaceholder: string;
  languageLocaleDuplicateErrorMessage: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  statusLabel: string;
  statusDraftOption: string;
  statusPublishedOption: string;
  actionRequiredLabel: string;
  actionRequiredTrueOption: string;
  actionRequiredFalseOption: string;
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  countriesLabel: string;
  countriesSearchPlaceholder: string;
  countriesSelectAllButtonLabel: string;
  countriesClearAllButtonLabel: string;
  countriesSelectedCountLabel: string;
  countriesNoResultsMessage: string;
  countriesRemoveChipButtonLabel: string;
  publishStartDateLabel: string;
  publishEndDateLabel: string;
  publishPeriodHint: string;
  publishEndDateBeforeStartErrorMessage: string;
  dueDateLabel: string;
  dueDateRequiredErrorMessage: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  countriesRequiredErrorMessage: string;
  requiredIndicator: string;
  submitErrorMessage: string;
  attachmentsLabel: string;
  attachmentsHint: string;
  attachmentsRemoveButtonLabel: string;
  attachmentsSizeExceededMessage: string;
  attachmentsTypeNotAllowedMessage: string;
  attachmentsCountExceededMessage: string;
  attachmentsReadFailedMessage: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  linkedDocumentsLabel: string;
  linkedDocumentsPickButtonLabel: string;
  linkedDocumentsEmptyMessage: string;
  linkedDocumentRemoveButtonLabel: string;
  linkedDocumentsDialogTitle: string;
  linkedDocumentsDialogConfirmLabel: string;
  linkedDocumentsDialogCancelLabel: string;
  linkedDocumentsDialogNoDocumentsMessage: string;
  linkedDocumentsTargetingAllLabel: string;
  linkedDocumentsTargetingCountriesPrefixLabel: string;
  linkedDocumentsTargetingCompaniesPrefixLabel: string;
}

/**
 * お知らせの新規作成・編集で共用するフォーム。配信対象の選択（全体一律/特定の国・地域）を含む。
 */
export function AnnouncementForm({
  mode,
  announcementId,
  defaultValues,
  categoryOptions,
  countryOptions,
  documentOptions,
  titleLabel,
  titlePlaceholder,
  bodyLabel,
  bodyPlaceholder,
  languageJaTabLabel,
  languageEnTabLabel,
  languageAddButtonLabel,
  languageRemoveButtonLabel,
  languageLocaleCodeLabel,
  languageLocaleCodePlaceholder,
  languageLocaleDuplicateErrorMessage,
  categoryLabel,
  categoryPlaceholder,
  statusLabel,
  statusDraftOption,
  statusPublishedOption,
  actionRequiredLabel,
  actionRequiredTrueOption,
  actionRequiredFalseOption,
  targetingLabel,
  targetingAllOption,
  targetingCountriesOption,
  countriesLabel,
  countriesSearchPlaceholder,
  countriesSelectAllButtonLabel,
  countriesClearAllButtonLabel,
  countriesSelectedCountLabel,
  countriesNoResultsMessage,
  countriesRemoveChipButtonLabel,
  publishStartDateLabel,
  publishEndDateLabel,
  publishPeriodHint,
  publishEndDateBeforeStartErrorMessage,
  dueDateLabel,
  dueDateRequiredErrorMessage,
  submitButtonLabel,
  requiredErrorMessage,
  countriesRequiredErrorMessage,
  requiredIndicator,
  submitErrorMessage,
  attachmentsLabel,
  attachmentsHint,
  attachmentsRemoveButtonLabel,
  attachmentsSizeExceededMessage,
  attachmentsTypeNotAllowedMessage,
  attachmentsCountExceededMessage,
  attachmentsReadFailedMessage,
  downloadLinkLabel,
  openOriginalLinkLabel,
  linkedDocumentsLabel,
  linkedDocumentsPickButtonLabel,
  linkedDocumentsEmptyMessage,
  linkedDocumentRemoveButtonLabel,
  linkedDocumentsDialogTitle,
  linkedDocumentsDialogConfirmLabel,
  linkedDocumentsDialogCancelLabel,
  linkedDocumentsDialogNoDocumentsMessage,
  linkedDocumentsTargetingAllLabel,
  linkedDocumentsTargetingCountriesPrefixLabel,
  linkedDocumentsTargetingCompaniesPrefixLabel,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("ja");
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues, unknown, AnnouncementSubmitValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: defaultValues ?? {
      title: "",
      body: "",
      titleEn: "",
      bodyEn: "",
      translations: [],
      category: "" as unknown as AnnouncementFormValues["category"],
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: "",
      publishEndDate: "",
      dueDate: "",
      attachments: [],
      linkedDocumentIds: [],
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
    if (errors.title || errors.body) {
      setActiveLanguageTab("ja");
      return;
    }
    if (errors.titleEn || errors.bodyEn) {
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

  const statusOptions: SelectOption[] = [
    { value: "draft", label: statusDraftOption },
    { value: "published", label: statusPublishedOption },
  ];

  const actionRequiredOptions: SelectOption[] = [
    { value: "false", label: actionRequiredFalseOption },
    { value: "true", label: actionRequiredTrueOption },
  ];

  const scopeOptions: SelectOption[] = [
    { value: "all", label: targetingAllOption },
    { value: "countries", label: targetingCountriesOption },
  ];
  const scope = watch("targeting.scope");
  const actionRequired = watch("actionRequired");

  async function onSubmit(values: AnnouncementSubmitValues) {
    setHasSubmitError(false);
    try {
      if (mode === "edit" && announcementId) {
        await updateAnnouncementAction(announcementId, values);
      } else {
        await createAnnouncementAction(values);
      }
      router.push("/helpdesk/announcements");
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
              appendTranslation({ locale: "", title: "", body: "" });
            }}
          >
            {languageAddButtonLabel}
          </Button>
        </div>

        {activeLanguageTab === "ja" && (
          <div className="flex flex-col gap-4">
            <FormField
              label={titleLabel}
              required
              requiredIndicator={requiredIndicator}
              htmlFor="announcement-title"
              error={errors.title ? requiredErrorMessage : undefined}
            >
              <Input
                id="announcement-title"
                placeholder={titlePlaceholder}
                aria-invalid={errors.title ? true : undefined}
                {...register("title")}
              />
            </FormField>
            <FormField
              label={bodyLabel}
              required
              requiredIndicator={requiredIndicator}
              htmlFor="announcement-body"
              error={errors.body ? requiredErrorMessage : undefined}
            >
              <Textarea
                id="announcement-body"
                placeholder={bodyPlaceholder}
                rows={5}
                aria-invalid={errors.body ? true : undefined}
                {...register("body")}
              />
            </FormField>
          </div>
        )}

        {activeLanguageTab === "en" && (
          <div className="flex flex-col gap-4">
            <FormField
              label={titleLabel}
              required
              requiredIndicator={requiredIndicator}
              htmlFor="announcement-title-en"
              error={errors.titleEn ? requiredErrorMessage : undefined}
            >
              <Input
                id="announcement-title-en"
                placeholder={titlePlaceholder}
                aria-invalid={errors.titleEn ? true : undefined}
                {...register("titleEn")}
              />
            </FormField>
            <FormField
              label={bodyLabel}
              required
              requiredIndicator={requiredIndicator}
              htmlFor="announcement-body-en"
              error={errors.bodyEn ? requiredErrorMessage : undefined}
            >
              <Textarea
                id="announcement-body-en"
                placeholder={bodyPlaceholder}
                rows={5}
                aria-invalid={errors.bodyEn ? true : undefined}
                {...register("bodyEn")}
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
                required
                requiredIndicator={requiredIndicator}
                htmlFor={`announcement-translation-${index}-locale`}
                error={
                  translationError?.locale
                    ? languageLocaleDuplicateErrorMessage
                    : undefined
                }
              >
                <Input
                  id={`announcement-translation-${index}-locale`}
                  placeholder={languageLocaleCodePlaceholder}
                  aria-invalid={translationError?.locale ? true : undefined}
                  {...register(`translations.${index}.locale`)}
                />
              </FormField>
              <FormField
                label={titleLabel}
                required
                requiredIndicator={requiredIndicator}
                htmlFor={`announcement-translation-${index}-title`}
                error={translationError?.title ? requiredErrorMessage : undefined}
              >
                <Input
                  id={`announcement-translation-${index}-title`}
                  placeholder={titlePlaceholder}
                  aria-invalid={translationError?.title ? true : undefined}
                  {...register(`translations.${index}.title`)}
                />
              </FormField>
              <FormField
                label={bodyLabel}
                required
                requiredIndicator={requiredIndicator}
                htmlFor={`announcement-translation-${index}-body`}
                error={translationError?.body ? requiredErrorMessage : undefined}
              >
                <Textarea
                  id={`announcement-translation-${index}-body`}
                  placeholder={bodyPlaceholder}
                  rows={5}
                  aria-invalid={translationError?.body ? true : undefined}
                  {...register(`translations.${index}.body`)}
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
        required
        requiredIndicator={requiredIndicator}
        htmlFor="announcement-category"
        error={errors.category ? requiredErrorMessage : undefined}
      >
        <Select
          id="announcement-category"
          options={categoryOptions}
          placeholder={categoryPlaceholder}
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
        />
      </FormField>

      <FormField label={statusLabel} htmlFor="announcement-status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              id="announcement-status"
              options={statusOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as AnnouncementFormValues["status"]
                )
              }
            />
          )}
        />
      </FormField>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <FormField
          label={publishStartDateLabel}
          htmlFor="announcement-publish-start-date"
          className="flex-1"
        >
          <Input
            id="announcement-publish-start-date"
            type="date"
            {...register("publishStartDate")}
          />
        </FormField>
        <FormField
          label={publishEndDateLabel}
          htmlFor="announcement-publish-end-date"
          className="flex-1"
          error={errors.publishEndDate ? publishEndDateBeforeStartErrorMessage : undefined}
        >
          <Input
            id="announcement-publish-end-date"
            type="date"
            aria-invalid={errors.publishEndDate ? true : undefined}
            {...register("publishEndDate")}
          />
        </FormField>
      </div>
      <p className="text-xs text-muted-foreground">{publishPeriodHint}</p>

      <FormField
        label={actionRequiredLabel}
        htmlFor="announcement-action-required"
      >
        <Controller
          control={control}
          name="actionRequired"
          render={({ field }) => (
            <Select
              id="announcement-action-required"
              options={actionRequiredOptions}
              value={field.value ? "true" : "false"}
              onChange={(event) => {
                const nextValue = event.target.value === "true";
                field.onChange(nextValue);
                if (!nextValue) {
                  setValue("dueDate", "");
                }
              }}
            />
          )}
        />
      </FormField>

      {actionRequired && (
        <FormField
          label={dueDateLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="announcement-due-date"
          error={errors.dueDate ? dueDateRequiredErrorMessage : undefined}
        >
          <Input
            id="announcement-due-date"
            type="date"
            aria-invalid={errors.dueDate ? true : undefined}
            {...register("dueDate")}
          />
        </FormField>
      )}

      <FormField label={targetingLabel} htmlFor="announcement-targeting-scope">
        <Controller
          control={control}
          name="targeting.scope"
          render={({ field }) => (
            <Select
              id="announcement-targeting-scope"
              options={scopeOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as AnnouncementFormValues["targeting"]["scope"]
                )
              }
            />
          )}
        />
      </FormField>

      {scope === "countries" && (
        <FormField
          label={countriesLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="announcement-targeting-countries-search"
          error={
            errors.targeting && "countries" in errors.targeting
              ? countriesRequiredErrorMessage
              : undefined
          }
        >
          <Controller
            control={control}
            name="targeting.countries"
            render={({ field }) => (
              <CountryTargetingSelect
                id="announcement-targeting-countries"
                options={countryOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                ariaInvalid={
                  errors.targeting && "countries" in errors.targeting
                    ? true
                    : undefined
                }
                groupLabel={countriesLabel}
                searchPlaceholder={countriesSearchPlaceholder}
                selectAllButtonLabel={countriesSelectAllButtonLabel}
                clearAllButtonLabel={countriesClearAllButtonLabel}
                selectedCountLabel={countriesSelectedCountLabel}
                noResultsMessage={countriesNoResultsMessage}
                removeChipButtonLabel={countriesRemoveChipButtonLabel}
              />
            )}
          />
        </FormField>
      )}

      <Controller
        control={control}
        name="attachments"
        render={({ field }) => {
          const pdfAttachments = (field.value ?? []).filter(
            (attachment) => attachment.fileType === "application/pdf"
          );

          return (
            <div className="flex flex-col gap-3">
              <AttachmentField
                id="announcement-attachments"
                value={field.value ?? []}
                onChange={field.onChange}
                label={attachmentsLabel}
                hint={attachmentsHint}
                removeButtonLabel={attachmentsRemoveButtonLabel}
                sizeExceededMessage={attachmentsSizeExceededMessage}
                typeNotAllowedMessage={attachmentsTypeNotAllowedMessage}
                countExceededMessage={attachmentsCountExceededMessage}
                readFailedMessage={attachmentsReadFailedMessage}
              />
              {pdfAttachments.map((attachment) => (
                <PdfViewer
                  key={attachment.id}
                  variant="upload"
                  dataUrl={attachment.dataUrl}
                  title={attachment.fileName}
                  downloadFileName={attachment.fileName}
                  downloadLinkLabel={downloadLinkLabel}
                />
              ))}
            </div>
          );
        }}
      />

      <Controller
        control={control}
        name="linkedDocumentIds"
        render={({ field }) => {
          const selectedIds = field.value ?? [];
          const selectedDocuments = selectedIds
            .map((id) => documentOptions.find((document) => document.id === id))
            .filter((document): document is Document => document !== undefined);

          return (
            <FormField label={linkedDocumentsLabel} htmlFor="announcement-linked-documents-button">
              <div className="flex flex-col gap-2">
                {selectedDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {linkedDocumentsEmptyMessage}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {selectedDocuments.map((document) => (
                      <li
                        key={document.id}
                        className="flex items-center gap-2 rounded-md border border-input p-2 text-sm"
                      >
                        <span className="max-w-[12rem] truncate">
                          {document.title}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`${linkedDocumentRemoveButtonLabel}: ${document.title}`}
                          onClick={() =>
                            field.onChange(
                              selectedIds.filter((id) => id !== document.id)
                            )
                          }
                        >
                          {linkedDocumentRemoveButtonLabel}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  id="announcement-linked-documents-button"
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setIsDocumentDialogOpen(true)}
                >
                  {linkedDocumentsPickButtonLabel}
                </Button>
                {selectedDocuments.map((document) =>
                  document.sourceType === "google" ? (
                    <PdfViewer
                      key={document.id}
                      variant="google"
                      embedUrl={document.googleEmbedUrl}
                      title={document.title}
                      originalUrl={document.googleUrl}
                      openOriginalLabel={openOriginalLinkLabel}
                    />
                  ) : (
                    <PdfViewer
                      key={document.id}
                      variant="upload"
                      dataUrl={document.dataUrl}
                      title={document.title}
                      downloadFileName={document.fileName}
                      downloadLinkLabel={downloadLinkLabel}
                    />
                  )
                )}
              </div>
              <AnnouncementDocumentLinkDialog
                open={isDocumentDialogOpen}
                onOpenChange={setIsDocumentDialogOpen}
                documentOptions={documentOptions}
                selectedIds={selectedIds}
                onConfirm={field.onChange}
                maxCount={ATTACHMENT_MAX_COUNT}
                dialogTitle={linkedDocumentsDialogTitle}
                confirmButtonLabel={linkedDocumentsDialogConfirmLabel}
                cancelButtonLabel={linkedDocumentsDialogCancelLabel}
                noDocumentsMessage={linkedDocumentsDialogNoDocumentsMessage}
                targetingAllLabel={linkedDocumentsTargetingAllLabel}
                targetingCountriesPrefixLabel={linkedDocumentsTargetingCountriesPrefixLabel}
                targetingCompaniesPrefixLabel={linkedDocumentsTargetingCompaniesPrefixLabel}
              />
            </FormField>
          );
        }}
      />

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
