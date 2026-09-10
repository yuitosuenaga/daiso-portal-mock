import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicantInquiryKpiPanel } from "@/components/features/dashboard/ApplicantInquiryKpiPanel";
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

const getInquiriesMock = vi.fn();
const getUnreadReplyInquiryIdsMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getInquiries: (...args: unknown[]) => getInquiriesMock(...args),
  getUnreadReplyInquiryIds: (...args: unknown[]) =>
    getUnreadReplyInquiryIdsMock(...args),
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

describe("ApplicantInquiryKpiPanel", () => {
  afterEach(() => {
    getInquiriesMock.mockReset();
    getUnreadReplyInquiryIdsMock.mockReset();
  });

  it("未確認・未解決の件数を表示し、一覧への絞り込みリンクを生成する", async () => {
    getInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new" }),
      makeInquiry({ id: "2", status: "resolved" }),
    ]);
    getUnreadReplyInquiryIdsMock.mockResolvedValueOnce(["1"]);

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    const { container } = render(jsx);

    const unreadLink = container.querySelector('a[href="/inquiry?unread=1"]');
    expect(unreadLink?.textContent).toBe("1");

    const unresolvedLink = container.querySelector(
      'a[href="/inquiry?unresolved=1"]'
    );
    expect(unresolvedLink?.textContent).toBe("1");
  });

  it("問い合わせが0件の場合は簡略表示にする", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);
    getUnreadReplyInquiryIdsMock.mockResolvedValueOnce([]);

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    render(jsx);

    expect(screen.getByText("dashboard.inquiryKpi.empty")).toBeTruthy();
  });

  it("緊急度高の未解決が1件以上あるとき警告リンクを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([
      makeInquiry({ id: "1", status: "new", urgency: "high" }),
    ]);
    getUnreadReplyInquiryIdsMock.mockResolvedValueOnce([]);

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    render(jsx);

    const link = screen.getByRole("link", {
      name: /inquiryList.stats.highUrgencyAlert/,
    });
    expect(link.getAttribute("href")).toBe(
      "/inquiry?urgency=high&unresolved=1"
    );
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));
    getUnreadReplyInquiryIdsMock.mockResolvedValueOnce([]);

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    render(jsx);

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("未読ID取得のみ失敗しても一覧本体（KPI）は表示される", async () => {
    getInquiriesMock.mockResolvedValueOnce([makeInquiry({ id: "1" })]);
    getUnreadReplyInquiryIdsMock.mockRejectedValueOnce(new Error("failed"));

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    render(jsx);

    expect(screen.getByText("dashboard.inquiryKpi.title")).toBeTruthy();
  });

  it("「一覧を見る」リンクがlistHrefを指す", async () => {
    getInquiriesMock.mockResolvedValueOnce([makeInquiry({ id: "1" })]);
    getUnreadReplyInquiryIdsMock.mockResolvedValueOnce([]);

    const jsx = await ApplicantInquiryKpiPanel({ listHref: "/inquiry" });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "dashboard.inquiryKpi.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/inquiry");
  });
});
