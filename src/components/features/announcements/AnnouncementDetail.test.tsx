import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementDetail } from "@/components/features/announcements/AnnouncementDetail";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const getAnnouncementByIdMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncementById: (...args: unknown[]) => getAnnouncementByIdMock(...args),
}));

const getAnnouncementSelfStatusMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: "2026-07-01T00:00:00Z",
    completedAt: null,
  })
);

vi.mock("@/lib/api/announcement-tracking", () => ({
  isReminderPendingForCompany: async () => false,
  getAnnouncementSelfStatus: (id: string) => getAnnouncementSelfStatusMock(id),
}));

const confirmAnnouncementActionMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: "2026-07-01T00:00:00Z",
    completedAt: null,
  })
);
const completeAnnouncementActionMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: "2026-07-01T00:00:00Z",
    completedAt: "2026-07-13T00:00:00Z",
  })
);

vi.mock("@/lib/actions/announcement-tracking", () => ({
  confirmAnnouncementAction: (id: string) => confirmAnnouncementActionMock(id),
  completeAnnouncementAction: (id: string) => completeAnnouncementActionMock(id),
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

function resolveMessage(namespace: string, key: string): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : `${namespace}.${key}`;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

const ANNOUNCEMENT: Announcement = {
  id: "1",
  title: "テストお知らせ詳細",
  status: "published",
  publishedAt: "2026-07-01T09:00:00Z",
  category: "incident",
  body: "詳細本文テキスト",
  targeting: { scope: "all" },
  actionRequired: false,
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
};

describe("AnnouncementDetail", () => {
  beforeEach(() => {
    getAnnouncementSelfStatusMock.mockClear();
    confirmAnnouncementActionMock.mockClear();
    completeAnnouncementActionMock.mockClear();
  });

  it("getAnnouncementByIdがnullを返したとき見つからないメッセージを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);

    const jsx = await AnnouncementDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("お知らせが見つかりません")).toBeTruthy();
  });

  it("getAnnouncementByIdが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAnnouncementByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("お知らせの取得に失敗しました")).toBeTruthy();
  });

  it("見つからない状態とエラー状態は異なるメッセージで表示される", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);
    const { unmount } = render(await AnnouncementDetail({ id: "not-exist" }));
    const notFoundText = screen.getByText("お知らせが見つかりません").textContent;
    unmount();

    getAnnouncementByIdMock.mockRejectedValueOnce(new Error("network error"));
    render(await AnnouncementDetail({ id: "1" }));
    const errorText = screen.getByText("お知らせの取得に失敗しました").textContent;

    expect(notFoundText).not.toBe(errorText);
  });

  it("取得成功時にタイトル・本文を表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(ANNOUNCEMENT);

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("テストお知らせ詳細")).toBeTruthy();
    expect(screen.getByText("詳細本文テキスト")).toBeTruthy();
  });

  it("常に一覧へ戻るリンクを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);

    const jsx = await AnnouncementDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });

  it("actionRequiredが真かつdueDate設定時に対応期限を表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce({
      ...ANNOUNCEMENT,
      actionRequired: true,
      dueDate: "2026-07-14",
    });

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText(/対応期限/)).toBeTruthy();
  });

  it("actionRequiredが偽のときは対応期限を表示しない", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce({
      ...ANNOUNCEMENT,
      actionRequired: false,
      dueDate: "2026-07-14",
    });

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.queryByText(/対応期限/)).toBeNull();
  });

  it("getAnnouncementSelfStatusを呼び出し、確認済みバッジを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(ANNOUNCEMENT);

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(getAnnouncementSelfStatusMock).toHaveBeenCalledWith("1");
    expect(screen.getByText("確認済み")).toBeTruthy();
  });

  it("actionRequiredが真かつ未完了のとき「対応完了にする」ボタンを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce({
      ...ANNOUNCEMENT,
      actionRequired: true,
    });

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(
      screen.getByRole("button", { name: "対応完了にする" })
    ).toBeTruthy();
  });

  it("actionRequiredが偽のとき「対応完了にする」ボタンを表示しない", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce({
      ...ANNOUNCEMENT,
      actionRequired: false,
    });

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(
      screen.queryByRole("button", { name: "対応完了にする" })
    ).toBeNull();
  });

  it("初期状態が未確認のとき詳細画面表示時にconfirmAnnouncementActionが呼ばれる", async () => {
    getAnnouncementSelfStatusMock.mockResolvedValueOnce({
      confirmedAt: null,
      completedAt: null,
    });
    getAnnouncementByIdMock.mockResolvedValueOnce(ANNOUNCEMENT);

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    await waitFor(() => {
      expect(confirmAnnouncementActionMock).toHaveBeenCalledWith("1");
    });
  });
});
