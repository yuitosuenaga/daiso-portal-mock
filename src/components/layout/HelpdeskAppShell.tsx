import { HelpdeskHeader } from "./HelpdeskHeader";

interface HelpdeskAppShellProps {
  children: React.ReactNode;
}

export function HelpdeskAppShell({ children }: HelpdeskAppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <HelpdeskHeader />
      <main className="pt-16 min-h-screen">
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
