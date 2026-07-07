import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InquiryHistoryList } from "@/components/features/inquiry-list/InquiryHistoryList";
import messages from "../../../../messages/ja.json";

const getInquiryHistoryMock = vi.fn();

vi.mock("@/lib/api/inquiry-history", () => ({
  getInquiryHistory: (...args: unknown[]) => getInquiryHistoryMock(...args),
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

describe("InquiryHistoryList", () => {
  it("対応履歴が0件のとき空状態メッセージを表示する", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("まだ対応履歴はありません")).toBeTruthy();
  });

  it("取得に失敗したときエラーメッセージを表示する", async () => {
    getInquiryHistoryMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("対応履歴の取得に失敗しました")).toBeTruthy();
  });

  it("返信の履歴を返信ラベルと本文とともに表示し、担当者名は表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "reply_sent",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "ご返信内容: 交換対応いたします。",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("返信")).toBeTruthy();
    expect(
      screen.getByText("ご返信内容: 交換対応いたします。")
    ).toBeTruthy();
    expect(screen.queryByText("田中 太郎")).toBeNull();
  });

  it("対応状況変更の履歴を変更後の内容とともに表示し、担当者名は表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "status_changed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "新規 → 解決済み",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("新規 → 解決済み")).toBeTruthy();
    expect(screen.queryByText("田中 太郎")).toBeNull();
  });

  it("対応中の履歴を固定文言で表示し、担当者名は表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "claimed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("対応中になりました")).toBeTruthy();
    expect(screen.queryByText("田中 太郎")).toBeNull();
  });

  it("対応解除の履歴を固定文言で表示し、担当者名は表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "released",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("対応中の状態を解除しました")).toBeTruthy();
    expect(screen.queryByText("田中 太郎")).toBeNull();
  });

  it("複数件を取得結果の順序通りに表示する", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h2",
        inquiryId: "inquiry-001",
        type: "status_changed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "新規 → 対応中",
      },
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "claimed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("新規 → 対応中");
    expect(items[1].textContent).toContain("対応中になりました");
  });

  it("返信に添付ファイルがあるとき、ダウンロードリンクを表示する", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "reply_sent",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "交換対応いたします。",
        attachments: [
          {
            id: "att-1",
            fileName: "manual.pdf",
            fileType: "application/pdf",
            fileSize: 2048,
            dataUrl: "data:application/pdf;base64,AAAA",
          },
        ],
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    const link = screen.getByRole("link", { name: /manual\.pdf/ });
    expect(link.getAttribute("href")).toBe("data:application/pdf;base64,AAAA");
  });

  it("返信に添付ファイルがないとき、添付ファイルのリンクを表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "reply_sent",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "交換対応いたします。",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("対応状況変更の履歴には添付ファイルフィールドがなくても正常に表示する", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "status_changed",
        actorName: "田中 太郎",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "新規 → 解決済み",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("送信したメッセージをラベルと本文とともに表示し、会社名は表示しない", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "requester_message",
        actorName: "Daiso Vietnam Co., Ltd.",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "発送予定日を教えてください。",
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("送信したメッセージ")).toBeTruthy();
    expect(screen.getByText("発送予定日を教えてください。")).toBeTruthy();
    expect(screen.queryByText("Daiso Vietnam Co., Ltd.")).toBeNull();
  });

  it("送信したメッセージに添付ファイルがあるとき、ダウンロードリンクを表示する", async () => {
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "requester_message",
        actorName: "Daiso Vietnam Co., Ltd.",
        occurredAt: "2026-07-02T00:00:00.000Z",
        detail: "資料を添付します。",
        attachments: [
          {
            id: "att-1",
            fileName: "memo.pdf",
            fileType: "application/pdf",
            fileSize: 200,
            dataUrl: "data:application/pdf;base64,AAAA",
          },
        ],
      },
    ]);

    const jsx = await InquiryHistoryList({ inquiryId: "inquiry-001" });
    render(jsx);

    const link = screen.getByRole("link", { name: /memo\.pdf/ });
    expect(link.getAttribute("href")).toBe("data:application/pdf;base64,AAAA");
  });
});
