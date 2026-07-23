import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnresolvedInquiriesKpiPanel } from "@/components/features/dashboard/UnresolvedInquiriesKpiPanel";
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

vi.mock("@/lib/api/inquiries", () => ({
  getAllInquiries: (...args: unknown[]) => getAllInquiriesMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
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
    createdAt: new Date().toISOString(),
    submittedBy: { companyName: "Daiso Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

describe("UnresolvedInquiriesKpiPanel", () => {
  afterEach(() => {
    getAllInquiriesMock.mockReset();
  });

  it("全社の未対応件数と本日受付件数を表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new" }),
      makeInquiry({
        id: "2",
        status: "in_progress",
        createdAt: new Date(2000, 0, 1).toISOString(),
      }),
      makeInquiry({ id: "3", status: "resolved" }),
    ]);

    const jsx = await UnresolvedInquiriesKpiPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("未対応件数が0件の場合は「未対応なし」相当の表現を表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "resolved" }),
    ]);

    const jsx = await UnresolvedInquiriesKpiPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(
      screen.getAllByText("helpdeskDashboard.kpi.none").length
    ).toBeGreaterThan(0);
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getAllInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await UnresolvedInquiriesKpiPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(screen.getByText("helpdeskDashboard.kpi.error")).toBeTruthy();
  });

  it("「一覧を見る」リンクがviewAllHrefを指す", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new" }),
    ]);

    const jsx = await UnresolvedInquiriesKpiPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "helpdeskDashboard.kpi.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries");
  });
});
