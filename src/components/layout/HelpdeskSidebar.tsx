"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  List,
  FileText,
  Bell,
  Link2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpdeskNavItem {
  translationKey: "home" | "inquiries" | "templates" | "announcements" | "links" | "faq";
  href: string;
  icon: LucideIcon;
}

const HELPDESK_NAV_ITEMS: HelpdeskNavItem[] = [
  { translationKey: "home", href: "/helpdesk", icon: LayoutDashboard },
  { translationKey: "inquiries", href: "/helpdesk/inquiries", icon: List },
  { translationKey: "templates", href: "/helpdesk/templates", icon: FileText },
  { translationKey: "announcements", href: "/helpdesk/announcements", icon: Bell },
  { translationKey: "links", href: "/helpdesk/links", icon: Link2 },
  { translationKey: "faq", href: "/helpdesk/faq", icon: HelpCircle },
];

interface HelpdeskSidebarProps {
  isCollapsed: boolean;
}

export function HelpdeskSidebar({ isCollapsed }: HelpdeskSidebarProps) {
  const t = useTranslations("helpdeskNav");
  const pathname = usePathname();

  return (
    <aside
      id="helpdesk-sidebar"
      aria-label={t("sidebarLabel")}
      className={cn(
        "fixed top-14 left-0 bottom-0 z-20 flex flex-col bg-sidebar transition-all duration-200",
        isCollapsed ? "w-16" : "w-60",
        "lg:w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {HELPDESK_NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/helpdesk" &&
                pathname.startsWith(`${item.href}/`));
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
