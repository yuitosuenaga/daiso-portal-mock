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
}));

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryStatusSummary: vi.fn().mockRejectedValue(new Error("mock")),
  getAllInquiryStatusSummary: vi.fn().mockRejectedValue(new Error("mock")),
}));

import DashboardPage from "@/app/[locale]/(applicant)/page";
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
 * `href`だけでは「資料共有」「売場検討会（動画）」「マニュアル」「POP」の4枚が全て
 * `/documents`で重複するため、`label`も併せて検証し入れ替わりを検知できるようにする。
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

describe("DashboardPage", () => {
  it("お知らせブロックの下に、資料共有→売場検討会（動画）→問合せ（＋問合せ一覧）→マニュアル→POP→リンク→よくある質問の順でブロックを表示する（お知らせカードはプレビューパネルと重複するため表示しない）", async () => {
    const page = (await DashboardPage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const gridDiv = rootChildren[2];
    const gridChildren = (gridDiv.props as { children: ReactElement[] })
      .children;

    const cards = gridChildren.map(unwrapCard);

    expect(cards).toEqual([
      { href: "/documents", label: "documents.title" },
      { href: "/sales-floor-meeting", label: "salesFloorMeeting.title" },
      { href: "/inquiry/new", label: "inquiryForm.title" },
      { href: "/inquiry", label: "dashboard.inquiryList.title" },
      { href: "/documents", label: "manuals.title" },
      { href: "/pop", label: "pop.title" },
      { href: "/links", label: "links.title" },
      { href: "/faq", label: "faq.title" },
    ]);
  });
});
