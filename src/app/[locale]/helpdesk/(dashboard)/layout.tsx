import { redirect } from "next/navigation";

import { HelpdeskAppShell } from "@/components/layout/HelpdeskAppShell";
import {
  UnauthorizedSessionError,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";

interface HelpdeskDashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * ヘルプデスク側ダッシュボードの共通レイアウト。無効化されたスタッフの既存JWT
 * セッションを遮断するため、`requireHelpdeskStaffSession`（内部で`HelpdeskStaff.isActive`
 * をDB再照会する）が失敗した場合はログイン画面へリダイレクトする（多層防御）。
 */
export default async function HelpdeskDashboardLayout({
  children,
  params,
}: HelpdeskDashboardLayoutProps) {
  const { locale } = await params;

  try {
    await requireHelpdeskStaffSession();
  } catch (error) {
    if (error instanceof UnauthorizedSessionError) {
      redirect(`/${locale}/helpdesk/login`);
    }
    throw error;
  }

  return <HelpdeskAppShell>{children}</HelpdeskAppShell>;
}
