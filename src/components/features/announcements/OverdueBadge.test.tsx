import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OverdueBadge } from "@/components/features/announcements/OverdueBadge";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("OverdueBadge", () => {
  it("isOverdueが真のときバッジを表示する", () => {
    render(<OverdueBadge isOverdue />);

    expect(screen.getByText("announcements.overdueBadge")).toBeTruthy();
  });

  it("isOverdueが偽のとき何も表示しない", () => {
    const { container } = render(<OverdueBadge isOverdue={false} />);

    expect(container.innerHTML).toBe("");
  });
});
