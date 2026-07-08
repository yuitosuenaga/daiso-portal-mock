import { HelpdeskAppShell } from "@/components/layout/HelpdeskAppShell";

interface HelpdeskDashboardLayoutProps {
  children: React.ReactNode;
}

export default function HelpdeskDashboardLayout({
  children,
}: HelpdeskDashboardLayoutProps) {
  return <HelpdeskAppShell>{children}</HelpdeskAppShell>;
}
