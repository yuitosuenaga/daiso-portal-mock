import { beforeEach, describe, expect, it, vi } from "vitest";
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

const isHelpdeskAdminMock = vi.fn();
vi.mock("@/lib/server/auth-session", () => ({
  isHelpdeskAdmin: () => isHelpdeskAdminMock(),
}));

vi.mock("@/lib/api/current-staff", () => ({
  getCurrentHelpdeskStaffName: vi.fn().mockResolvedValue(null),
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

function supportCards(page: ReactElement): CardIdentity[] {
  const rootChildren = (page.props as { children: ReactElement[] }).children;
  const supportGrid = (rootChildren[1].props as { children: ReactElement[] })
    .children[1];
  return (supportGrid.props as { children: Array<ReactElement | false> }).children
    .filter((child): child is ReactElement => child !== false)
    .map(unwrapCard);
}

describe("HelpdeskHomePage", () => {
  beforeEach(() => {
    isHelpdeskAdminMock.mockResolvedValue(false);
  });

  it("adminには「対応業務」の末尾にスタッフ管理カードが表示される", async () => {
    isHelpdeskAdminMock.mockResolvedValue(true);
    const cards = supportCards((await HelpdeskHomePage()) as ReactElement);

    expect(cards).toHaveLength(9);
    expect(cards[8]).toEqual({ href: "/helpdesk/staff", label: "staff" });
  });

  it("member（非admin）にはスタッフ管理カードが表示されない", async () => {
    const cards = supportCards((await HelpdeskHomePage()) as ReactElement);

    expect(cards.map((card) => card.href)).not.toContain("/helpdesk/staff");
  });

  it("「対応業務」セクションに、問い合わせ一覧カードを含まない8枚のカードが指定順で表示される", async () => {
    const cards = supportCards((await HelpdeskHomePage()) as ReactElement);

    expect(cards).toEqual([
      { href: "/helpdesk/announcements", label: "announcements" },
      { href: "/helpdesk/documents", label: "documents" },
      { href: "/helpdesk/sales-floor-meeting", label: "salesFloorMeeting" },
      { href: "/helpdesk/inquiry/new", label: "inquiryForm" },
      { href: "/helpdesk/manuals", label: "manuals" },
      { href: "/helpdesk/pop", label: "pop" },
      { href: "/helpdesk/templates", label: "templates" },
      { href: "/helpdesk/companies", label: "companies" },
    ]);
  });

  it("「参考情報」セクションに、リンク・よくある質問の2枚が表示される", async () => {
    const page = (await HelpdeskHomePage()) as ReactElement;
    const rootChildren = (page.props as { children: ReactElement[] }).children;
    const referenceSection = rootChildren[2];
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
