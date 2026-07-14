import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementSelfReportPanel } from "@/components/features/announcements/AnnouncementSelfReportPanel";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const confirmAnnouncementActionMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: "2026-07-13T00:00:00Z",
    completedAt: null,
  })
);
const completeAnnouncementActionMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: "2026-07-13T00:00:00Z",
    completedAt: "2026-07-13T01:00:00Z",
  })
);

vi.mock("@/lib/actions/announcement-tracking", () => ({
  confirmAnnouncementAction: (id: string) => confirmAnnouncementActionMock(id),
  completeAnnouncementAction: (id: string) => completeAnnouncementActionMock(id),
}));

describe("AnnouncementSelfReportPanel", () => {
  beforeEach(() => {
    confirmAnnouncementActionMock.mockClear();
    completeAnnouncementActionMock.mockClear();
  });

  it("初期状態が未確認のときマウント時にconfirmAnnouncementActionを呼び出す", async () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired={false}
        initialStatus={{ confirmedAt: null, completedAt: null }}
      />
    );

    expect(confirmAnnouncementActionMock).toHaveBeenCalledWith("a-1");

    await waitFor(() => {
      expect(
        screen.getByText("announcements.selfReport.confirmed")
      ).toBeTruthy();
    });
  });

  it("既に確認済みのときマウント時にconfirmAnnouncementActionを呼び出さない", () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired={false}
        initialStatus={{ confirmedAt: "2026-07-01T00:00:00Z", completedAt: null }}
      />
    );

    expect(confirmAnnouncementActionMock).not.toHaveBeenCalled();
    expect(screen.getByText("announcements.selfReport.confirmed")).toBeTruthy();
  });

  it("actionRequiredが偽のとき「対応完了にする」ボタンを表示しない", () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired={false}
        initialStatus={{ confirmedAt: "2026-07-01T00:00:00Z", completedAt: null }}
      />
    );

    expect(
      screen.queryByText("announcements.selfReport.completeButton")
    ).toBeNull();
  });

  it("actionRequiredが真かつ未完了のとき「対応完了にする」ボタンを表示する", () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired
        initialStatus={{ confirmedAt: "2026-07-01T00:00:00Z", completedAt: null }}
      />
    );

    expect(
      screen.getByText("announcements.selfReport.completeButton")
    ).toBeTruthy();
  });

  it("既に対応完了済みのとき「対応完了にする」ボタンを表示せず対応完了済み表示のみ行う", () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired
        initialStatus={{
          confirmedAt: "2026-07-01T00:00:00Z",
          completedAt: "2026-07-02T00:00:00Z",
        }}
      />
    );

    expect(
      screen.queryByText("announcements.selfReport.completeButton")
    ).toBeNull();
    expect(screen.getByText("announcements.selfReport.completed")).toBeTruthy();
  });

  it("「対応完了にする」ボタン押下でcompleteAnnouncementActionを呼び出し、対応完了表示に切り替わる", async () => {
    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired
        initialStatus={{ confirmedAt: "2026-07-01T00:00:00Z", completedAt: null }}
      />
    );

    fireEvent.click(
      screen.getByText("announcements.selfReport.completeButton")
    );

    await waitFor(() => {
      expect(completeAnnouncementActionMock).toHaveBeenCalledWith("a-1");
    });
    await waitFor(() => {
      expect(screen.getByText("announcements.selfReport.completed")).toBeTruthy();
    });
    expect(
      screen.queryByText("announcements.selfReport.completeButton")
    ).toBeNull();
  });

  it("confirmAnnouncementActionが失敗してもエラーを投げず、ローカル状態を変更しない", async () => {
    confirmAnnouncementActionMock.mockRejectedValueOnce(new Error("network error"));

    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired={false}
        initialStatus={{ confirmedAt: null, completedAt: null }}
      />
    );

    await waitFor(() => {
      expect(confirmAnnouncementActionMock).toHaveBeenCalledWith("a-1");
    });

    expect(
      screen.queryByText("announcements.selfReport.confirmed")
    ).toBeNull();
  });

  it("completeAnnouncementActionが失敗してもエラーを投げず、ボタンを表示し続ける", async () => {
    completeAnnouncementActionMock.mockRejectedValueOnce(new Error("network error"));

    render(
      <AnnouncementSelfReportPanel
        announcementId="a-1"
        actionRequired
        initialStatus={{ confirmedAt: "2026-07-01T00:00:00Z", completedAt: null }}
      />
    );

    fireEvent.click(
      screen.getByText("announcements.selfReport.completeButton")
    );

    await waitFor(() => {
      expect(completeAnnouncementActionMock).toHaveBeenCalledWith("a-1");
    });

    expect(
      screen.getByText("announcements.selfReport.completeButton")
    ).toBeTruthy();
    expect(
      screen.queryByText("announcements.selfReport.completed")
    ).toBeNull();
  });
});
