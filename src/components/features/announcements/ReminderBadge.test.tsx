import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("ReminderBadge", () => {
  it("isPendingが真のときバッジを表示する", () => {
    render(<ReminderBadge isPending />);

    expect(screen.getByText("announcements.reminderBadge")).toBeTruthy();
  });

  it("isPendingが偽のとき何も表示しない", () => {
    const { container } = render(<ReminderBadge isPending={false} />);

    expect(container.innerHTML).toBe("");
  });
});
