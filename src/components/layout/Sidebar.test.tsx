import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import messages from "../../../messages/ja.json";

const pathnameMock = vi.fn(() => "/");

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathnameMock(),
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

function renderSidebar() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <Sidebar isCollapsed={false} />
    </NextIntlClientProvider>
  );
}

describe("Sidebar", () => {
  it("アクティブなナビゲーション項目はブランドカラー塗り・白文字で表示される", () => {
    renderSidebar();
    const activeLink = screen.getByRole("link", {
      name: messages.nav.dashboard,
    });
    expect(activeLink.className).toContain("bg-primary");
    expect(activeLink.className).toContain("text-primary-foreground");
  });

  it("非アクティブなナビゲーション項目はhoverで淡いブランドカラーになる", () => {
    renderSidebar();
    const inactiveLink = screen.getByRole("link", {
      name: messages.nav.faq,
    });
    expect(inactiveLink.className).toContain("hover:bg-accent");
    expect(inactiveLink.className).toContain("hover:text-accent-foreground");
  });

  it("/inquiry/newでは問い合わせ一覧ではなく申請のみがアクティブになる", () => {
    pathnameMock.mockReturnValueOnce("/inquiry/new");
    renderSidebar();

    const formLink = screen.getByRole("link", {
      name: messages.nav.inquiryForm,
    });
    const listLink = screen.getByRole("link", {
      name: messages.nav.inquiryList,
    });
    expect(formLink.className).toContain("bg-primary");
    expect(listLink.className).not.toContain("bg-primary");
  });

  it("/inquiry/123（詳細）では問い合わせ一覧がアクティブになる", () => {
    pathnameMock.mockReturnValueOnce("/inquiry/123");
    renderSidebar();

    const listLink = screen.getByRole("link", {
      name: messages.nav.inquiryList,
    });
    expect(listLink.className).toContain("bg-primary");
  });
});
