import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import messages from "../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
}));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <LanguageSwitcher />
    </NextIntlClientProvider>
  );
}

describe("LanguageSwitcher", () => {
  it("現在の言語ラベルはブランドカラーで強調表示される", () => {
    renderSwitcher();
    const activeButton = screen.getByRole("button", { name: "日本語" });
    expect(activeButton.className).toContain("text-primary");
  });

  it("非選択言語はブランドカラーで強調されない", () => {
    renderSwitcher();
    const inactiveButton = screen.getByRole("button", { name: "English" });
    expect(inactiveButton.className).not.toContain("text-primary");
  });
});
