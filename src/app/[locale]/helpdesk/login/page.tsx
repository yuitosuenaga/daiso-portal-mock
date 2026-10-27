import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { LoginSwitchLink } from "@/components/features/auth/LoginSwitchLink";
import { helpdeskLoginAction, googleLoginAction } from "@/lib/actions/auth";
import { parseGoogleLoginError } from "@/lib/auth/google-login-policy";
import { isGoogleLoginEnabled } from "@/lib/server/google-login-config";

interface HelpdeskLoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ googleError?: string | string[] }>;
}

export default async function HelpdeskLoginPage(props: HelpdeskLoginPageProps) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <LoginSwitchLink
        targetHref="/login"
        label={t("switchToApplicantLogin")}
      />
      <div className="w-full max-w-sm">
        <LoginForm
          role="helpdesk"
          locale={locale}
          loginAction={helpdeskLoginAction}
          googleLoginAction={
            isGoogleLoginEnabled()
              ? googleLoginAction.bind(null, { portal: "helpdesk", locale })
              : undefined
          }
          googleError={parseGoogleLoginError(searchParams?.googleError)}
        />
      </div>
    </div>
  );
}
