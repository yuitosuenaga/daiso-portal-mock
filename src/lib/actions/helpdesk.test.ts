import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
import {
  claimInquiryAction,
  releaseInquiryClaimAction,
  changeInquiryStatusAction,
  sendInquiryReplyAction,
  createReplyTemplateAction,
  updateReplyTemplateAction,
} from "@/lib/actions/helpdesk";
import { getInquiryById } from "@/lib/api/inquiries";
import { getInquiryHistory } from "@/lib/api/inquiry-history";
import { getReplyTemplateById } from "@/lib/api/reply-templates";
import { MOCK_CURRENT_STAFF_NAME } from "@/lib/constants/helpdesk";

describe("claimInquiryAction / releaseInquiryClaimAction", () => {
  it("対応中にすると claim が設定され、履歴に記録され、ルートが再検証される", async () => {
    await claimInquiryAction("inquiry-004");

    const inquiry = await getInquiryById("inquiry-004");
    expect(inquiry?.claim?.staffName).toBe(MOCK_CURRENT_STAFF_NAME);

    const history = await getInquiryHistory("inquiry-004");
    expect(history[0].type).toBe("claimed");
    expect(history[0].actorName).toBe(MOCK_CURRENT_STAFF_NAME);

    expect(revalidatePath).toHaveBeenCalled();
  });

  it("対応を外すと claim が解除され、履歴に記録される", async () => {
    await claimInquiryAction("inquiry-004");
    await releaseInquiryClaimAction("inquiry-004");

    const inquiry = await getInquiryById("inquiry-004");
    expect(inquiry?.claim).toBeNull();

    const history = await getInquiryHistory("inquiry-004");
    expect(history[0].type).toBe("released");
  });
});

describe("changeInquiryStatusAction", () => {
  it("ステータスを変更し、変更前後の値を翻訳済みラベルで履歴に記録する", async () => {
    await changeInquiryStatusAction("inquiry-006", "in_progress");

    const inquiry = await getInquiryById("inquiry-006");
    expect(inquiry?.status).toBe("in_progress");

    const history = await getInquiryHistory("inquiry-006");
    expect(history[0].type).toBe("status_changed");
    expect(history[0].detail).toBe("解決済み → 対応中");
  });

  it("不正なステータス値を渡すと例外になり、データが変更されない", async () => {
    const before = await getInquiryById("inquiry-006");

    await expect(
      changeInquiryStatusAction(
        "inquiry-006",
        "not-a-real-status" as unknown as "new"
      )
    ).rejects.toThrow();

    const after = await getInquiryById("inquiry-006");
    expect(after?.status).toBe(before?.status);
  });
});

describe("sendInquiryReplyAction", () => {
  it("返信内容を履歴に記録する", async () => {
    await sendInquiryReplyAction("inquiry-008", "ご返信ありがとうございます。");

    const history = await getInquiryHistory("inquiry-008");
    expect(history[0].type).toBe("reply_sent");
    expect(history[0].detail).toContain("ご返信ありがとうございます。");
  });

  it("空文字・空白のみの返信内容は例外になり、履歴に記録されない", async () => {
    const before = await getInquiryHistory("inquiry-002");

    await expect(sendInquiryReplyAction("inquiry-002", "   ")).rejects.toThrow();

    const after = await getInquiryHistory("inquiry-002");
    expect(after).toEqual(before);
  });
});

describe("createReplyTemplateAction / updateReplyTemplateAction", () => {
  it("有効な入力でテンプレートを作成する", async () => {
    const created = await createReplyTemplateAction({
      category: "other",
      body: "新規テンプレート本文",
    });

    expect(created.id).toBeTruthy();
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力（本文空）は例外になる", async () => {
    await expect(
      createReplyTemplateAction({ category: "other", body: "" })
    ).rejects.toThrow();
  });

  it("既存テンプレートを更新する", async () => {
    const created = await createReplyTemplateAction({
      category: "system",
      body: "更新前の本文",
    });

    await updateReplyTemplateAction(created.id, {
      category: "system",
      body: "更新後の本文",
    });

    const result = await getReplyTemplateById(created.id);
    expect(result?.body).toBe("更新後の本文");
  });
});
