import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginSwitchLink } from "@/components/features/auth/LoginSwitchLink";

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

describe("LoginSwitchLink", () => {
  it("targetHrefが/helpdesk/loginのとき、ヘルプデスク側ログインへのリンクを表示する", () => {
    render(<LoginSwitchLink targetHref="/helpdesk/login" label="日本大創側のログインへ" />);

    const link = screen.getByRole("link", { name: "日本大創側のログインへ" });
    expect(link.getAttribute("href")).toBe("/helpdesk/login");
  });

  it("targetHrefが/loginのとき、申請者側ログインへのリンクを表示する", () => {
    render(<LoginSwitchLink targetHref="/login" label="海外販社代理店側のログインへ" />);

    const link = screen.getByRole("link", { name: "海外販社代理店側のログインへ" });
    expect(link.getAttribute("href")).toBe("/login");
  });
});
