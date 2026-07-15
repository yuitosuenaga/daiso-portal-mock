import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskAppShell } from "@/components/layout/HelpdeskAppShell";
import messages from "../../../messages/ja.json";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
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

function renderHelpdeskAppShell() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <HelpdeskAppShell>content</HelpdeskAppShell>
    </NextIntlClientProvider>
  );
}

describe("HelpdeskAppShell", () => {
  it("開閉ボタンのaria-labelが翻訳キー経由で表示され、クリックで展開/折りたたみの文言が切り替わる", () => {
    renderHelpdeskAppShell();

    const toggleButton = screen.getByRole("button", {
      name: messages.helpdeskAppShell.expandSidebar,
    });
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggleButton);

    expect(
      screen.getByRole("button", {
        name: messages.helpdeskAppShell.collapseSidebar,
      }).getAttribute("aria-expanded")
    ).toBe("true");
  });
});
