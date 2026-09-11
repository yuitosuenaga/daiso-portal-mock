import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/server/auth-session", () => ({
  requireApplicantSession: vi.fn().mockRejectedValue(new Error("mock")),
}));

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: vi.fn().mockRejectedValue(new Error("mock")),
  getRecentAnnouncements: vi.fn().mockRejectedValue(new Error("mock")),
}));

vi.mock("@/lib/api/announcement-tracking", () => ({
  isReminderPendingForCompany: vi.fn().mockResolvedValue(false),
  getAnnouncementSelfStatuses: vi.fn().mockRejectedValue(new Error("mock")),
}));

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryStatusSummary: vi.fn().mockRejectedValue(new Error("mock")),
  getAllInquiryStatusSummary: vi.fn().mockRejectedValue(new Error("mock")),
}));

import DashboardPage from "@/app/[locale]/(applicant)/page";
import { AnnouncementSelfSummaryPanel } from "@/components/features/dashboard/AnnouncementSelfSummaryPanel";
import { AnnouncementsPreviewPanel } from "@/components/features/dashboard/AnnouncementsPreviewPanel";
import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";

interface CardIdentity {
  href: string;
  /** `NavigationCard`は解決済みの`title`文字列、`InquiryListCard`は`titleKey`をそのまま用いる */
  label: string;
}

/**
 * ダッシュボードのグリッド子要素は`NavigationCard`または`Suspense`でラップされた
 * `InquiryListCard`のいずれか。実際のデータ取得・レンダリングを
 * 行わず、React要素ツリー（`.type`/`.props`）のみを検査して表示順・遷移先を検証する。
 * `href`だけでは判別しづらいカードもあるため、`label`も併せて検証し入れ替わりを検知
 * できるようにする（マニュアルは`manuals`spec新設に伴い専用ルート`/manuals`を持つ）。
 */
function unwrapCard(node: ReactElement): CardIdentity {
  if (node.type === NavigationCard) {
    const props = node.props as { href: string; title: string };
    return { href: props.href, label: props.title };
  }
  if (node.type === InquiryListCard) {
    const props = node.props as { href: string; titleKey: string };
    return { href: props.href, label: props.titleKey };
  }
  const children = (node.props as { children?: ReactElement }).children;
  if (children) {
    return unwrapCard(children);
  }
  throw new Error(`予期しないノード種別: ${String(node.type)}`);
}

/** React要素ツリーを再帰的に辿り、指定した`type`を持つノードが含まれるかを判定する。 */
function containsComponentType(node: unknown, type: unknown): boolean {
  if (node === null || typeof node !== "object" || !("type" in node)) {
    return false;
  }
  const element = node as ReactElement;
  if (element.type === type) {
    return true;
  }
  const children = (element.props as { children?: unknown }).children;
  if (Array.isArray(children)) {
    return children.some((child) => containsComponentType(child, type));
  }
  return containsComponentType(children, type);
}

describe("DashboardPage", () => {
  it("お知らせサマリと最新のお知らせプレビューがファーストビューの同じ親要素内に同居する", async () => {
    const page = (await DashboardPage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const announcementsBlock = rootChildren[0];

    expect(containsComponentType(announcementsBlock, AnnouncementSelfSummaryPanel)).toBe(
      true
    );
    expect(containsComponentType(announcementsBlock, AnnouncementsPreviewPanel)).toBe(true);
  });


  it("お知らせブロックの下に、資料共有→売場検討会（動画）→問合せ申請→マニュアル→POP→問合せ一覧→リンク→よくある質問の順でブロックを表示する（お知らせカードはプレビューパネルと重複するため表示しない）", async () => {
    const page = (await DashboardPage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const gridDiv = rootChildren[1];
    const gridChildren = (gridDiv.props as { children: ReactElement[] })
      .children;

    const cards = gridChildren.map(unwrapCard);

    expect(cards).toEqual([
      { href: "/documents", label: "documents.title" },
      { href: "/sales-floor-meeting", label: "salesFloorMeeting.title" },
      { href: "/inquiry/new", label: "inquiryForm.title" },
      { href: "/manuals", label: "manuals.title" },
      { href: "/pop", label: "pop.title" },
      { href: "/inquiry", label: "dashboard.inquiryList.title" },
      { href: "/links", label: "links.title" },
      { href: "/faq", label: "faq.title" },
    ]);
  });
});
