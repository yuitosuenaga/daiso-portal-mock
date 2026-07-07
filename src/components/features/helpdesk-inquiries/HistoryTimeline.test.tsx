import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HistoryTimeline } from "@/components/features/helpdesk-inquiries/HistoryTimeline";

describe("HistoryTimeline", () => {
  it("履歴が0件のとき空状態メッセージを表示する", () => {
    render(
      <HistoryTimeline
        entries={[]}
        emptyMessage="対応履歴はありません"
        typeLabels={{
          claimed: "対応中にしました",
          released: "対応を外しました",
          status_changed: "対応状況を変更しました",
          reply_sent: "返信を送信しました",
          requester_message: "申請者からのメッセージ",
        }}
        locale="ja"
      />
    );

    expect(screen.getByText("対応履歴はありません")).toBeTruthy();
  });

  it("履歴を新しい順に操作内容・操作者とともに表示する", () => {
    render(
      <HistoryTimeline
        entries={[
          {
            id: "h2",
            inquiryId: "inquiry-001",
            type: "status_changed",
            actorName: "田中 太郎",
            occurredAt: "2026-07-02T00:00:00.000Z",
            detail: "new -> in_progress",
          },
          {
            id: "h1",
            inquiryId: "inquiry-001",
            type: "claimed",
            actorName: "田中 太郎",
            occurredAt: "2026-07-01T00:00:00.000Z",
          },
        ]}
        emptyMessage="対応履歴はありません"
        typeLabels={{
          claimed: "対応中にしました",
          released: "対応を外しました",
          status_changed: "対応状況を変更しました",
          reply_sent: "返信を送信しました",
          requester_message: "申請者からのメッセージ",
        }}
        locale="ja"
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("対応状況を変更しました");
    expect(items[1].textContent).toContain("対応中にしました");
    expect(screen.getAllByText("田中 太郎").length).toBe(2);
  });

  it("返信に添付ファイルがあるとき、プレビュー・ダウンロードリンクを表示する", () => {
    const { container } = render(
      <HistoryTimeline
        entries={[
          {
            id: "h1",
            inquiryId: "inquiry-001",
            type: "reply_sent",
            actorName: "田中 太郎",
            occurredAt: "2026-07-01T00:00:00.000Z",
            detail: "写真を添付します。",
            attachments: [
              {
                id: "att-1",
                fileName: "photo.png",
                fileType: "image/png",
                fileSize: 100,
                dataUrl: "data:image/png;base64,AAAA",
              },
            ],
          },
        ]}
        emptyMessage="対応履歴はありません"
        typeLabels={{
          claimed: "対応中にしました",
          released: "対応を外しました",
          status_changed: "対応状況を変更しました",
          reply_sent: "返信を送信しました",
          requester_message: "申請者からのメッセージ",
        }}
        locale="ja"
      />
    );

    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.download).toBe("photo.png");
    // サムネイルは装飾扱い（alt=""）のためrole="img"ではなくCSSセレクタで取得する
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("申請者からのメッセージを他の履歴種別と時系列で混在させて表示する", () => {
    render(
      <HistoryTimeline
        entries={[
          {
            id: "h2",
            inquiryId: "inquiry-001",
            type: "requester_message",
            actorName: "Daiso Vietnam Co., Ltd.",
            occurredAt: "2026-07-02T00:00:00.000Z",
            detail: "発送予定日を教えてください。",
          },
          {
            id: "h1",
            inquiryId: "inquiry-001",
            type: "claimed",
            actorName: "田中 太郎",
            occurredAt: "2026-07-01T00:00:00.000Z",
          },
        ]}
        emptyMessage="対応履歴はありません"
        typeLabels={{
          claimed: "対応中にしました",
          released: "対応を外しました",
          status_changed: "対応状況を変更しました",
          reply_sent: "返信を送信しました",
          requester_message: "申請者からのメッセージ",
        }}
        locale="ja"
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("申請者からのメッセージ");
    expect(items[0].textContent).toContain("Daiso Vietnam Co., Ltd.");
    expect(items[0].textContent).toContain("発送予定日を教えてください。");
    expect(items[1].textContent).toContain("対応中にしました");
  });

  it("申請者からのメッセージに添付ファイルがあるとき、プレビュー・ダウンロードリンクを表示する", () => {
    render(
      <HistoryTimeline
        entries={[
          {
            id: "h1",
            inquiryId: "inquiry-001",
            type: "requester_message",
            actorName: "Daiso Vietnam Co., Ltd.",
            occurredAt: "2026-07-01T00:00:00.000Z",
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
        ]}
        emptyMessage="対応履歴はありません"
        typeLabels={{
          claimed: "対応中にしました",
          released: "対応を外しました",
          status_changed: "対応状況を変更しました",
          reply_sent: "返信を送信しました",
          requester_message: "申請者からのメッセージ",
        }}
        locale="ja"
      />
    );

    const link = screen.getByRole("link", { name: /memo\.pdf/ }) as HTMLAnchorElement;
    expect(link.download).toBe("memo.pdf");
  });
});
