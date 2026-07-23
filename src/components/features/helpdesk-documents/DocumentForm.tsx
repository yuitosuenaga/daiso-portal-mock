"use client";

import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Select, type SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DocumentFileField,
  type DocumentFileValue,
} from "@/components/features/helpdesk-documents/DocumentFileField";
import { DocumentGoogleLinkField } from "@/components/features/helpdesk-documents/DocumentGoogleLinkField";
import {
  createDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import {
  documentFormSchema,
  type DocumentFormValues,
} from "@/lib/validation/document";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type { CreateDocumentInput } from "@/types/document";

export interface DocumentFormProps {
  mode: "create" | "edit";
  documentId?: string;
  defaultValues?: DocumentFormValues;
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  statusLabel: string;
  statusDraftOption: string;
  statusPublishedOption: string;
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  targetingCompaniesOption: string;
  countriesLabel: string;
  companiesLabel: string;
  sourceTypeLabel: string;
  sourceTypeUploadOption: string;
  sourceTypeGoogleOption: string;
  fileLabel: string;
  fileHint: string;
  removeFileButtonLabel: string;
  googleUrlLabel: string;
  googleUrlPlaceholder: string;
  googleUrlHint: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  countriesRequiredErrorMessage: string;
  companiesRequiredErrorMessage: string;
  fileRequiredErrorMessage: string;
  sizeExceededMessage: string;
  typeNotAllowedMessage: string;
  readFailedMessage: string;
  googleUrlInvalidMessage: string;
  requiredIndicator: string;
  submitErrorMessage: string;
}

type UploadFormValues = Extract<DocumentFormValues, { sourceType: "upload" }>;

/**
 * `react-hook-form`が扱う内部フォーム状態の型。`documentFormSchema`（`sourceType`による
 * 判別可能ユニオン型）をそのまま`useForm`のジェネリクスに使うと、TypeScriptの`keyof`が
 * ユニオン全体ではなく共通鍵のみに縮退し、`watch`/`errors`が分岐後のフィールド
 * （`fileName`・`googleUrl`等）にアクセスできなくなる。そのため、両分岐のフィールドを
 * 常に保持するフラットな型をフォーム内部専用に用意し、送信時にServer Action側の
 * `documentFormSchema`が`sourceType`に応じて正しい形へ検証・整形する。
 */
interface DocumentFormFieldValues {
  sourceType: "upload" | "google";
  title: string;
  description?: string;
  status: "draft" | "published";
  fileName: string;
  fileType: UploadFormValues["fileType"] | "";
  fileSize: number;
  dataUrl: string;
  googleUrl: string;
  googleEmbedUrl: string;
  targeting: UploadFormValues["targeting"];
}

const EMPTY_UPLOAD_VALUES = {
  fileName: "",
  fileType: "" as DocumentFormFieldValues["fileType"],
  fileSize: 0,
  dataUrl: "",
};

const EMPTY_GOOGLE_VALUES = {
  googleUrl: "",
  googleEmbedUrl: "",
};

function toFieldValues(values: DocumentFormValues): DocumentFormFieldValues {
  if (values.sourceType === "google") {
    return {
      sourceType: "google",
      title: values.title,
      description: values.description,
      status: values.status,
      targeting: values.targeting,
      ...EMPTY_UPLOAD_VALUES,
      googleUrl: values.googleUrl,
      googleEmbedUrl: values.googleEmbedUrl,
    };
  }

  return {
    sourceType: "upload",
    title: values.title,
    description: values.description,
    status: values.status,
    targeting: values.targeting,
    fileName: values.fileName,
    fileType: values.fileType,
    fileSize: values.fileSize,
    dataUrl: values.dataUrl,
    ...EMPTY_GOOGLE_VALUES,
  };
}

/**
 * ドキュメントの新規作成・編集で共用するフォーム。公開範囲の選択
 * （全体公開/特定の国・地域/特定の販社）と、登録方法（ファイルをアップロード/
 * Googleドキュメントの共有リンクを登録）に応じたファイル選択またはURL入力を含む。
 */
export function DocumentForm({
  mode,
  documentId,
  defaultValues,
  countryOptions,
  companyOptions,
  titleLabel,
  titlePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  statusLabel,
  statusDraftOption,
  statusPublishedOption,
  targetingLabel,
  targetingAllOption,
  targetingCountriesOption,
  targetingCompaniesOption,
  countriesLabel,
  companiesLabel,
  sourceTypeLabel,
  sourceTypeUploadOption,
  sourceTypeGoogleOption,
  fileLabel,
  fileHint,
  removeFileButtonLabel,
  googleUrlLabel,
  googleUrlPlaceholder,
  googleUrlHint,
  submitButtonLabel,
  requiredErrorMessage,
  countriesRequiredErrorMessage,
  companiesRequiredErrorMessage,
  fileRequiredErrorMessage,
  sizeExceededMessage,
  typeNotAllowedMessage,
  readFailedMessage,
  googleUrlInvalidMessage,
  requiredIndicator,
  submitErrorMessage,
}: DocumentFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormFieldValues>({
    // `documentFormSchema`は`sourceType`による判別可能ユニオン型を検証・出力するが、
    // フォーム内部状態は上記の理由でフラットな型を使うため、resolverの型を明示的に合わせる。
    // 実行時の検証・整形は`documentFormSchema`がそのまま行うため安全性は損なわれない。
    resolver: zodResolver(
      documentFormSchema
    ) as unknown as Resolver<DocumentFormFieldValues>,
    defaultValues:
      defaultValues !== undefined
        ? toFieldValues(defaultValues)
        : {
            sourceType: "upload",
            title: "",
            description: "",
            status: "draft",
            targeting: { scope: "all" },
            ...EMPTY_UPLOAD_VALUES,
            ...EMPTY_GOOGLE_VALUES,
          },
  });

  const statusOptions: SelectOption[] = [
    { value: "draft", label: statusDraftOption },
    { value: "published", label: statusPublishedOption },
  ];
  const scopeOptions: SelectOption[] = [
    { value: "all", label: targetingAllOption },
    { value: "countries", label: targetingCountriesOption },
    { value: "companies", label: targetingCompaniesOption },
  ];
  const sourceTypeOptions: SelectOption[] = [
    { value: "upload", label: sourceTypeUploadOption },
    { value: "google", label: sourceTypeGoogleOption },
  ];
  const scope = watch("targeting.scope");
  const sourceType = watch("sourceType");
  const [fileName, fileType, fileSize, dataUrl] = watch([
    "fileName",
    "fileType",
    "fileSize",
    "dataUrl",
  ]);
  const googleUrl = watch("googleUrl");
  const currentFile: DocumentFileValue | null = fileName
    ? { fileName, fileType, fileSize, dataUrl }
    : null;

  function handleSourceTypeChange(nextSourceType: string) {
    if (nextSourceType === "google") {
      setValue("sourceType", "google", { shouldValidate: true });
      setValue("googleEmbedUrl", toGoogleEmbedUrl(googleUrl) ?? "", {
        shouldValidate: true,
      });
    } else {
      setValue("sourceType", "upload", { shouldValidate: true });
    }
  }

  function handleFileChange(file: DocumentFileValue | null) {
    if (file) {
      setValue("fileName", file.fileName, { shouldValidate: true });
      setValue(
        "fileType",
        file.fileType as DocumentFormFieldValues["fileType"],
        { shouldValidate: true }
      );
      setValue("fileSize", file.fileSize, { shouldValidate: true });
      setValue("dataUrl", file.dataUrl, { shouldValidate: true });
    } else {
      setValue("fileName", EMPTY_UPLOAD_VALUES.fileName, { shouldValidate: true });
      setValue("fileType", EMPTY_UPLOAD_VALUES.fileType, { shouldValidate: true });
      setValue("fileSize", EMPTY_UPLOAD_VALUES.fileSize, { shouldValidate: true });
      setValue("dataUrl", EMPTY_UPLOAD_VALUES.dataUrl, { shouldValidate: true });
    }
  }

  function handleGoogleUrlChange(nextGoogleUrl: string) {
    setValue("googleUrl", nextGoogleUrl, { shouldValidate: true });
    setValue("googleEmbedUrl", toGoogleEmbedUrl(nextGoogleUrl) ?? "", {
      shouldValidate: true,
    });
  }

  async function onSubmit(values: DocumentFormFieldValues) {
    setHasSubmitError(false);
    try {
      // `documentFormSchema`が`sourceType`に応じて正しい形へ再検証・整形するため、
      // フラットなフォーム値をそのまま渡してよい（サーバー側でも同一スキーマで再検証する）。
      const input = values as unknown as CreateDocumentInput;
      if (mode === "edit" && documentId) {
        await updateDocumentAction(documentId, input);
      } else {
        await createDocumentAction(input);
      }
      router.push("/helpdesk/documents");
    } catch {
      setHasSubmitError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={titleLabel}
        required
        requiredIndicator={requiredIndicator}
        htmlFor="document-title"
        error={errors.title ? requiredErrorMessage : undefined}
      >
        <Input
          id="document-title"
          placeholder={titlePlaceholder}
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
      </FormField>

      <FormField
        label={descriptionLabel}
        htmlFor="document-description"
      >
        <Textarea
          id="document-description"
          placeholder={descriptionPlaceholder}
          rows={3}
          {...register("description")}
        />
      </FormField>

      <FormField label={statusLabel} htmlFor="document-status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              id="document-status"
              options={statusOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as DocumentFormFieldValues["status"]
                )
              }
            />
          )}
        />
      </FormField>

      <FormField label={sourceTypeLabel} htmlFor="document-source-type">
        <Select
          id="document-source-type"
          options={sourceTypeOptions}
          value={sourceType}
          onChange={(event) => handleSourceTypeChange(event.target.value)}
        />
      </FormField>

      {sourceType === "google" ? (
        <FormField
          label={googleUrlLabel}
          required
          requiredIndicator={requiredIndicator}
          error={errors.googleUrl ? googleUrlInvalidMessage : undefined}
        >
          <DocumentGoogleLinkField
            value={googleUrl ?? ""}
            onChange={handleGoogleUrlChange}
            label={googleUrlLabel}
            hint={googleUrlHint}
            placeholder={googleUrlPlaceholder}
            invalid={Boolean(errors.googleUrl)}
          />
        </FormField>
      ) : (
        <FormField
          label={fileLabel}
          required
          requiredIndicator={requiredIndicator}
          error={errors.fileName ? fileRequiredErrorMessage : undefined}
        >
          <DocumentFileField
            value={currentFile}
            onChange={handleFileChange}
            label={fileLabel}
            hint={fileHint}
            removeButtonLabel={removeFileButtonLabel}
            sizeExceededMessage={sizeExceededMessage}
            typeNotAllowedMessage={typeNotAllowedMessage}
            readFailedMessage={readFailedMessage}
          />
        </FormField>
      )}

      <FormField label={targetingLabel} htmlFor="document-targeting-scope">
        <Controller
          control={control}
          name="targeting.scope"
          render={({ field }) => (
            <Select
              id="document-targeting-scope"
              options={scopeOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as DocumentFormFieldValues["targeting"]["scope"]
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
          htmlFor="document-targeting-countries"
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
              <Select
                id="document-targeting-countries"
                multiple
                options={countryOptions}
                value={field.value ?? []}
                aria-invalid={
                  errors.targeting && "countries" in errors.targeting
                    ? true
                    : undefined
                }
                onChange={(event) =>
                  field.onChange(
                    Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
              />
            )}
          />
        </FormField>
      )}

      {scope === "companies" && (
        <FormField
          label={companiesLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="document-targeting-companies"
          error={
            errors.targeting && "companyCodes" in errors.targeting
              ? companiesRequiredErrorMessage
              : undefined
          }
        >
          <Controller
            control={control}
            name="targeting.companyCodes"
            render={({ field }) => (
              <Select
                id="document-targeting-companies"
                multiple
                options={companyOptions}
                value={field.value ?? []}
                aria-invalid={
                  errors.targeting && "companyCodes" in errors.targeting
                    ? true
                    : undefined
                }
                onChange={(event) =>
                  field.onChange(
                    Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
              />
            )}
          />
        </FormField>
      )}

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
