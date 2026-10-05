import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SUPPORTED_LOCALES } from "@/lib/constants/locales";
import messages from "../../../messages/ja.json";

const replace = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
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
  it("対応する全言語を選択肢として表示する", () => {
    renderSwitcher();
    const options = screen.getAllByRole("option").map((option) => (option as HTMLOptionElement).value);
    expect(options).toEqual([...SUPPORTED_LOCALES]);
  });

  it("現在の言語が選択されている", () => {
    renderSwitcher();
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("ja");
  });

  it("言語を選ぶと同じパスでロケールを切り替える", () => {
    renderSwitcher();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "th" } });
    expect(replace).toHaveBeenCalledWith("/", { locale: "th" });
  });
});
