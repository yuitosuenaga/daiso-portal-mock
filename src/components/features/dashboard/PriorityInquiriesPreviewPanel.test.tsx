import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PriorityInquiriesPreviewPanel } from "@/components/features/dashboard/PriorityInquiriesPreviewPanel";
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
  getLocale: async () => "ja",
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

describe("PriorityInquiriesPreviewPanel", () => {
  afterEach(() => {
    getAllInquiriesMock.mockReset();
  });

  it("新規・対応中の問い合わせを一覧表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new" }),
      makeInquiry({ id: "2", status: "in_progress" }),
    ]);

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("解決済みの問い合わせは対象外にする", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "resolved" }),
      makeInquiry({ id: "2", status: "new" }),
    ]);

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("対象が6件以上ある場合は上位5件のみ表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce(
      Array.from({ length: 7 }, (_, i) =>
        makeInquiry({ id: `${i}`, status: "new" })
      )
    );

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("対象が0件の場合は空状態メッセージを表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "resolved" }),
    ]);

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(
      screen.getByText("dashboard.priorityInquiriesPreview.empty")
    ).toBeTruthy();
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getAllInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    expect(
      screen.getByText("dashboard.priorityInquiriesPreview.error")
    ).toBeTruthy();
  });

  it("「一覧を見る」リンクがviewAllHrefを指す", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new" }),
    ]);

    const jsx = await PriorityInquiriesPreviewPanel({
      viewAllHref: "/helpdesk/inquiries",
    });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "dashboard.priorityInquiriesPreview.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries");
  });
});
