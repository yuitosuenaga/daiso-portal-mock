import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryKpiPanel } from "@/components/features/dashboard/HelpdeskInquiryKpiPanel";
import type { Inquiry } from "@/types/inquiry";

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

const getAllInquiriesMock = vi.fn();
const getCurrentHelpdeskStaffNameMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getAllInquiries: (...args: unknown[]) => getAllInquiriesMock(...args),
}));

vi.mock("@/lib/api/current-staff", () => ({
  getCurrentHelpdeskStaffName: (...args: unknown[]) =>
    getCurrentHelpdeskStaffNameMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
}));

function makeInquiry(overrides: Partial<Inquiry> & { id: string }): Inquiry {
  return {
    title: "テストタイトル",
    category: "defect",
    urgency: "high",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Daiso Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

describe("HelpdeskInquiryKpiPanel", () => {
  afterEach(() => {
    getAllInquiriesMock.mockReset();
    getCurrentHelpdeskStaffNameMock.mockReset();
  });

  it("未対応・未着手の件数を表示し、一覧への絞り込みリンクを生成する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new", claim: null }),
      makeInquiry({ id: "2", status: "resolved" }),
    ]);
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce(null);

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    const { container } = render(jsx);

    const unresolvedLink = container.querySelector(
      'a[href="/helpdesk/inquiries?unresolved=1"]'
    );
    expect(unresolvedLink?.textContent).toBe("1");

    const unclaimedLink = container.querySelector(
      'a[href="/helpdesk/inquiries?unclaimed=1&unresolved=1"]'
    );
    expect(unclaimedLink?.textContent).toBe("1");
  });

  it("自分の担当中件数が1件以上ある場合のみ「自分の担当」タイルを表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({
        id: "1",
        status: "new",
        claim: { staffName: "田中", claimedAt: "2026-07-01T00:00:00.000Z" },
      }),
    ]);
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce("田中");

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    render(jsx);

    const mineLink = screen
      .getByText("helpdeskInquiries.stats.mineLabel")
      .closest("a, div")
      ?.querySelector("a");
    expect(mineLink?.getAttribute("href")).toBe(
      "/helpdesk/inquiries?staff=%E7%94%B0%E4%B8%AD&unresolved=1"
    );
  });

  it("自分の担当が0件の場合は「自分の担当」タイルを表示しない", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new", claim: null }),
    ]);
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce("田中");

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    render(jsx);

    expect(screen.queryByText("helpdeskInquiries.stats.mineLabel")).toBeNull();
  });

  it("緊急度高の未着手が1件以上あるとき警告リンクを表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new", urgency: "high", claim: null }),
    ]);
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce(null);

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    render(jsx);

    const link = screen.getByRole("link", {
      name: /helpdeskInquiries.stats.highUrgencyAlert/,
    });
    expect(link.getAttribute("href")).toBe(
      "/helpdesk/inquiries?urgency=high&unclaimed=1&unresolved=1"
    );
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getAllInquiriesMock.mockRejectedValueOnce(new Error("network error"));
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce(null);

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    render(jsx);

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("「一覧を見る」リンクがlistHrefを指す", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([makeInquiry({ id: "1" })]);
    getCurrentHelpdeskStaffNameMock.mockResolvedValueOnce(null);

    const jsx = await HelpdeskInquiryKpiPanel({ listHref: "/helpdesk/inquiries" });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "helpdeskDashboard.kpi.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries");
  });
});
