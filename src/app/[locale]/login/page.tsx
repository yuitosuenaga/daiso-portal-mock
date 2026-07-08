import { LoginForm } from "@/components/features/auth/LoginForm";
import { applicantLoginAction } from "@/lib/actions/auth";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApplicantLoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
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
