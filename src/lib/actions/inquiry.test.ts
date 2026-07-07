import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { sendApplicantMessageAction } from "@/lib/actions/inquiry";
import { getInquiryById } from "@/lib/api/inquiries";
import { getInquiryHistory } from "@/lib/api/inquiry-history";

describe("sendApplicantMessageAction", () => {
  it("メッセージ本文を対応履歴にrequester_messageとして記録する", async () => {
    const inquiry = await getInquiryById("inquiry-009");

    await sendApplicantMessageAction(
      "inquiry-009",
      "発送予定日を教えてください。"
    );

    const history = await getInquiryHistory("inquiry-009");
    expect(history[0].type).toBe("requester_message");
    expect(history[0].detail).toBe("発送予定日を教えてください。");
    expect(history[0].actorName).toBe(inquiry?.submittedBy.companyName);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("空文字・空白のみのメッセージ本文は例外になり、履歴に記録されない", async () => {
    const before = await getInquiryHistory("inquiry-002");

    await expect(sendApplicantMessageAction("inquiry-002", "   ")).rejects.toThrow();

    const after = await getInquiryHistory("inquiry-002");
    expect(after).toEqual(before);
  });

  it("添付ファイル付きでメッセージを送信すると、対応履歴に添付ファイルが記録される", async () => {
    const attachment = {
      id: "att-1",
      fileName: "memo.pdf",
      fileType: "application/pdf",
      fileSize: 200,
      dataUrl: "data:application/pdf;base64,AAAA",
    };

    await sendApplicantMessageAction("inquiry-007", "資料を添付します。", [
      attachment,
    ]);

    const history = await getInquiryHistory("inquiry-007");
    expect(history[0].type).toBe("requester_message");
    expect(history[0].attachments).toEqual([attachment]);
  });

  it("存在しない問い合わせIDを渡すと例外になる", async () => {
    await expect(
      sendApplicantMessageAction("not-exist", "本文")
    ).rejects.toThrow();
  });

  it("メッセージ送信によってstatus・claimを変更しない", async () => {
    const before = await getInquiryById("inquiry-006");

    await sendApplicantMessageAction("inquiry-006", "追加のご連絡です。");

    const after = await getInquiryById("inquiry-006");
    expect(after?.status).toBe(before?.status);
    expect(after?.claim ?? null).toEqual(before?.claim ?? null);
  });
});
