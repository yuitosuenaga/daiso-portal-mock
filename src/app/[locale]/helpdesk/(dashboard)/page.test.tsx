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

vi.mock("@/lib/api/inquiries", () => ({
  getAllInquiries: vi.fn().mockRejectedValue(new Error("mock")),
}));

import HelpdeskHomePage from "@/app/[locale]/helpdesk/(dashboard)/page";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";

interface CardIdentity {
  href: string;
  label: string;
}

/**
 * ヘルプデスク側トップページの「対応業務」セクションは全て静的`NavigationCard`
 * （非同期データ取得を伴わない）で構成されるため、実際のレンダリングを行わず
 * React要素ツリー（`.type`/`.props`）のみを検査して枚数・表示順・遷移先を検証する。
 */
function unwrapCard(node: ReactElement): CardIdentity {
  if (node.type === NavigationCard) {
    const props = node.props as { href: string; title: string };
    return { href: props.href, label: props.title };
  }
  throw new Error(`予期しないノード種別: ${String(node.type)}`);
}

describe("HelpdeskHomePage", () => {
  it("「対応業務」セクションに、問い合わせ一覧カードを含まない7枚のカードが指定順で表示される", async () => {
    const page = (await HelpdeskHomePage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const supportSection = rootChildren[2];
    const supportGrid = (supportSection.props as { children: ReactElement[] })
      .children[1];
    const gridChildren = (supportGrid.props as { children: ReactElement[] })
      .children;

    const cards = gridChildren.map(unwrapCard);

    expect(cards).toEqual([
      { href: "/helpdesk/templates", label: "templates" },
      { href: "/helpdesk/announcements", label: "announcements" },
      { href: "/helpdesk/documents", label: "documents" },
      { href: "/helpdesk/inquiry/new", label: "inquiryForm" },
      { href: "/helpdesk/sales-floor-meeting", label: "salesFloorMeeting" },
      { href: "/helpdesk/pop", label: "pop" },
      { href: "/helpdesk/companies", label: "companies" },
    ]);
  });

  it("「参考情報」セクションに、リンク・よくある質問の2枚が表示される", async () => {
    const page = (await HelpdeskHomePage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const referenceSection = rootChildren[3];
    const referenceGrid = (
      referenceSection.props as { children: ReactElement[] }
    ).children[1];
    const gridChildren = (referenceGrid.props as { children: ReactElement[] })
      .children;

    const cards = gridChildren.map(unwrapCard);

    expect(cards).toEqual([
      { href: "/helpdesk/links", label: "links" },
      { href: "/helpdesk/faq", label: "faq" },
    ]);
  });
});
