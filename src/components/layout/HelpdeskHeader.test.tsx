import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskHeader } from "@/components/layout/HelpdeskHeader";
import messages from "../../../messages/ja.json";

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

function renderHelpdeskHeader() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <HelpdeskHeader />
    </NextIntlClientProvider>
  );
}

describe("HelpdeskHeader", () => {
  it("タイトルが表示される", () => {
    renderHelpdeskHeader();
    expect(screen.getByText(messages.helpdeskHeader.portalName)).toBeTruthy();
    expect(
      screen.getByText(`/ ${messages.helpdeskHeader.screenName}`)
    ).toBeTruthy();
  });

  it("申請者側画面への切り替えリンクが表示される", () => {
    renderHelpdeskHeader();
    const link = screen.getByRole("link", {
      name: messages.helpdeskHeader.switchToApplicant,
    });
    expect(link.getAttribute("href")).toBe("/");
  });
});
