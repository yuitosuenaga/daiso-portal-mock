import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "@/components/layout/MobileNav";
import { APPLICANT_NAV_ITEMS } from "@/components/layout/nav-items";
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
      <MobileNav items={APPLICANT_NAV_ITEMS} namespace="nav" rootHref="/" />
    </NextIntlClientProvider>
  );
}

describe("MobileNav", () => {
  it("初期状態ではドロワーの中身は表示されない", () => {
    renderMobileNav();
    expect(
      screen.queryByRole("link", { name: messages.nav.dashboard })
    ).toBeNull();
  });

  it("トグルを押すとドロワーが開き、全ナビゲーション項目が表示される", () => {
    renderMobileNav();
    fireEvent.click(screen.getByRole("button", { name: messages.nav.openMenu }));

    expect(
      screen.getByRole("link", { name: messages.nav.dashboard })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: messages.nav.faq })).toBeTruthy();
  });

  it("現在のパスに対応する項目がアクティブ表示される", () => {
    pathnameMock.mockReturnValue("/inquiry/new");
    renderMobileNav();
    fireEvent.click(screen.getByRole("button", { name: messages.nav.openMenu }));

    const formLink = screen.getByRole("link", { name: messages.nav.inquiryForm });
    expect(formLink.className).toContain("bg-primary");
  });

  it("項目をクリックするとドロワーが閉じる", () => {
    renderMobileNav();
    fireEvent.click(screen.getByRole("button", { name: messages.nav.openMenu }));
    fireEvent.click(screen.getByRole("link", { name: messages.nav.dashboard }));

    expect(
      screen.queryByRole("link", { name: messages.nav.dashboard })
    ).toBeNull();
  });

  it("閉じるボタンでドロワーが閉じる", () => {
    renderMobileNav();
    fireEvent.click(screen.getByRole("button", { name: messages.nav.openMenu }));
    fireEvent.click(screen.getByRole("button", { name: messages.nav.closeMenu }));

    expect(
      screen.queryByRole("link", { name: messages.nav.dashboard })
    ).toBeNull();
  });
});
