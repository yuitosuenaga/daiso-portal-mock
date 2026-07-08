"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/features/inquiry-form/FormField";
import { Input } from "@/components/ui/input";
import type { LoginActionResult } from "@/lib/actions/auth";

const loginFormSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export interface LoginFormProps {
  role: "applicant" | "helpdesk";
  locale: string;
  loginAction: (input: {
    email: string;
    password: string;
    locale: string;
  }) => Promise<LoginActionResult>;
}

export function LoginForm({ role, locale, loginAction }: LoginFormProps) {
  const t = useTranslations("login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await loginAction({ ...values, locale });
      if (result?.error) {
        setErrorMessage(t("errorInvalidCredentials"));
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">
        {role === "applicant" ? t("applicantTitle") : t("helpdeskTitle")}
      </h1>

      {errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <FormField
        label={t("emailLabel")}
        htmlFor="email"
        error={errors.email ? t("validation.emailRequired") : undefined}
      >
        <Input
          id="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        label={t("passwordLabel")}
        htmlFor="password"
        error={errors.password ? t("validation.passwordRequired") : undefined}
      >
        <Input
          id="password"
          type="password"
          placeholder={t("passwordPlaceholder")}
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
