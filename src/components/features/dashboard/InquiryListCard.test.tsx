import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import type { InquiryStatusSummary } from "@/types/inquiry-summary";

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

const getInquiryStatusSummaryMock = vi.fn();
const getAllInquiryStatusSummaryMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryStatusSummary: (...args: unknown[]) =>
    getInquiryStatusSummaryMock(...args),
  getAllInquiryStatusSummary: (...args: unknown[]) =>
    getAllInquiryStatusSummaryMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => `translated:${key}`,
}));

function buildSummary(
  overrides: Partial<InquiryStatusSummary> = {}
): InquiryStatusSummary {
  return { new: 0, in_progress: 0, resolved: 0, ...overrides };
}

describe("InquiryListCard", () => {
  beforeEach(() => {
    getInquiryStatusSummaryMock.mockReset();
    getAllInquiryStatusSummaryMock.mockReset();
  });

  it("scope=ownの場合、getInquiryStatusSummaryを呼び出し未対応件数をバッジとして表示する", async () => {
    getInquiryStatusSummaryMock.mockResolvedValueOnce(
      buildSummary({ new: 2, in_progress: 3, resolved: 5 })
    );

    const jsx = await InquiryListCard({
      scope: "own",
      href: "/inquiry",
      titleKey: "dashboard.inquiryList.title",
      descriptionKey: "dashboard.inquiryList.description",
    });
    render(jsx);

    expect(getInquiryStatusSummaryMock).toHaveBeenCalledTimes(1);
    expect(getAllInquiryStatusSummaryMock).not.toHaveBeenCalled();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("translated:dashboard.inquiryList.title")).toBeTruthy();
    expect(
      screen.getByText("translated:dashboard.inquiryList.description")
    ).toBeTruthy();
  });

  it("scope=allの場合、getAllInquiryStatusSummaryを呼び出し未対応件数をバッジとして表示する", async () => {
    getAllInquiryStatusSummaryMock.mockResolvedValueOnce(
      buildSummary({ new: 4, in_progress: 6, resolved: 1 })
    );

    const jsx = await InquiryListCard({
      scope: "all",
      href: "/helpdesk/inquiries",
      titleKey: "helpdeskNav.inquiries",
      descriptionKey: "helpdeskDashboard.inquiries.description",
    });
    render(jsx);

    expect(getAllInquiryStatusSummaryMock).toHaveBeenCalledTimes(1);
    expect(getInquiryStatusSummaryMock).not.toHaveBeenCalled();
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("未対応件数が0件のときバッジを表示しない", async () => {
    getInquiryStatusSummaryMock.mockResolvedValueOnce(
      buildSummary({ new: 0, in_progress: 0, resolved: 8 })
    );

    const jsx = await InquiryListCard({
      scope: "own",
      href: "/inquiry",
      titleKey: "dashboard.inquiryList.title",
      descriptionKey: "dashboard.inquiryList.description",
    });
    render(jsx);

    expect(screen.queryByText("0")).toBeNull();
  });

  it("データ取得に失敗した場合、例外をthrowせずバッジなしで表示する", async () => {
    getInquiryStatusSummaryMock.mockRejectedValueOnce(
      new Error("network error")
    );

    const jsx = await InquiryListCard({
      scope: "own",
      href: "/inquiry",
      titleKey: "dashboard.inquiryList.title",
      descriptionKey: "dashboard.inquiryList.description",
    });

    expect(() => render(jsx)).not.toThrow();
    expect(
      screen.getByText("translated:dashboard.inquiryList.title")
    ).toBeTruthy();

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/inquiry");
  });

  it("データ取得に失敗した場合(scope=all)も、例外をthrowせずバッジなしで表示する", async () => {
    getAllInquiryStatusSummaryMock.mockRejectedValueOnce(
      new Error("network error")
    );

    const jsx = await InquiryListCard({
      scope: "all",
      href: "/helpdesk/inquiries",
      titleKey: "helpdeskNav.inquiries",
      descriptionKey: "helpdeskDashboard.inquiries.description",
    });

    expect(() => render(jsx)).not.toThrow();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries");
  });
});
