import { AppShell } from "@/components/layout/AppShell";

interface ApplicantLayoutProps {
  children: React.ReactNode;
}

export default function ApplicantLayout({ children }: ApplicantLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
