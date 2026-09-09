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
import { createManualAction, updateManualAction } from "@/lib/actions/manuals";
import {
  manualFormSchema,
  type ManualFormValues,
  type ManualSubmitValues,
} from "@/lib/validation/manual";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type { CreateManualInput, ManualCategory } from "@/types/manual";

type UploadFormValues = Extract<ManualFormValues, { sourceType: "upload" }>;

/**
 * `react-hook-form`が扱う内部フォーム状態の型。`manualFormSchema`（`sourceType`による
 * 判別可能ユニオン型）をそのまま`useForm`のジェネリクスに使うと`watch`/`errors`が分岐後の
 * フィールドにアクセスできなくなるため、両分岐のフィールドを常に保持するフラットな型を用いる
 * （`DocumentForm.tsx`の`DocumentFormFieldValues`と同型の対処）。マニュアルはja/en固定の
 * 2言語のみのため、`documents`specの`translations`（任意追加言語）配列は持たない。
 */
interface ManualFormFieldValues {
  sourceType: "upload" | "google";
  title: string;
  description?: string;
  titleEn: string;
  descriptionEn?: string;
  category: ManualCategory;
  year: number;
  month: number;
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
  fileType: "" as ManualFormFieldValues["fileType"],
  fileSize: 0,
  dataUrl: "",
};

const EMPTY_GOOGLE_VALUES = {
  googleUrl: "",
  googleEmbedUrl: "",
};

function toFieldValues(values: ManualFormValues): ManualFormFieldValues {
  const base = {
    title: values.title,
    description: values.description,
    titleEn: values.titleEn ?? "",
    descriptionEn: values.descriptionEn,
    category: values.category as ManualCategory,
    year: values.year,
    month: values.month,
    targeting: values.targeting,
  };

  if (values.sourceType === "google") {
    return {
      ...base,
      sourceType: "google",
      ...EMPTY_UPLOAD_VALUES,
      googleUrl: values.googleUrl,
      googleEmbedUrl: values.googleEmbedUrl,
    };
  }

  return {
    ...base,
    sourceType: "upload",
    fileName: values.fileName,
    fileType: values.fileType,
    fileSize: values.fileSize,
    dataUrl: values.dataUrl,
    ...EMPTY_GOOGLE_VALUES,
  };
}

