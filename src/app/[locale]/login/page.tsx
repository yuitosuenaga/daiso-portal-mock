import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { LoginSwitchLink } from "@/components/features/auth/LoginSwitchLink";
import { applicantLoginAction } from "@/lib/actions/auth";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApplicantLoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
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
        />
      </div>
    </div>
  );
}
