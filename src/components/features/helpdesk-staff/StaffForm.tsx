"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { createHelpdeskStaffAction } from "@/lib/actions/helpdesk-staff";
import { useNavigateAfterSubmit } from "@/lib/hooks/use-navigate-after-submit";
import {
  helpdeskStaffCreateFormSchema,
  type HelpdeskStaffCreateFormInput,
  type HelpdeskStaffCreateFormValues,
} from "@/lib/validation/helpdesk-staff";

export interface StaffFormProps {
  emailLabel: string;
  emailPlaceholder: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordHint: string;
  roleLabel: string;
  roleOptions: SelectOption[];
  submitButtonLabel: string;
  requiredErrorMessage: string;
  emailInvalidMessage: string;
  emailDuplicateMessage: string;
  passwordTooShortMessage: string;
  submitErrorMessage: string;
}

/**
 * スタッフの新規作成フォーム。パスワードは任意（空欄=Googleログイン専用）。
 * メールアドレスの重複はServer Actionの`reason: "emailTaken"`をメール欄のエラーとして表示する。
 */
export function StaffForm({
  emailLabel,
  emailPlaceholder,
  displayNameLabel,
  displayNamePlaceholder,
  passwordLabel,
  passwordPlaceholder,
  passwordHint,
  roleLabel,
  roleOptions,
  submitButtonLabel,
  requiredErrorMessage,
  emailInvalidMessage,
  emailDuplicateMessage,
  passwordTooShortMessage,
  submitErrorMessage,
}: StaffFormProps) {
  const { navigate, isNavigating, isNavigationLocked } = useNavigateAfterSubmit();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<HelpdeskStaffCreateFormInput, unknown, HelpdeskStaffCreateFormValues>({
    resolver: zodResolver(helpdeskStaffCreateFormSchema) as Resolver<
      HelpdeskStaffCreateFormInput,
      unknown,
      HelpdeskStaffCreateFormValues
    >,
    defaultValues: { email: "", displayName: "", password: "", role: "member" },
  });

  async function onSubmit(values: HelpdeskStaffCreateFormValues) {
    if (isNavigationLocked()) return;
    setHasSubmitError(false);
    try {
      const result = await createHelpdeskStaffAction(values);
      if (!result.ok) {
        // 保存失敗時もパスワードの平文をフォーム上に残さない。
        resetField("password");
        if (result.reason === "emailTaken") {
          setError("email", { type: "duplicate", message: emailDuplicateMessage });
        } else {
          setHasSubmitError(true);
        }
        return;
      }
      resetField("password");
      navigate("/helpdesk/staff");
    } catch {
      resetField("password");
      setHasSubmitError(true);
    }
  }

  function emailErrorMessage() {
    if (!errors.email) return undefined;
    if (errors.email.type === "duplicate") return errors.email.message;
    return emailInvalidMessage;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label={emailLabel} htmlFor="staff-email" error={emailErrorMessage()}>
        <Input
          id="staff-email"
          type="email"
          placeholder={emailPlaceholder}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        label={displayNameLabel}
        htmlFor="staff-display-name"
        error={errors.displayName ? requiredErrorMessage : undefined}
      >
        <Input
          id="staff-display-name"
          placeholder={displayNamePlaceholder}
          aria-invalid={errors.displayName ? true : undefined}
          {...register("displayName")}
        />
      </FormField>

      <FormField
        label={passwordLabel}
        htmlFor="staff-password"
        error={errors.password ? passwordTooShortMessage : undefined}
      >
        <Input
          id="staff-password"
          type="password"
          autoComplete="new-password"
          placeholder={passwordPlaceholder}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="staff-password-hint"
          {...register("password")}
        />
        <p id="staff-password-hint" className="text-sm text-muted-foreground">
          {passwordHint}
        </p>
      </FormField>

      <FormField label={roleLabel} htmlFor="staff-role">
        <Select id="staff-role" options={roleOptions} {...register("role")} />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || isNavigating}>
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
