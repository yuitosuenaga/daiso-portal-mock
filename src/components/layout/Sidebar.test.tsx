import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import messages from "../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
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
});
