"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      {/* タブレット幅でサイドバーをコンパクト表示、PC幅で展開 */}
      <div className="hidden md:block">
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </div>
      {/* サイドバートグルボタン（タブレット幅のみ表示） */}
      <button
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        className="hidden md:flex lg:hidden fixed top-14 left-0 z-20 w-16 items-center justify-center py-2 text-muted-foreground hover:text-foreground border-r border-border bg-white"
        aria-label={isSidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        aria-expanded={!isSidebarCollapsed}
        aria-controls="sidebar"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      <main
        className={[
          "pt-14 min-h-screen transition-all duration-200",
          // モバイル: サイドバーなし（全幅）
          "pl-0",
          // タブレット: サイドバーの実際の幅（アイコン幅 or 展開幅）に追従
          isSidebarCollapsed ? "md:pl-16" : "md:pl-60",
          // PC: 常に展開幅(w-60=240px)分のpadding
          "lg:pl-60",
        ].join(" ")}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
