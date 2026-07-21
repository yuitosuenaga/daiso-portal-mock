import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import {
  UnauthorizedSessionError,
  requireApplicantSession,
} from "@/lib/server/auth-session";

interface ApplicantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * 申請者側の全画面に共通するレイアウト。ミドルウェアによるルート保護（JWTセッションの
 * role検証）に加え、ヘルプデスク担当者による無効化後も既存のJWTセッションでアクセスが
 * 継続してしまうことを防ぐため、`requireApplicantSession`（内部で`ApplicantUser.isActive`
 * をDB再照会する）が失敗した場合はログイン画面へリダイレクトする（多層防御）。
 */
export default async function ApplicantLayout({
  children,
  params,
}: ApplicantLayoutProps) {
  const { locale } = await params;

  try {
    await requireApplicantSession();
  } catch (error) {
    if (error instanceof UnauthorizedSessionError) {
      redirect(`/${locale}/login`);
    }
    throw error;
  }

  return <AppShell>{children}</AppShell>;
}
