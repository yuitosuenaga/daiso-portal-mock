import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { LoginSwitchLink } from "@/components/features/auth/LoginSwitchLink";
import { helpdeskLoginAction } from "@/lib/actions/auth";

interface HelpdeskLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function HelpdeskLoginPage({
  params,
}: HelpdeskLoginPageProps) {
  const { locale } = await params;
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
        />
      </div>
    </div>
  );
}
