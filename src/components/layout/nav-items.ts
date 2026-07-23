import {
  LayoutDashboard,
  FilePlus,
  List,
  FileText,
  Bell,
  Link2,
  HelpCircle,
  FolderOpen,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  translationKey: string;
  href: string;
  icon: LucideIcon;
}

/** 申請者側サイドバー・モバイルドロワーで共有するナビゲーション項目定義。 */
export const APPLICANT_NAV_ITEMS: NavItem[] = [
  { translationKey: "dashboard", href: "/", icon: LayoutDashboard },
  { translationKey: "inquiryForm", href: "/inquiry/new", icon: FilePlus },
  { translationKey: "inquiryList", href: "/inquiry", icon: List },
  { translationKey: "announcements", href: "/announcements", icon: Bell },
  { translationKey: "documents", href: "/documents", icon: FolderOpen },
  { translationKey: "links", href: "/links", icon: Link2 },
  { translationKey: "faq", href: "/faq", icon: HelpCircle },
];

/** ヘルプデスク側サイドバー・モバイルドロワーで共有するナビゲーション項目定義。 */
export const HELPDESK_NAV_ITEMS: NavItem[] = [
  { translationKey: "home", href: "/helpdesk", icon: LayoutDashboard },
  { translationKey: "inquiryForm", href: "/helpdesk/inquiry/new", icon: FilePlus },
  { translationKey: "inquiries", href: "/helpdesk/inquiries", icon: List },
  { translationKey: "templates", href: "/helpdesk/templates", icon: FileText },
  { translationKey: "announcements", href: "/helpdesk/announcements", icon: Bell },
  { translationKey: "documents", href: "/helpdesk/documents", icon: FolderOpen },
  { translationKey: "links", href: "/helpdesk/links", icon: Link2 },
  { translationKey: "faq", href: "/helpdesk/faq", icon: HelpCircle },
  { translationKey: "companies", href: "/helpdesk/companies", icon: Building2 },
];

/**
 * 現在のパスに対応するナビゲーション項目のアクティブなhrefを判定する。
 * `rootHref`（申請者側は`/`、ヘルプデスク側は`/helpdesk`）に一致する項目は完全一致のみで
 * アクティブ判定し、それ以外の項目はパス区切りを伴う前方一致で判定する。
 * 複数の項目が一致する場合は、hrefが最も長い（＝最も具体的な）項目を優先する。
 */
export function resolveActiveHref(
  pathname: string,
  items: NavItem[],
  rootHref: string
): string | undefined {
  const matches = items.filter(
    (item) =>
      pathname === item.href ||
      (item.href !== rootHref && pathname.startsWith(`${item.href}/`))
  );

  if (matches.length === 0) {
    return undefined;
  }

  return matches.reduce((longest, item) =>
    item.href.length > longest.href.length ? item : longest
  ).href;
}