export interface ManualFormProps {
  mode: "create" | "edit";
  manualId?: string;
  defaultValues?: ManualFormValues;
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  categoryOptions: SelectOption[];
  monthOptions: SelectOption[];
  categoryLabel: string;
  categoryPlaceholderOption: string;
  categoryRequiredErrorMessage: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  languageJaTabLabel: string;
  languageEnTabLabel: string;
  yearLabel: string;
  monthLabel: string;
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

/**
 * マニュアルの新規作成・編集で共用するフォーム。タイトル・説明（ja/en）、カテゴリ、対象年月、
 * 登録方式（ファイルをアップロード/Googleドキュメントの共有リンクを登録）に応じたファイル選択
 * またはURL入力、公開範囲の選択を含む（`documents`specの`DocumentForm`・`monthly-material`specの
 * `MonthlyMaterialForm`を組み合わせた構成）。
 */
export function ManualForm({
  mode,
  manualId,
  defaultValues,
  countryOptions,
  companyOptions,
  categoryOptions,
  monthOptions,
  categoryLabel,
  categoryPlaceholderOption,
  categoryRequiredErrorMessage,
  titleLabel,
  titlePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  languageJaTabLabel,
  languageEnTabLabel,
  yearLabel,
  monthLabel,
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
}: ManualFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<"ja" | "en">("ja");
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ManualFormFieldValues, unknown, ManualSubmitValues>({
    // `manualFormSchema`は`sourceType`による判別可能ユニオン型を検証・出力するが、フォーム内部
    // 状態は上記の理由でフラットな型を使うため、resolverの型を明示的に合わせる。実行時の検証・
    // 整形は`manualFormSchema`がそのまま行うため安全性は損なわれない。
    resolver: zodResolver(manualFormSchema) as unknown as Resolver<
      ManualFormFieldValues,
      unknown,
      ManualSubmitValues
    >,
    defaultValues:
      defaultValues !== undefined
        ? toFieldValues(defaultValues)
        : {
            sourceType: "upload",
            title: "",
            description: "",
            titleEn: "",
            descriptionEn: "",
            category: categoryOptions[0]?.value as ManualCategory,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            targeting: { scope: "all" },
            ...EMPTY_UPLOAD_VALUES,
            ...EMPTY_GOOGLE_VALUES,
          },
  });

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
      setValue("fileType", file.fileType as ManualFormFieldValues["fileType"], {
        shouldValidate: true,
      });
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

  async function onSubmit(values: ManualSubmitValues) {
    setHasSubmitError(false);
    try {
      // `manualFormSchema`が`sourceType`に応じて正しい形へ再検証・整形するため、変換済みの
      // フォーム値をそのまま渡してよい（サーバー側でも同一スキーマで再検証する）。
      const input = values as unknown as CreateManualInput;
      if (mode === "edit" && manualId) {
        await updateManualAction(manualId, input);
      } else {
        await createManualAction(input);
      }
      router.push("/helpdesk/manuals");
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
        </div>

        {activeLanguageTab === "ja" && (
          <div className="flex flex-col gap-4">
            <FormField
              label={titleLabel}
              required
              requiredIndicator={requiredIndicator}
              htmlFor="manual-title"
              error={errors.title ? requiredErrorMessage : undefined}
            >
              <Input
                id="manual-title"
                placeholder={titlePlaceholder}
                aria-invalid={errors.title ? true : undefined}
                {...register("title")}
              />
            </FormField>
            <FormField label={descriptionLabel} htmlFor="manual-description">
              <Textarea
                id="manual-description"
                placeholder={descriptionPlaceholder}
                rows={3}
                {...register("description")}
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
              htmlFor="manual-title-en"
              error={errors.titleEn ? requiredErrorMessage : undefined}
            >
              <Input
                id="manual-title-en"
                placeholder={titlePlaceholder}
                aria-invalid={errors.titleEn ? true : undefined}
                {...register("titleEn")}
              />
            </FormField>
            <FormField label={descriptionLabel} htmlFor="manual-description-en">
              <Textarea
                id="manual-description-en"
                placeholder={descriptionPlaceholder}
                rows={3}
                {...register("descriptionEn")}
              />
            </FormField>
          </div>
        )}
      </div>

      <FormField
        label={categoryLabel}
        required
        requiredIndicator={requiredIndicator}
        htmlFor="manual-category"
        error={errors.category ? categoryRequiredErrorMessage : undefined}
      >
        <Select
          id="manual-category"
          options={
            categoryOptions.length > 0
              ? categoryOptions
              : [{ value: "", label: categoryPlaceholderOption }]
          }
          aria-invalid={errors.category ? true : undefined}
          {...register("category")}
        />
      </FormField>

      <div className="flex gap-4">
        <FormField
          label={yearLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="manual-year"
          error={errors.year ? requiredErrorMessage : undefined}
          className="flex-1"
        >
          <Controller
            control={control}
            name="year"
            render={({ field }) => (
              <Input
                id="manual-year"
                type="number"
                value={field.value}
                aria-invalid={errors.year ? true : undefined}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </FormField>

        <FormField
          label={monthLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="manual-month"
          error={errors.month ? requiredErrorMessage : undefined}
          className="flex-1"
        >
          <Controller
            control={control}
            name="month"
            render={({ field }) => (
              <Select
                id="manual-month"
                options={monthOptions}
                value={String(field.value)}
                aria-invalid={errors.month ? true : undefined}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label={sourceTypeLabel} htmlFor="manual-source-type">
        <Select
          id="manual-source-type"
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

      <FormField label={targetingLabel} htmlFor="manual-targeting-scope">
        <Controller
          control={control}
          name="targeting.scope"
          render={({ field }) => (
            <Select
              id="manual-targeting-scope"
              options={scopeOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as ManualFormFieldValues["targeting"]["scope"]
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
          htmlFor="manual-targeting-countries"
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
                id="manual-targeting-countries"
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
                    Array.from(event.target.selectedOptions, (option) => option.value)
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
          htmlFor="manual-targeting-companies"
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
                id="manual-targeting-companies"
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
                    Array.from(event.target.selectedOptions, (option) => option.value)
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
