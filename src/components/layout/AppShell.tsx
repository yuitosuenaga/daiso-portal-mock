import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      <main className="pt-16 min-h-screen">
        <div className="mx-auto max-w-screen-2xl p-4">{children}</div>
      </main>
    </div>
  );
}
