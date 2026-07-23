"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { APPLICANT_NAV_ITEMS, resolveActiveHref } from "./nav-items";

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname, APPLICANT_NAV_ITEMS, "/");

  return (
    <aside
      id="sidebar"
      aria-label={t("sidebarLabel")}
      className={cn(
        "fixed top-16 left-0 bottom-0 z-20 flex flex-col bg-sidebar transition-all duration-200",
        isCollapsed ? "w-16" : "w-60",
        // PC: 常に展開幅（タブレットでの折りたたみ状態に関わらず）
        "lg:w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {APPLICANT_NAV_ITEMS.map((item) => {
            const isActive = item.href === activeHref;
            const Icon = item.icon;

            return (
              <li key={item.translationKey}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2.5 text-base transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={isCollapsed ? t(item.translationKey) : undefined}
                >
                  <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <span
                    className={cn(
                      "truncate",
                      // タブレット幅で折りたたみ中はラベルを隠すが、PC幅（lg以上）では常に表示する
                      isCollapsed && "hidden lg:inline"
                    )}
                  >
                    {t(item.translationKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
