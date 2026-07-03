import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttachmentField } from "@/components/features/inquiry-form/AttachmentField";
import * as attachmentUtils from "@/lib/attachment-utils";
import { ATTACHMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/attachment";
import type { InquiryAttachment } from "@/types/attachment";

const labels = {
  label: "添付ファイル",
  hint: "画像またはPDF、1件5MBまで、最大5件まで添付できます。",
  removeButtonLabel: "削除",
  sizeExceededMessage: "ファイルサイズが上限（5MB）を超えています",
  typeNotAllowedMessage: "許可されていないファイル形式です（画像またはPDFのみ）",
  countExceededMessage: "添付できるファイル数の上限（5件）を超えています",
  readFailedMessage: "ファイルの読み込みに失敗しました。もう一度お試しください。",
};

function buildAttachment(
  overrides: Partial<InquiryAttachment> = {}
): InquiryAttachment {
  return {
    id: "att-1",
    fileName: "photo.png",
    fileType: "image/png",
    fileSize: 100,
    dataUrl: "data:image/png;base64,AAAA",
    ...overrides,
  };
}

describe("AttachmentField", () => {
  it("ラベル・ヒントを表示する", () => {
    render(<AttachmentField value={[]} onChange={vi.fn()} {...labels} />);

    expect(screen.getByText("添付ファイル")).toBeTruthy();
    expect(
      screen.getByText("画像またはPDF、1件5MBまで、最大5件まで添付できます。")
    ).toBeTruthy();
  });

  it("画像ファイルを選択するとサムネイル付きで一覧に追加される", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AttachmentField value={[]} onChange={onChange} {...labels} />);

    const file = new File([new Uint8Array(100)], "photo.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const attachments = onChange.mock.calls[0][0] as InquiryAttachment[];
    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileName).toBe("photo.png");
    expect(attachments[0].dataUrl.startsWith("data:image/png")).toBe(true);
  });

  it("非画像ファイル（PDF）を選択するとファイル名・サイズが一覧に表示される", () => {
    const attachment = buildAttachment({
      fileName: "document.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
    });
    render(
      <AttachmentField value={[attachment]} onChange={vi.fn()} {...labels} />
    );

    expect(screen.getByText(/document\.pdf/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("画像ファイルはサムネイルとして表示される", () => {
    const attachment = buildAttachment();
    render(
      <AttachmentField value={[attachment]} onChange={vi.fn()} {...labels} />
    );

    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toBe(attachment.dataUrl);
  });

  it("削除ボタンをクリックすると一覧から除外される", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const attachment = buildAttachment();
    render(
      <AttachmentField value={[attachment]} onChange={onChange} {...labels} />
    );

    await user.click(screen.getByRole("button", { name: /削除/ }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("最大サイズを超えるファイルを選択するとエラーメッセージを表示し、一覧に追加しない", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AttachmentField value={[]} onChange={onChange} {...labels} />);

    const file = new File(
      [new Uint8Array(ATTACHMENT_MAX_FILE_SIZE_BYTES + 1)],
      "huge.png",
      { type: "image/png" }
    );
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    await user.upload(input, file);

    expect(
      screen.getByText("ファイルサイズが上限（5MB）を超えています")
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("許可されていない形式のファイルを選択するとエラーメッセージを表示する", () => {
    // input の accept 属性による絞り込みを介さず、OSの「すべてのファイル」選択などで
    // 許可外の形式が渡されたケースを直接シミュレートする（user.upload は accept を尊重して除外するため使えない）
    const onChange = vi.fn();
    render(<AttachmentField value={[]} onChange={onChange} {...labels} />);

    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(
      screen.getByText(
        "許可されていないファイル形式です（画像またはPDFのみ）"
      )
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("件数が上限に達しているとき新たな選択でエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const existing = Array.from({ length: 5 }, (_, i) =>
      buildAttachment({ id: `att-${i}`, fileName: `file-${i}.png` })
    );
    render(
      <AttachmentField value={existing} onChange={onChange} {...labels} />
    );

    const file = new File([new Uint8Array(100)], "one-more.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    await user.upload(input, file);

    expect(
      screen.getByText("添付できるファイル数の上限（5件）を超えています")
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("一部のファイルの読み込みに失敗しても、成功した他のファイルは反映されエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const spy = vi
      .spyOn(attachmentUtils, "readFileAsDataUrl")
      .mockRejectedValueOnce(new Error("read failed"));
    render(<AttachmentField value={[]} onChange={onChange} {...labels} />);

    const brokenFile = new File([new Uint8Array(100)], "broken.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    await user.upload(input, brokenFile);

    await waitFor(() => {
      expect(
        screen.getByText(
          "ファイルの読み込みに失敗しました。もう一度お試しください。"
        )
      ).toBeTruthy();
    });
    expect(onChange).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
