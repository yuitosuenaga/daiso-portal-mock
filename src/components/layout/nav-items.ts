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
  Video,
  Tags,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  translationKey: string;
  href: string;
  icon: LucideIcon;
}

/**
 * ヘルプデスク側サイドバー・モバイルドロワーで共有していたナビゲーション項目定義。
 * サイドバー・モバイルドロワー自体は撤去済み（`helpdesk-portal-layout`spec Requirement 20）
 * のため、現時点で実運用から呼び出す箇所はない。`MobileNav.tsx`とともに、UIプリミティブ
 * として再利用可能な状態で残置している（削除しない設計判断の詳細は同specのdesign.md参照）。
 */
export const HELPDESK_NAV_ITEMS: NavItem[] = [
  { translationKey: "home", href: "/helpdesk", icon: LayoutDashboard },
  { translationKey: "inquiryForm", href: "/helpdesk/inquiry/new", icon: FilePlus },
  { translationKey: "inquiries", href: "/helpdesk/inquiries", icon: List },
  { translationKey: "templates", href: "/helpdesk/templates", icon: FileText },
  { translationKey: "announcements", href: "/helpdesk/announcements", icon: Bell },
  { translationKey: "documents", href: "/helpdesk/documents", icon: FolderOpen },
  { translationKey: "manuals", href: "/helpdesk/manuals", icon: BookOpen },
  { translationKey: "salesFloorMeeting", href: "/helpdesk/sales-floor-meeting", icon: Video },
  { translationKey: "pop", href: "/helpdesk/pop", icon: Tags },
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
