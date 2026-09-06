import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "@/components/layout/MobileNav";
import { HELPDESK_NAV_ITEMS } from "@/components/layout/nav-items";
import messages from "../../../messages/ja.json";

const pathnameMock = vi.fn(() => "/");

afterEach(() => {
  pathnameMock.mockReset();
  pathnameMock.mockImplementation(() => "/");
});

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathnameMock(),
  Link: ({
    children,
    href,
    onClick,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

function renderMobileNav() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <MobileNav
        items={HELPDESK_NAV_ITEMS}
        namespace="helpdeskNav"
        rootHref="/helpdesk"
      />
    </NextIntlClientProvider>
  );
}

describe("MobileNav", () => {
  it("初期状態ではドロワーの中身は表示されない", () => {
    renderMobileNav();
    expect(
      screen.queryByRole("link", { name: messages.helpdeskNav.home })
    ).toBeNull();
  });

  it("トグルを押すとドロワーが開き、全ナビゲーション項目が表示される", () => {
    renderMobileNav();
    fireEvent.click(
      screen.getByRole("button", { name: messages.helpdeskNav.openMenu })
    );

    expect(
      screen.getByRole("link", { name: messages.helpdeskNav.home })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: messages.helpdeskNav.faq })
    ).toBeTruthy();
  });

  it("現在のパスに対応する項目がアクティブ表示される", () => {
    pathnameMock.mockReturnValue("/helpdesk/inquiry/new");
    renderMobileNav();
    fireEvent.click(
      screen.getByRole("button", { name: messages.helpdeskNav.openMenu })
    );

    const formLink = screen.getByRole("link", {
      name: messages.helpdeskNav.inquiryForm,
    });
    expect(formLink.className).toContain("bg-primary");
  });

  it("項目をクリックするとドロワーが閉じる", () => {
    renderMobileNav();
    fireEvent.click(
      screen.getByRole("button", { name: messages.helpdeskNav.openMenu })
    );
    fireEvent.click(screen.getByRole("link", { name: messages.helpdeskNav.home }));

    expect(
      screen.queryByRole("link", { name: messages.helpdeskNav.home })
    ).toBeNull();
  });

  it("閉じるボタンでドロワーが閉じる", () => {
    renderMobileNav();
    fireEvent.click(
      screen.getByRole("button", { name: messages.helpdeskNav.openMenu })
    );
    fireEvent.click(
      screen.getByRole("button", { name: messages.helpdeskNav.closeMenu })
    );

    expect(
      screen.queryByRole("link", { name: messages.helpdeskNav.home })
    ).toBeNull();
  });
});
