import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import type { InquiryAttachment } from "@/types/attachment";

function buildAttachment(
  overrides: Partial<InquiryAttachment> = {}
): InquiryAttachment {
  return {
    id: "att-1",
    fileName: "photo.png",
    fileType: "image/png",
    fileSize: 1024,
    dataUrl: "data:image/png;base64,AAAA",
    ...overrides,
  };
}

describe("AttachmentPreviewList", () => {
  it("添付ファイルが0件のとき何も表示しない", () => {
    const { container } = render(<AttachmentPreviewList attachments={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("画像ファイルはサムネイル画像として表示する", () => {
    const attachment = buildAttachment();
    const { container } = render(
      <AttachmentPreviewList attachments={[attachment]} />
    );

    // サムネイルは装飾扱い（alt=""）のためrole="img"ではなくCSSセレクタで取得する
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.src).toBe(attachment.dataUrl);
  });

  it("非画像ファイルはファイル名・サイズをテキストで表示する", () => {
    const attachment = buildAttachment({
      fileName: "document.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
    });
    const { container } = render(
      <AttachmentPreviewList attachments={[attachment]} />
    );

    expect(screen.getByText(/document\.pdf/)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("各添付ファイルはダウンロードリンクとしてラップされる", () => {
    const attachment = buildAttachment();
    render(<AttachmentPreviewList attachments={[attachment]} />);

    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.href).toBe(attachment.dataUrl);
    expect(link.download).toBe(attachment.fileName);
  });

  it("複数件の添付ファイルをすべて表示する", () => {
    const attachments = [
      buildAttachment({ id: "att-1", fileName: "photo.png" }),
      buildAttachment({
        id: "att-2",
        fileName: "doc.pdf",
        fileType: "application/pdf",
      }),
    ];
    render(<AttachmentPreviewList attachments={attachments} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
