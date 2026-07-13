import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/announcement-tracking", () => ({
  completeAnnouncementForCurrentCompany: vi.fn(),
  confirmAnnouncementForCurrentCompany: vi.fn(),
  sendAnnouncementReminders: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  completeAnnouncementForCurrentCompany,
  confirmAnnouncementForCurrentCompany,
  sendAnnouncementReminders,
} from "@/lib/api/announcement-tracking";
import {
  completeAnnouncementAction,
  confirmAnnouncementAction,
  sendAnnouncementRemindersAction,
} from "@/lib/actions/announcement-tracking";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendAnnouncementRemindersAction", () => {
  it("担当者IDを渡すとリマインドを送信し、関連ルートを再検証する", async () => {
    vi.mocked(sendAnnouncementReminders).mockResolvedValue(undefined);

    await sendAnnouncementRemindersAction("announcement-1", ["recipient-1"]);

    expect(sendAnnouncementReminders).toHaveBeenCalledWith("announcement-1", [
      "recipient-1",
    ]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("空配列を渡した場合は何もせず正常終了する", async () => {
    await sendAnnouncementRemindersAction("announcement-1", []);

    expect(sendAnnouncementReminders).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("confirmAnnouncementAction", () => {
  it("API層を呼び出し、関連ルートを再検証して最新の自己申告状態を返す", async () => {
    vi.mocked(confirmAnnouncementForCurrentCompany).mockResolvedValue({
      confirmedAt: "2026-07-13T00:00:00.000Z",
      completedAt: null,
    });

    const result = await confirmAnnouncementAction("announcement-1");

    expect(confirmAnnouncementForCurrentCompany).toHaveBeenCalledWith(
      "announcement-1"
    );
    expect(revalidatePath).toHaveBeenCalled();
    expect(result.confirmedAt).toBe("2026-07-13T00:00:00.000Z");
  });
});

describe("completeAnnouncementAction", () => {
  it("API層を呼び出し、関連ルートを再検証して最新の自己申告状態を返す", async () => {
    vi.mocked(completeAnnouncementForCurrentCompany).mockResolvedValue({
      confirmedAt: "2026-07-13T00:00:00.000Z",
      completedAt: "2026-07-13T00:00:00.000Z",
    });

    const result = await completeAnnouncementAction("announcement-1");

    expect(completeAnnouncementForCurrentCompany).toHaveBeenCalledWith(
      "announcement-1"
    );
    expect(revalidatePath).toHaveBeenCalled();
    expect(result.completedAt).toBe("2026-07-13T00:00:00.000Z");
  });
});
