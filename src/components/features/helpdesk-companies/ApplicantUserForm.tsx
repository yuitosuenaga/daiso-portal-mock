"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "@/i18n/navigation";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  applicantUserCreateFormSchema,
  applicantUserUpdateFormSchema,
  type ApplicantUserCreateFormValues,
  type ApplicantUserUpdateFormValues,
} from "@/lib/validation/applicant-user";
import {
  createApplicantUserAction,
  updateApplicantUserAction,
} from "@/lib/actions/applicant-users";

type ApplicantUserFormValues = ApplicantUserCreateFormValues | ApplicantUserUpdateFormValues;

export interface ApplicantUserFormProps {
  mode: "create" | "edit";
  companyId: string;
  applicantUserId?: string;
  defaultValues?: { email: string; displayName: string };
  emailLabel: string;
  emailPlaceholder: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordHint: string;
  submitButtonLabel: string;
  requiredErrorMessage: string;
  emailInvalidMessage: string;
  emailDuplicateMessage: string;
  passwordTooShortMessage: string;
  submitErrorMessage: string;
}

/**
 * 申請者アカウント（ApplicantUser）の新規作成・編集で共用するフォーム。
 * `FaqForm`と同じ構造パターンを踏襲する。新規作成時はパスワード必須、編集時は
 * 空欄で既存パスワードを保持する任意入力とする（要件5・6）。
 * メールアドレスの重複エラーはServer Action側から送出されるメッセージを識別して
 * `email`フィールドにエラー表示する（要件5.3・6.3）。
 */
export function ApplicantUserForm({
  mode,
  companyId,
  applicantUserId,
  defaultValues,
  emailLabel,
  emailPlaceholder,
  displayNameLabel,
  displayNamePlaceholder,
  passwordLabel,
  passwordPlaceholder,
  passwordHint,
  submitButtonLabel,
  requiredErrorMessage,
  emailInvalidMessage,
  emailDuplicateMessage,
  passwordTooShortMessage,
  submitErrorMessage,
}: ApplicantUserFormProps) {
  const router = useRouter();
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const schema =
    mode === "create" ? applicantUserCreateFormSchema : applicantUserUpdateFormSchema;
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicantUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: defaultValues?.email ?? "",
      displayName: defaultValues?.displayName ?? "",
      password: "",
    },
  });

  async function onSubmit(values: ApplicantUserFormValues) {
    setHasSubmitError(false);
    try {
      if (mode === "edit" && applicantUserId) {
        await updateApplicantUserAction(applicantUserId, values);
      } else {
        await createApplicantUserAction(companyId, {
          email: values.email,
          displayName: values.displayName,
          password: values.password ?? "",
        });
      }
      // 保存操作の完了後、パスワード入力欄をフォーム・画面上に残さない（要件5.9）。
      reset({ email: values.email, displayName: values.displayName, password: "" });
      router.push(`/helpdesk/companies/${companyId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Email already taken")) {
        setError("email", { type: "duplicate", message: emailDuplicateMessage });
        return;
      }
      setHasSubmitError(true);
    }
  }

  function emailErrorMessage() {
    if (!errors.email) return undefined;
    if (errors.email.type === "duplicate") return errors.email.message;
    return emailInvalidMessage;
  }

  function passwordErrorMessage() {
    return errors.password ? passwordTooShortMessage : undefined;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={emailLabel}
        htmlFor="applicant-user-email"
        error={emailErrorMessage()}
      >
        <Input
          id="applicant-user-email"
          type="email"
          placeholder={emailPlaceholder}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        label={displayNameLabel}
        htmlFor="applicant-user-display-name"
        error={errors.displayName ? requiredErrorMessage : undefined}
      >
        <Input
          id="applicant-user-display-name"
          placeholder={displayNamePlaceholder}
          aria-invalid={errors.displayName ? true : undefined}
          {...register("displayName")}
        />
      </FormField>

      <FormField
        label={passwordLabel}
        htmlFor="applicant-user-password"
        error={passwordErrorMessage()}
      >
        <Input
          id="applicant-user-password"
          type="password"
          autoComplete="new-password"
          placeholder={passwordPlaceholder}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="applicant-user-password-hint"
          {...register("password")}
        />
        <p id="applicant-user-password-hint" className="text-sm text-muted-foreground">
          {passwordHint}
        </p>
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
