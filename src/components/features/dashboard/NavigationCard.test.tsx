import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { NavigationCard } from "@/components/features/dashboard/NavigationCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("NavigationCard", () => {
  it("タイトル・説明・アイコンを表示する", () => {
    render(
      <NavigationCard
        title="問い合わせ申請"
        description="新しい問い合わせを申請します"
        href="/inquiry/new"
        icon={Inbox}
      />
    );

    expect(screen.getByText("問い合わせ申請")).toBeTruthy();
    expect(screen.getByText("新しい問い合わせを申請します")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.querySelector("svg")).toBeTruthy();
  });

  it("指定したhrefへのリンクとして機能する", () => {
    render(
      <NavigationCard
        title="FAQ"
        description="よくある質問"
        href="/faq"
        icon={Inbox}
      />
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/faq");
  });

  it("badgeが指定されている場合バッジの件数を表示する", () => {
    render(
      <NavigationCard
        title="問い合わせ一覧"
        description="自社の問い合わせ状況を確認します"
        href="/inquiry"
        icon={Inbox}
        badge={{ count: 3, variant: "urgency-high" }}
      />
    );

    expect(screen.getByText("3")).toBeTruthy();
  });

  it("badgeが未指定の場合バッジを表示しない", () => {
    render(
      <NavigationCard
        title="リンク"
        description="よく使うリンク集"
        href="/links"
        icon={Inbox}
      />
    );

    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  it("badge.countが0の場合バッジを表示しない", () => {
    render(
      <NavigationCard
        title="お知らせ"
        description="最新のお知らせ"
        href="/announcements"
        icon={Inbox}
        badge={{ count: 0, variant: "default" }}
      />
    );

    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });
});
