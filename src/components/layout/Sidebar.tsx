"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  FilePlus,
  List,
  Bell,
  Link2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  translationKey:
    | "dashboard"
    | "inquiryForm"
    | "inquiryList"
    | "announcements"
    | "links"
    | "faq";
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { translationKey: "dashboard", href: "/", icon: LayoutDashboard },
  { translationKey: "inquiryForm", href: "/inquiry/new", icon: FilePlus },
  { translationKey: "inquiryList", href: "/inquiry", icon: List },
  { translationKey: "announcements", href: "/announcements", icon: Bell },
  { translationKey: "links", href: "/links", icon: Link2 },
  { translationKey: "faq", href: "/faq", icon: HelpCircle },
];

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside
      id="sidebar"
      aria-label={t("sidebarLabel")}
      className={cn(
        "fixed top-14 left-0 bottom-0 z-20 flex flex-col bg-sidebar transition-all duration-200",
        isCollapsed ? "w-16" : "w-60",
        // PC: 常に展開幅（タブレットでの折りたたみ状態に関わらず）
        "lg:w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.translationKey}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={isCollapsed ? t(item.translationKey) : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
