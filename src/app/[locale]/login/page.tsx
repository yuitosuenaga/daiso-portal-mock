import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { LoginSwitchLink } from "@/components/features/auth/LoginSwitchLink";
import { applicantLoginAction, googleLoginAction } from "@/lib/actions/auth";
import { parseGoogleLoginError } from "@/lib/auth/google-login-policy";
import { isGoogleLoginEnabled } from "@/lib/server/google-login-config";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ googleError?: string | string[] }>;
}

export default async function ApplicantLoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <LoginSwitchLink
        targetHref="/helpdesk/login"
        label={t("switchToHelpdeskLogin")}
      />
      <div className="w-full max-w-sm">
        <LoginForm
          role="applicant"
          locale={locale}
          loginAction={applicantLoginAction}
          googleLoginAction={
            isGoogleLoginEnabled()
              ? googleLoginAction.bind(null, { portal: "applicant", locale })
              : undefined
          }
          googleError={parseGoogleLoginError(searchParams?.googleError)}
        />
      </div>
    </div>
  );
}
