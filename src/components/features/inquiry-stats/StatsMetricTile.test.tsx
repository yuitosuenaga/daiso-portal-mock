import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("StatsMetricTile", () => {
  it("静的モードでは値をそのまま表示する", () => {
    render(<StatsMetricTile label="未対応" value={3} />);

    expect(screen.getByText("未対応")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("value=0でzeroLabel指定時はzeroLabelを表示する", () => {
    render(<StatsMetricTile label="未対応" value={0} zeroLabel="未対応なし" />);

    expect(screen.getByText("未対応なし")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("hrefを指定するとLinkになる", () => {
    render(
      <StatsMetricTile label="未対応" value={3} href="/helpdesk/inquiries?unresolved=1" />
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries?unresolved=1");
    expect(link.textContent).toBe("3");
  });

  it("onSelectを指定するとbuttonになり、クリックで通知する", () => {
    const onSelect = vi.fn();
    render(<StatsMetricTile label="未対応" value={3} onSelect={onSelect} />);

    screen.getByRole("button").click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("captionを指定すると補足文言を表示する", () => {
    render(<StatsMetricTile label="未対応" value={3} caption="全社の未対応件数" />);

    expect(screen.getByText("全社の未対応件数")).toBeTruthy();
  });

  it("selected=trueのときaria-pressedがtrueになる", () => {
    render(
      <StatsMetricTile label="未対応" value={3} onSelect={vi.fn()} selected />
    );

    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });
});
