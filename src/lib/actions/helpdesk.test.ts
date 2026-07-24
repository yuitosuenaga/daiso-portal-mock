import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  findInquiryById: vi.fn(),
  setClaim: vi.fn(),
  updateStatus: vi.fn(),
  updateStatusIfCurrent: vi.fn(),
  appendHistoryEntry: vi.fn(),
  ClaimOwnershipError: class ClaimOwnershipError extends Error {
    constructor(inquiryId: string) {
      super(`Claim not owned by acting staff: ${inquiryId}`);
      this.name = "ClaimOwnershipError";
    }
  },
}));
vi.mock("@/lib/api/reply-templates", () => ({
  createReplyTemplate: vi.fn(),
  updateReplyTemplate: vi.fn(),
  getReplyTemplateById: vi.fn(),
}));

vi.mock("next-intl/server", async () => {
  const messages = (await import("../../../messages/ja.json")).default;
  return {
    getTranslations: async (namespace: string) => {
      const segments = namespace.split(".");
      let value: unknown = messages;
      for (const segment of segments) {
        value = (value as Record<string, unknown>)[segment];
      }
      return (key: string) =>
        (value as Record<string, string>)[key] ?? `${namespace}.${key}`;
    },
  };
});

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/get-session";
import {
  appendHistoryEntry,
  ClaimOwnershipError,
  findInquiryById as findInquiryByIdService,
  setClaim,
  updateStatus,
  updateStatusIfCurrent,
} from "@/lib/server/inquiry-service";
import {
  claimInquiryAction,
  releaseInquiryClaimAction,
  changeInquiryStatusAction,
  sendInquiryReplyAction,
  createReplyTemplateAction,
  updateReplyTemplateAction,
} from "@/lib/actions/helpdesk";
import {
  createReplyTemplate,
  getReplyTemplateById,
  updateReplyTemplate,
} from "@/lib/api/reply-templates";
import {
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";
import type { Inquiry } from "@/types/inquiry";

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "鈴木 花子",
  },
};

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "inquiry-1",
    title: "商品破損についての問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "text",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
});

describe("claimInquiryAction / releaseInquiryClaimAction", () => {
  it("対応中にすると、ログイン中の担当者情報でclaimが設定され履歴に記録される", async () => {
    vi.mocked(setClaim).mockResolvedValue(inquiry());
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-004",
      type: "claimed",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    await claimInquiryAction("inquiry-004");

    expect(setClaim).toHaveBeenCalledWith(
      "inquiry-004",
      { staffId: "staff-1", displayName: "鈴木 花子" },
      "staff-1"
    );
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: "claimed", actorName: "鈴木 花子" })
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("対応を外すと、claimが解除され履歴に記録され、{ ok: true }を返す", async () => {
    vi.mocked(setClaim).mockResolvedValue(inquiry());
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-2",
      inquiryId: "inquiry-004",
      type: "released",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const result = await releaseInquiryClaimAction("inquiry-004");

    expect(setClaim).toHaveBeenCalledWith("inquiry-004", null, "staff-1");
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: "released", actorName: "鈴木 花子" })
    );
    expect(result).toEqual({ ok: true });
  });

  it("所有者不一致（ClaimOwnershipError）のとき、{ ok: false, reason: \"notOwner\" }を返し履歴を記録しない", async () => {
    vi.mocked(setClaim).mockRejectedValue(
      new ClaimOwnershipError("inquiry-004")
    );

    const result = await releaseInquiryClaimAction("inquiry-004");

    expect(result).toEqual({ ok: false, reason: "notOwner" });
    expect(appendHistoryEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("想定外の例外は再throwする", async () => {
    vi.mocked(setClaim).mockRejectedValue(new Error("unexpected"));

    await expect(releaseInquiryClaimAction("inquiry-004")).rejects.toThrow(
      "unexpected"
    );
  });
});

describe("changeInquiryStatusAction", () => {
  it("ステータスを変更し、変更前後の値を翻訳済みラベルでログイン中担当者名の履歴に記録する", async () => {
    vi.mocked(findInquiryByIdService).mockResolvedValue(
      inquiry({ status: "resolved" })
    );
    vi.mocked(updateStatus).mockResolvedValue(inquiry({ status: "in_progress" }));
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-006",
      type: "status_changed",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
      detail: "解決済み → 対応中",
    });

    await changeInquiryStatusAction("inquiry-006", "in_progress");

    expect(updateStatus).toHaveBeenCalledWith("inquiry-006", "in_progress");
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "status_changed",
        actorName: "鈴木 花子",
        detail: "解決済み → 対応中",
      })
    );
  });

  it("不正なステータス値を渡すと例外になり、更新処理を呼ばない", async () => {
    await expect(
      changeInquiryStatusAction(
        "inquiry-006",
        "not-a-real-status" as unknown as "new"
      )
    ).rejects.toThrow();

    expect(updateStatus).not.toHaveBeenCalled();
  });
});

