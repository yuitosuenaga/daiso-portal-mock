import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  appendHistoryEntry: vi.fn(),
  listHistory: vi.fn(),
}));

import {
  appendHistoryEntry,
  listHistory,
} from "@/lib/server/inquiry-service";
import {
  appendInquiryHistoryEntry,
  getInquiryHistory,
} from "@/lib/api/inquiry-history";

describe("getInquiryHistory", () => {
  it("listHistoryへ委譲する", async () => {
    vi.mocked(listHistory).mockResolvedValue([
      {
        id: "history-1",
        inquiryId: "inquiry-1",
        type: "claimed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const result = await getInquiryHistory("inquiry-1");

    expect(listHistory).toHaveBeenCalledWith("inquiry-1");
    expect(result).toHaveLength(1);
  });
});

describe("appendInquiryHistoryEntry", () => {
  it("appendHistoryEntryへ委譲する", async () => {
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-1",
      type: "requester_message",
      actorName: "Test Co.",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const entry = {
      inquiryId: "inquiry-1",
      type: "requester_message" as const,
      actorName: "Test Co.",
      occurredAt: "2026-07-01T00:00:00.000Z",
    };
    const result = await appendInquiryHistoryEntry(entry);

    expect(appendHistoryEntry).toHaveBeenCalledWith(entry);
    expect(result.id).toBe("history-1");
  });
});
