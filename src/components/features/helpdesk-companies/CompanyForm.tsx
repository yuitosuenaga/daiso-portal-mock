"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { companyFormSchema, type CompanyFormValues } from "@/lib/validation/company";
import { createCompanyAction, updateCompanyAction } from "@/lib/actions/companies";

export interface CompanyFormProps {
  mode: "create" | "edit";
  companyId?: string;
  defaultValues?: CompanyFormValues;
  countryOptions: SelectOption[];
  nameLabel: string;
  namePlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  companyCodeLabel: string;
  companyCodePlaceholder: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  companyCodeDuplicateMessage: string;
  submitErrorMessage: string;
}

/**
 * 販社（Company）の新規作成・編集で共用するフォーム。`FaqForm`と同じ構造パターンを踏襲する。
 * 販社コードの重複エラーはServer Action側から送出されるメッセージを識別して
 * `companyCode`フィールドにエラー表示する（要件2.3・3.3）。
 */
export function CompanyForm({
  mode,
  companyId,
  defaultValues,
  countryOptions,
  nameLabel,
  namePlaceholder,
  countryLabel,
  countryPlaceholder,
  companyCodeLabel,
  companyCodePlaceholder,
  submitButtonLabel,
  requiredErrorMessage,
  companyCodeDuplicateMessage,
  submitErrorMessage,
}: CompanyFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      country: "" as unknown as CompanyFormValues["country"],
      companyCode: "",
    },
  });

  async function onSubmit(values: CompanyFormValues) {
    setHasSubmitError(false);
    try {
      const saved =
        mode === "edit" && companyId
          ? await updateCompanyAction(companyId, values)
          : await createCompanyAction(values);
      router.push(`/helpdesk/companies/${saved.id}`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Company code already taken")
      ) {
        setError("companyCode", {
          type: "duplicate",
          message: companyCodeDuplicateMessage,
        });
        return;
      }
      setHasSubmitError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={nameLabel}
        htmlFor="company-name"
        error={errors.name ? requiredErrorMessage : undefined}
      >
        <Input
          id="company-name"
          placeholder={namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        label={countryLabel}
        htmlFor="company-country"
        error={errors.country ? requiredErrorMessage : undefined}
      >
        <Select
          id="company-country"
          options={countryOptions}
          placeholder={countryPlaceholder}
          aria-invalid={errors.country ? true : undefined}
          {...register("country")}
        />
      </FormField>

      <FormField
        label={companyCodeLabel}
        htmlFor="company-code"
        error={
          errors.companyCode
            ? errors.companyCode.type === "duplicate"
              ? errors.companyCode.message
              : requiredErrorMessage
            : undefined
        }
      >
        <Input
          id="company-code"
          placeholder={companyCodePlaceholder}
          aria-invalid={errors.companyCode ? true : undefined}
          {...register("companyCode")}
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
