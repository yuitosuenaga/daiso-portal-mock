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
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/actions/announcements";
import {
  announcementFormSchema,
  type AnnouncementFormValues,
  type AnnouncementSubmitValues,
} from "@/lib/validation/announcement";

export interface AnnouncementFormProps {
  mode: "create" | "edit";
  announcementId?: string;
  defaultValues?: AnnouncementFormValues;
  categoryOptions: SelectOption[];
  countryOptions: SelectOption[];
  titleLabel: string;
  titlePlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  actionRequiredLabel: string;
  actionRequiredTrueOption: string;
  actionRequiredFalseOption: string;
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  countriesLabel: string;
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
  titleLabel,
  titlePlaceholder,
  bodyLabel,
  bodyPlaceholder,
  categoryLabel,
  categoryPlaceholder,
  actionRequiredLabel,
  actionRequiredTrueOption,
  actionRequiredFalseOption,
  targetingLabel,
  targetingAllOption,
  targetingCountriesOption,
  countriesLabel,
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
}: AnnouncementFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
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
      category: "" as unknown as AnnouncementFormValues["category"],
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: "",
      publishEndDate: "",
      dueDate: "",
    },
  });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          htmlFor="announcement-targeting-countries"
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
                id="announcement-targeting-countries"
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
