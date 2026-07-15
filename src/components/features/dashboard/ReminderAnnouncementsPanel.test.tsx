import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReminderAnnouncementsPanel } from "@/components/features/dashboard/ReminderAnnouncementsPanel";
import type { Announcement } from "@/types/announcement";

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

const getAnnouncementsMock = vi.fn();
const isReminderPendingForCompanyMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: (...args: unknown[]) => getAnnouncementsMock(...args),
}));

vi.mock("@/lib/api/announcement-tracking", () => ({
  isReminderPendingForCompany: (...args: unknown[]) =>
    isReminderPendingForCompanyMock(...args),
}));

vi.mock("@/lib/server/auth-session", () => ({
  requireApplicantSession: async () => ({
    claims: {
      role: "applicant",
      applicantUserId: "applicant-1",
      companyId: "company-1",
      companyName: "Test Co.",
      companyCode: "test-co",
      country: "JP",
    },
  }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

function makeAnnouncement(
  id: string,
  title: string,
  overrides: Partial<Announcement> = {}
): Announcement {
  return {
    id,
    title,
    status: "published",
    publishedAt: "2026-07-01T09:00:00Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: true,
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
    attachments: [],
    linkedDocumentIds: [],
    ...overrides,
  };
}

describe("ReminderAnnouncementsPanel", () => {
  afterEach(() => {
    getAnnouncementsMock.mockReset();
    isReminderPendingForCompanyMock.mockReset();
  });

  it("リマインド対象のお知らせのみを一覧表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "リマインド対象のお知らせ"),
      makeAnnouncement("2", "通常のお知らせ"),
    ]);
    isReminderPendingForCompanyMock.mockImplementation(
      async (announcementId: string) => announcementId === "1"
    );

    const jsx = await ReminderAnnouncementsPanel();
    expect(jsx).not.toBeNull();
    render(jsx);

    expect(screen.getByText("リマインド対象のお知らせ")).toBeTruthy();
    expect(screen.queryByText("通常のお知らせ")).toBeNull();
  });

  it("リマインド対象のお知らせの本文要約を表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "リマインド対象のお知らせ", {
        body: "本文の要約テキスト",
      }),
    ]);
    isReminderPendingForCompanyMock.mockResolvedValue(true);

    const jsx = await ReminderAnnouncementsPanel();
    render(jsx);

    expect(screen.getByText("本文の要約テキスト")).toBeTruthy();
  });

  it("リマインド対象が0件の場合は何も描画しない", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "通常のお知らせ"),
    ]);
    isReminderPendingForCompanyMock.mockResolvedValue(false);

    const jsx = await ReminderAnnouncementsPanel();

    expect(jsx).toBeNull();
  });

  it("データ取得が失敗した場合は何も描画せず、例外をスローしない", async () => {
    getAnnouncementsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await ReminderAnnouncementsPanel();

    expect(jsx).toBeNull();
  });
});
