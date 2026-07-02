import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskSidebar } from "@/components/layout/HelpdeskSidebar";
import messages from "../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/helpdesk",
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

function renderHelpdeskSidebar() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <HelpdeskSidebar isCollapsed={false} />
    </NextIntlClientProvider>
  );
}

describe("HelpdeskSidebar", () => {
  it("ホームへのナビゲーション項目がアクティブ表示される", () => {
    renderHelpdeskSidebar();
    const homeLink = screen.getByRole("link", {
      name: messages.helpdeskNav.home,
    });
    expect(homeLink.getAttribute("href")).toBe("/helpdesk");
    expect(homeLink.className).toContain("bg-primary");
  });

  it("サイドバーにナビゲーションのアクセシブルラベルが設定される", () => {
    renderHelpdeskSidebar();
    expect(
      screen.getByLabelText(messages.helpdeskNav.sidebarLabel)
    ).toBeTruthy();
  });
});