describe("sendInquiryReplyAction", () => {
  it("ログイン中の担当者名で返信内容を履歴に記録する", async () => {
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-008",
      type: "reply_sent",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
      detail: "ご返信ありがとうございます。",
    });

    await sendInquiryReplyAction("inquiry-008", "ご返信ありがとうございます。");

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "reply_sent",
        actorName: "鈴木 花子",
        detail: "ご返信ありがとうございます。",
      })
    );
  });

  it("空文字・空白のみの返信内容は例外になり、履歴に記録されない", async () => {
    await expect(sendInquiryReplyAction("inquiry-002", "   ")).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("添付ファイル付きで返信すると、対応履歴に添付ファイルが記録される", async () => {
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-009",
      type: "reply_sent",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const attachment = {
      id: "att-1",
      fileName: "photo.png",
      fileType: "image/png",
      fileSize: 100,
      dataUrl: "data:image/png;base64,AAAA",
    };

    await sendInquiryReplyAction("inquiry-009", "写真を添付します。", [
      attachment,
    ]);

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [attachment] })
    );
  });

  it("添付ファイルを指定しない場合、attachmentsは未設定になる", async () => {
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-010",
      type: "reply_sent",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    await sendInquiryReplyAction("inquiry-010", "添付なしの返信です。");

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: undefined })
    );
  });

  it("不正な形状の添付ファイルを渡すと例外になり、履歴に記録されない", async () => {
    await expect(
      sendInquiryReplyAction("inquiry-002", "返信本文", [
        { fileName: "missing-required-fields.png" } as never,
      ])
    ).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("上限を超えるサイズの添付ファイルを渡すと例外になり、履歴に記録されない", async () => {
    await expect(
      sendInquiryReplyAction("inquiry-002", "返信本文", [
        {
          id: "att-huge",
          fileName: "huge.png",
          fileType: "image/png",
          fileSize: ATTACHMENT_MAX_FILE_SIZE_BYTES + 1,
          dataUrl: "data:image/png;base64,AAAA",
        },
      ])
    ).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("許可されていないMIMEタイプの添付ファイルを渡すと例外になる", async () => {
    await expect(
      sendInquiryReplyAction("inquiry-002", "返信本文", [
        {
          id: "att-1",
          fileName: "notes.txt",
          fileType: "text/plain",
          fileSize: 10,
          dataUrl: "data:text/plain;base64,AAAA",
        },
      ])
    ).rejects.toThrow();
  });

  it("data:スキーム以外のURLを添付ファイルに渡すと例外になる（javascript:等の拒否）", async () => {
    await expect(
      sendInquiryReplyAction("inquiry-002", "返信本文", [
        {
          id: "att-1",
          fileName: "photo.png",
          fileType: "image/png",
          fileSize: 10,
          dataUrl: "javascript:alert(1)",
        },
      ])
    ).rejects.toThrow();
  });

  it("件数上限を超える添付ファイルを渡すと例外になる", async () => {
    const attachments = Array.from({ length: ATTACHMENT_MAX_COUNT + 1 }, (_, i) => ({
      id: `att-${i}`,
      fileName: `file-${i}.png`,
      fileType: "image/png",
      fileSize: 10,
      dataUrl: "data:image/png;base64,AAAA",
    }));

    await expect(
      sendInquiryReplyAction("inquiry-002", "返信本文", attachments)
    ).rejects.toThrow();
  });

  it("送信時点のstatusがnewのとき、in_progressへ原子的に変更し履歴に記録する", async () => {
    vi.mocked(updateStatusIfCurrent).mockResolvedValue(true);
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-011",
      type: "reply_sent",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    await sendInquiryReplyAction("inquiry-011", "対応いたします。");

    expect(updateStatusIfCurrent).toHaveBeenCalledWith(
      "inquiry-011",
      "new",
      "in_progress"
    );
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "status_changed",
        actorName: "鈴木 花子",
        detail: "新規 → 対応中",
      })
    );
  });

  it("送信時点のstatusがnew以外のとき（updateStatusIfCurrentがfalseを返す）、status_changedを記録しない", async () => {
    vi.mocked(updateStatusIfCurrent).mockResolvedValue(false);
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-012",
      type: "reply_sent",
      actorName: "鈴木 花子",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    await sendInquiryReplyAction("inquiry-012", "追加のご連絡です。");

    expect(updateStatusIfCurrent).toHaveBeenCalledWith(
      "inquiry-012",
      "new",
      "in_progress"
    );
    expect(appendHistoryEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "status_changed" })
    );
  });
});

describe("createReplyTemplateAction / updateReplyTemplateAction", () => {
  it("有効な入力でテンプレートを作成する", async () => {
    vi.mocked(createReplyTemplate).mockResolvedValue({
      id: "template-1",
      category: "other",
      name: "新規テンプレート名",
      body: "新規テンプレート本文",
    });

    const created = await createReplyTemplateAction({
      category: "other",
      name: "新規テンプレート名",
      body: "新規テンプレート本文",
    });

    expect(created.id).toBeTruthy();
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力（本文空）は例外になる", async () => {
    await expect(
      createReplyTemplateAction({
        category: "other",
        name: "テンプレート名",
        body: "",
      })
    ).rejects.toThrow();

    expect(createReplyTemplate).not.toHaveBeenCalled();
  });

  it("既存テンプレートを更新する", async () => {
    vi.mocked(updateReplyTemplate).mockResolvedValue({
      id: "template-1",
      category: "system",
      name: "更新後の名前",
      body: "更新後の本文",
    });
    vi.mocked(getReplyTemplateById).mockResolvedValue({
      id: "template-1",
      category: "system",
      name: "更新後の名前",
      body: "更新後の本文",
    });

    await updateReplyTemplateAction("template-1", {
      category: "system",
      name: "更新後の名前",
      body: "更新後の本文",
    });

    const result = await getReplyTemplateById("template-1");
    expect(result?.name).toBe("更新後の名前");
    expect(result?.body).toBe("更新後の本文");
  });
});
