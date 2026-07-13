import { LoginForm } from "@/components/features/auth/LoginForm";
import { helpdeskLoginAction } from "@/lib/actions/auth";

interface HelpdeskLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function HelpdeskLoginPage({
  params,
}: HelpdeskLoginPageProps) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
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
