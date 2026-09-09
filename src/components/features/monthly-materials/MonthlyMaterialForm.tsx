"use client";

import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Select, type SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DocumentFileField,
  type DocumentFileValue,
} from "@/components/features/helpdesk-documents/DocumentFileField";
import { DocumentGoogleLinkField } from "@/components/features/helpdesk-documents/DocumentGoogleLinkField";
import {
  createMonthlyMaterialAction,
  updateMonthlyMaterialAction,
} from "@/lib/actions/monthly-materials";
import {
  monthlyMaterialFormSchema,
  type MonthlyMaterialFormValues,
  type MonthlyMaterialSubmitValues,
} from "@/lib/validation/monthly-material";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type {
  CreateMonthlyMaterialInput,
  MonthlyMaterial,
  MonthlyMaterialCategory,
  MonthlyMaterialDepartment,
} from "@/types/monthly-material";

type UploadFormValues = Extract<MonthlyMaterialFormValues, { sourceType: "upload" }>;

/**
 * `react-hook-form`が扱う内部フォーム状態の型。`monthlyMaterialFormSchema`（`sourceType`による
 * 判別可能ユニオン型）をそのまま`useForm`のジェネリクスに使うと`watch`/`errors`が分岐後の
 * フィールドにアクセスできなくなるため、両分岐のフィールドを常に保持するフラットな型を用いる
 * （`DocumentForm.tsx`の`DocumentFormFieldValues`と同型の対処）。
 */
interface MonthlyMaterialFormFieldValues {
  category: MonthlyMaterialCategory;
  department: MonthlyMaterialDepartment;
  year: number;
  month: number;
  sourceType: "upload" | "google";
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
  fileType: "" as MonthlyMaterialFormFieldValues["fileType"],
  fileSize: 0,
  dataUrl: "",
};

const EMPTY_GOOGLE_VALUES = {
  googleUrl: "",
  googleEmbedUrl: "",
};

function toFieldValues(values: MonthlyMaterialFormValues): MonthlyMaterialFormFieldValues {
  const base = {
    category: values.category as MonthlyMaterialCategory,
    department: values.department as MonthlyMaterialDepartment,
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

export interface MonthlyMaterialFormProps {
  category: MonthlyMaterialCategory;
  mode: "create" | "edit";
  materialId?: string;
  defaultValues?: MonthlyMaterialFormValues;
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  departmentLabel: string;
  departmentOptions: SelectOption[];
  yearLabel: string;
  monthLabel: string;
  monthOptions: SelectOption[];
  sourceTypeLabel: string;
  sourceTypeUploadOption: string;
  sourceTypeGoogleOption: string;
  fileLabel: string;
  fileHint: string;
  removeFileButtonLabel: string;
  googleUrlLabel: string;
  googleUrlPlaceholder: string;
  googleUrlHint: string;
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  targetingCompaniesOption: string;
  countriesLabel: string;
  companiesLabel: string;
  submitButtonLabel: string;
  cancelButtonLabel: string;
  onCancel: () => void;
  onSuccess: (material: MonthlyMaterial) => void;
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
 * 月次資料（売場検討会・POP）の新規作成・編集で共用するフォーム。年月・登録方式
 * （ファイルをアップロード/Googleドキュメントの共有リンクを登録）に応じたファイル選択
 * またはURL入力、公開範囲の選択を含む。`category`は呼び出し元ルートに対応する固定値として
 * propsから受け取り、ユーザーが変更できるUIは提供しない。
 */
export function MonthlyMaterialForm({
  category,
  mode,
  materialId,
  defaultValues,
  countryOptions,
  companyOptions,
  departmentLabel,
  departmentOptions,
  yearLabel,
  monthLabel,
  monthOptions,
  sourceTypeLabel,
  sourceTypeUploadOption,
  sourceTypeGoogleOption,
  fileLabel,
  fileHint,
  removeFileButtonLabel,
  googleUrlLabel,
  googleUrlPlaceholder,
  googleUrlHint,
  targetingLabel,
  targetingAllOption,
  targetingCountriesOption,
  targetingCompaniesOption,
  countriesLabel,
  companiesLabel,
  submitButtonLabel,
  cancelButtonLabel,
  onCancel,
  onSuccess,
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
}: MonthlyMaterialFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MonthlyMaterialFormFieldValues, unknown, MonthlyMaterialSubmitValues>({
    resolver: zodResolver(monthlyMaterialFormSchema) as unknown as Resolver<
      MonthlyMaterialFormFieldValues,
      unknown,
      MonthlyMaterialSubmitValues
    >,
    defaultValues:
      defaultValues !== undefined
        ? toFieldValues(defaultValues)
        : {
            category,
            department: "other",
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            sourceType: "upload",
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
      setValue("fileType", file.fileType as MonthlyMaterialFormFieldValues["fileType"], {
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

  async function onSubmit(values: MonthlyMaterialSubmitValues) {
    setHasSubmitError(false);
    try {
      const input = values as unknown as CreateMonthlyMaterialInput;
      const saved =
        mode === "edit" && materialId
          ? await updateMonthlyMaterialAction(materialId, input)
          : await createMonthlyMaterialAction(input);
      router.refresh();
      onSuccess(saved);
    } catch {
      setHasSubmitError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex gap-4">
        <FormField
          label={yearLabel}
          required
          requiredIndicator={requiredIndicator}
          htmlFor="monthly-material-year"
          error={errors.year ? requiredErrorMessage : undefined}
          className="flex-1"
        >
          <Controller
            control={control}
            name="year"
            render={({ field }) => (
              <Input
                id="monthly-material-year"
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
          htmlFor="monthly-material-month"
          error={errors.month ? requiredErrorMessage : undefined}
          className="flex-1"
        >
          <Controller
            control={control}
            name="month"
            render={({ field }) => (
              <Select
                id="monthly-material-month"
                options={monthOptions}
                value={String(field.value)}
                aria-invalid={errors.month ? true : undefined}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </FormField>
      </div>

      <FormField
        label={departmentLabel}
        required
        requiredIndicator={requiredIndicator}
        htmlFor="monthly-material-department"
        error={errors.department ? requiredErrorMessage : undefined}
      >
        <Controller
          control={control}
          name="department"
          render={({ field }) => (
            <Select
              id="monthly-material-department"
              options={departmentOptions}
              value={field.value}
              aria-invalid={errors.department ? true : undefined}
              onChange={(event) =>
                field.onChange(event.target.value as MonthlyMaterialFormFieldValues["department"])
              }
            />
          )}
        />
      </FormField>

      <FormField label={sourceTypeLabel} htmlFor="monthly-material-source-type">
        <Select
          id="monthly-material-source-type"
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

      <FormField label={targetingLabel} htmlFor="monthly-material-targeting-scope">
        <Controller
          control={control}
          name="targeting.scope"
          render={({ field }) => (
            <Select
              id="monthly-material-targeting-scope"
              options={scopeOptions}
              value={field.value}
              onChange={(event) =>
                field.onChange(
                  event.target.value as MonthlyMaterialFormFieldValues["targeting"]["scope"]
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
          htmlFor="monthly-material-targeting-countries"
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
                id="monthly-material-targeting-countries"
                multiple
                options={countryOptions}
                value={field.value ?? []}
                aria-invalid={
                  errors.targeting && "countries" in errors.targeting ? true : undefined
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
          htmlFor="monthly-material-targeting-companies"
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
                id="monthly-material-targeting-companies"
                multiple
                options={companyOptions}
                value={field.value ?? []}
                aria-invalid={
                  errors.targeting && "companyCodes" in errors.targeting ? true : undefined
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
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelButtonLabel}
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
