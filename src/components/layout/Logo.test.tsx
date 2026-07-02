import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "@/components/layout/Logo";

describe("Logo", () => {
  it("ワードマークが表示され、装飾的なシンボルマークは読み上げ対象から除外される", () => {
    const { container } = render(<Logo />);
    expect(screen.getByText("DAISO")).toBeTruthy();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
  });
});
