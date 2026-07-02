import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskSidebar } from "@/components/layout/HelpdeskSidebar";
import { usePathname } from "@/i18n/navigation";
import messages from "../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  usePathname: vi.fn(() => "/helpdesk"),
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

  it("問い合わせ管理・テンプレート管理へのナビゲーション項目を表示する", () => {
    renderHelpdeskSidebar();

    const inquiriesLink = screen.getByRole("link", {
      name: messages.helpdeskNav.inquiries,
    });
    expect(inquiriesLink.getAttribute("href")).toBe("/helpdesk/inquiries");

    const templatesLink = screen.getByRole("link", {
      name: messages.helpdeskNav.templates,
    });
    expect(templatesLink.getAttribute("href")).toBe("/helpdesk/templates");
  });

  it("リンク集・FAQへのナビゲーション項目を表示する", () => {
    renderHelpdeskSidebar();

    const linksLink = screen.getByRole("link", {
      name: messages.helpdeskNav.links,
    });
    expect(linksLink.getAttribute("href")).toBe("/helpdesk/links");

    const faqLink = screen.getByRole("link", {
      name: messages.helpdeskNav.faq,
    });
    expect(faqLink.getAttribute("href")).toBe("/helpdesk/faq");
  });

  it("問い合わせ詳細ページ表示中は問い合わせ管理項目がアクティブになる", () => {
    vi.mocked(usePathname).mockReturnValue("/helpdesk/inquiries/inquiry-001");

    renderHelpdeskSidebar();

    const inquiriesLink = screen.getByRole("link", {
      name: messages.helpdeskNav.inquiries,
    });
    expect(inquiriesLink.className).toContain("bg-primary");

    const homeLink = screen.getByRole("link", {
      name: messages.helpdeskNav.home,
    });
    expect(homeLink.className).not.toContain("bg-primary");
  });
});
