import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/layout/Header";
import { signOut } from "next-auth/react";
import messages from "../../../messages/ja.json";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
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

function renderHeader() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <Header />
    </NextIntlClientProvider>
  );
}

describe("Header", () => {
  it("ロゴとタイトル文言の両方が表示される", () => {
    renderHeader();
    expect(screen.getAllByText("DAISO").length).toBeGreaterThan(0);
    expect(screen.getByText(messages.header.portalName)).toBeTruthy();
    expect(screen.getByText(`/ ${messages.header.screenName}`)).toBeTruthy();
  });

  it("ヘルプデスク側画面への切り替えリンクは表示されない（デッドリンクのため撤去済み）", () => {
    renderHeader();
    const links = screen.getAllByRole("link");
    expect(links.every((link) => link.getAttribute("href") !== "/helpdesk")).toBe(
      true
    );
  });

  it("ログアウトボタンをクリックするとsignOutが呼ばれる", () => {
    renderHeader();
    const button = screen.getByRole("button", { name: messages.header.logout });
    fireEvent.click(button);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/ja/login" });
  });
});
