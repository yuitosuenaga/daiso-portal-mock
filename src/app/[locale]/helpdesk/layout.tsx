import { HelpdeskAppShell } from "@/components/layout/HelpdeskAppShell";

interface HelpdeskLayoutProps {
  children: React.ReactNode;
}

export default function HelpdeskLayout({ children }: HelpdeskLayoutProps) {
  return <HelpdeskAppShell>{children}</HelpdeskAppShell>;
}
