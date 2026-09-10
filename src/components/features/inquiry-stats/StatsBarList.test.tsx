import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatsBarList, type StatsBarListRow } from "@/components/features/inquiry-stats/StatsBarList";

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

const rows: StatsBarListRow[] = [
  { key: "defect", label: "不具合", count: 3, barPercent: 100 },
  { key: "order", label: "発注関連", count: 1, barPercent: 33 },
];

describe("StatsBarList", () => {
  it("静的モードでは各行を件数付きで表示する", () => {
    render(<StatsBarList rows={rows} unitLabel="件" />);

    expect(screen.getByText("不具合")).toBeTruthy();
    expect(screen.getByText("3件")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hrefByKeyを指定すると各行がLinkになる", () => {
    render(
      <StatsBarList
        rows={rows}
        unitLabel="件"
        hrefByKey={{ defect: "/inquiry?category=defect" }}
      />
    );

    const link = screen.getByRole("link", { name: /不具合/ });
    expect(link.getAttribute("href")).toBe("/inquiry?category=defect");
  });

  it("onSelectKeyを指定すると各行がbuttonになり、クリックでkeyを通知する", () => {
    const onSelectKey = vi.fn();
    render(<StatsBarList rows={rows} unitLabel="件" onSelectKey={onSelectKey} />);

    screen.getByRole("button", { name: /不具合/ }).click();
    expect(onSelectKey).toHaveBeenCalledWith("defect");
  });

  it("selectedKeyと一致する行はaria-pressed=trueになる", () => {
    render(
      <StatsBarList
        rows={rows}
        unitLabel="件"
        onSelectKey={vi.fn()}
        selectedKey="defect"
      />
    );

    expect(
      screen.getByRole("button", { name: /不具合/ }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /発注関連/ }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("全行0件のときemptyMessageを表示する", () => {
    render(
      <StatsBarList
        rows={rows.map((row) => ({ ...row, count: 0, barPercent: 0 }))}
        unitLabel="件"
        emptyMessage="対象の問合せはありません"
      />
    );

    expect(screen.getByText("対象の問合せはありません")).toBeTruthy();
  });

  it("1行以上0件でない場合はemptyMessageを表示しない", () => {
    render(<StatsBarList rows={rows} unitLabel="件" emptyMessage="対象の問合せはありません" />);

    expect(screen.queryByText("対象の問合せはありません")).toBeNull();
  });
});
