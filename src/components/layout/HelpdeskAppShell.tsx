"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HelpdeskHeader } from "./HelpdeskHeader";
import { HelpdeskSidebar } from "./HelpdeskSidebar";

interface HelpdeskAppShellProps {
  children: React.ReactNode;
}

export function HelpdeskAppShell({ children }: HelpdeskAppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HelpdeskHeader />
      <div className="hidden md:block">
        <HelpdeskSidebar isCollapsed={isSidebarCollapsed} />
      </div>
      <button
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        className="hidden md:flex lg:hidden fixed top-16 left-0 z-20 w-16 items-center justify-center py-2 text-sidebar-foreground hover:text-white bg-sidebar"
        aria-label={isSidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        aria-expanded={!isSidebarCollapsed}
        aria-controls="helpdesk-sidebar"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      <main
        className={[
          "pt-16 min-h-screen transition-all duration-200",
          "pl-0",
          isSidebarCollapsed ? "md:pl-16" : "md:pl-60",
          "lg:pl-60",
        ].join(" ")}
      >
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
