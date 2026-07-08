"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  createDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import {
  documentFormSchema,
  type DocumentFormValues,
} from "@/lib/validation/document";

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
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  targetingCompaniesOption: string;
  countriesLabel: string;
  companiesLabel: string;
  fileLabel: string;
  fileHint: string;
  removeFileButtonLabel: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  countriesRequiredErrorMessage: string;
  companiesRequiredErrorMessage: string;
  fileRequiredErrorMessage: string;
  sizeExceededMessage: string;
  typeNotAllowedMessage: string;
  readFailedMessage: string;
  requiredIndicator: string;
  submitErrorMessage: string;
}

const EMPTY_FILE_VALUES = {
  fileName: "",
  fileType: "" as DocumentFormValues["fileType"],
  fileSize: 0,
  dataUrl: "",
};

/**
 * ドキュメントの新規作成・編集で共用するフォーム。公開範囲の選択
 * （全体公開/特定の国・地域/特定の販社）とPDFファイルの選択を含む。
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
  targetingLabel,
  targetingAllOption,
  targetingCountriesOption,
  targetingCompaniesOption,
  countriesLabel,
  companiesLabel,
  fileLabel,
  fileHint,
  removeFileButtonLabel,
  submitButtonLabel,
  requiredErrorMessage,
  countriesRequiredErrorMessage,
  companiesRequiredErrorMessage,
  fileRequiredErrorMessage,
  sizeExceededMessage,
  typeNotAllowedMessage,
  readFailedMessage,
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
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: defaultValues ?? {
      title: "",
      description: "",
      targeting: { scope: "all" },
      ...EMPTY_FILE_VALUES,
    },
  });

  const scopeOptions: SelectOption[] = [
    { value: "all", label: targetingAllOption },
    { value: "countries", label: targetingCountriesOption },
    { value: "companies", label: targetingCompaniesOption },
  ];
  const scope = watch("targeting.scope");
  const [fileName, fileType, fileSize, dataUrl] = watch([
    "fileName",
    "fileType",
    "fileSize",
    "dataUrl",
  ]);
  const currentFile: DocumentFileValue | null = fileName
    ? { fileName, fileType, fileSize, dataUrl }
    : null;

  function handleFileChange(file: DocumentFileValue | null) {
    if (file) {
      setValue("fileName", file.fileName, { shouldValidate: true });
      setValue("fileType", file.fileType as DocumentFormValues["fileType"], {
        shouldValidate: true,
      });
      setValue("fileSize", file.fileSize, { shouldValidate: true });
      setValue("dataUrl", file.dataUrl, { shouldValidate: true });
    } else {
      setValue("fileName", EMPTY_FILE_VALUES.fileName, { shouldValidate: true });
      setValue("fileType", EMPTY_FILE_VALUES.fileType, { shouldValidate: true });
      setValue("fileSize", EMPTY_FILE_VALUES.fileSize, { shouldValidate: true });
      setValue("dataUrl", EMPTY_FILE_VALUES.dataUrl, { shouldValidate: true });
    }
  }

  async function onSubmit(values: DocumentFormValues) {
    setHasSubmitError(false);
    try {
      if (mode === "edit" && documentId) {
        await updateDocumentAction(documentId, values);
      } else {
        await createDocumentAction(values);
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
                  event.target.value as DocumentFormValues["targeting"]["scope"]
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
