import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/layout/Header";
import messages from "../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
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
    expect(screen.getByText(messages.header.title)).toBeTruthy();
  });
});
