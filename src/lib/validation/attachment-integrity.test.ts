import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
} from "@/lib/constants/attachment";
import {
  findAttachmentsIntegrityIssue,
  verifyAttachmentIntegrity,
  type AttachmentIntegrityInput,
} from "@/lib/validation/attachment-integrity";
import {
  inquiryAttachmentsArraySchema,
  inquiryAttachmentsStrictSchema,
} from "@/lib/validation/inquiry";

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const ascii = (text: string): number[] => Array.from(Buffer.from(text, "latin1"));
const PDF_HEAD = ascii("%PDF-1.4\n");
const GIF_HEAD = ascii("GIF89a");
const WEBP_HEAD = [...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")];

/** 先頭が `head`、全体が `size` バイトのファイルを表す添付を作る。 */
function make(
  head: number[],
  size: number,
  overrides: Partial<AttachmentIntegrityInput> = {}
): AttachmentIntegrityInput {
  const bytes = Buffer.alloc(size);
  Buffer.from(head).copy(bytes);
  const mime = overrides.fileType ?? "image/png";
  return {
    fileName: "photo.png",
    fileType: mime,
    fileSize: size,
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
    ...overrides,
  };
}

describe("verifyAttachmentIntegrity", () => {
  it.each([
    ["image/png", "a.png", PNG_HEAD],
    ["image/jpeg", "a.JPG", JPEG_HEAD],
    ["image/jpeg", "a.jpeg", JPEG_HEAD],
    ["image/jpeg", "a.jfif", JPEG_HEAD],
    ["image/jpeg", "a.jpe", JPEG_HEAD],
    ["image/gif", "a.gif", GIF_HEAD],
    ["image/webp", "a.webp", WEBP_HEAD],
    ["application/pdf", "a.pdf", PDF_HEAD],
  ])("正当な %s (%s) は通る", (fileType, fileName, head) => {
    const result = verifyAttachmentIntegrity(make(head, 100, { fileType, fileName }));
    expect(result).toEqual({ ok: true, decodedSize: 100 });
  });

  it("サイズが4の倍数でない（パディングあり）バイト列も実サイズで検証できる", () => {
    for (const size of [99, 100, 101]) {
      expect(verifyAttachmentIntegrity(make(PNG_HEAD, size))).toEqual({
        ok: true,
        decodedSize: size,
      });
    }
  });

  it("fileSize を小さく偽装した場合は size_mismatch", () => {
    const att = make(PNG_HEAD, 1000, { fileSize: 1 });
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "size_mismatch" });
  });

  it("fileSize を大きく偽装した場合も size_mismatch", () => {
    const att = make(PNG_HEAD, 10, { fileSize: 5000 });
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "size_mismatch" });
  });

  it("fileSize=1 と宣言して実際は上限超の dataUrl を送ると弾く", () => {
    const att = make(PNG_HEAD, ATTACHMENT_MAX_FILE_SIZE_BYTES + 1, { fileSize: 1 });
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "size_exceeded" });
  });

  it("極端に巨大な dataUrl は即座に size_exceeded", () => {
    const att = make(PNG_HEAD, 10);
    att.dataUrl = `data:image/png;base64,${"A".repeat(ATTACHMENT_MAX_FILE_SIZE_BYTES * 2)}`;
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "size_exceeded" });
  });

  it("dataUrl 内の MIME と fileType が違う場合は mime_mismatch", () => {
    const att = make(PNG_HEAD, 100);
    att.dataUrl = att.dataUrl.replace("data:image/png", "data:image/jpeg");
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "mime_mismatch" });
  });

  it("中身が PNG でない（実行ファイル等）のに image/png と宣言すると signature_mismatch", () => {
    const att = make([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0], 100);
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "signature_mismatch" });
  });

  it("PNG の中身を application/pdf と宣言すると signature_mismatch", () => {
    const att = make(PNG_HEAD, 100, { fileType: "application/pdf", fileName: "a.pdf" });
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "signature_mismatch" });
  });

  it("WebP 以外の RIFF（WAV 等）は webp として通らない", () => {
    const wav = [...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")];
    const att = make(wav, 100, { fileType: "image/webp", fileName: "a.webp" });
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "signature_mismatch" });
  });

  it("MIME と拡張子が食い違うと extension_mismatch（例: .html を image/png として送る）", () => {
    expect(verifyAttachmentIntegrity(make(PNG_HEAD, 100, { fileName: "evil.html" }))).toEqual({
      ok: false,
      issue: "extension_mismatch",
    });
    expect(verifyAttachmentIntegrity(make(PNG_HEAD, 100, { fileName: "noext" }))).toEqual({
      ok: false,
      issue: "extension_mismatch",
    });
  });

  it.each([
    ["スキームが data: でない", "javascript:alert(1)"],
    ["base64 指定がない", "data:image/png,AAAA"],
    ["Base64 に不正な文字を含む", "data:image/png;base64,AAA!"],
    ["Base64 の長さが4の倍数でない", "data:image/png;base64,AAAAA"],
    ["Base64 本体が空", "data:image/png;base64,"],
    ["パディングが途中にある", "data:image/png;base64,AA==AAAA"],
  ])("不正な dataUrl（%s）は invalid_data_url", (_label, dataUrl) => {
    const att = { ...make(PNG_HEAD, 100), dataUrl };
    expect(verifyAttachmentIntegrity(att)).toEqual({ ok: false, issue: "invalid_data_url" });
  });
});

describe("findAttachmentsIntegrityIssue", () => {
  it("合計が上限ちょうどなら通り、少しでも超えると total_size_exceeded", () => {
    const per = ATTACHMENT_MAX_FILE_SIZE_BYTES;
    const four = Array.from({ length: 4 }, () => make(PNG_HEAD, per));
    expect(findAttachmentsIntegrityIssue(four)).toBeNull();
    expect(ATTACHMENT_MAX_TOTAL_SIZE_BYTES).toBe(per * 4);

    const over = [...four, make(PNG_HEAD, 8)];
    expect(findAttachmentsIntegrityIssue(over)).toEqual({
      index: 4,
      issue: "total_size_exceeded",
    });
  });

  it("旧上限いっぱい（5MB x 5件）は合計超過で弾く", () => {
    const five = Array.from({ length: 5 }, () => make(PNG_HEAD, ATTACHMENT_MAX_FILE_SIZE_BYTES));
    expect(findAttachmentsIntegrityIssue(five)).toEqual({
      index: 4,
      issue: "total_size_exceeded",
    });
  });

  it("問題のある添付のインデックスを返す", () => {
    const list = [make(PNG_HEAD, 10), make(PNG_HEAD, 10, { fileSize: 3 })];
    expect(findAttachmentsIntegrityIssue(list)).toEqual({ index: 1, issue: "size_mismatch" });
  });
});

describe("inquiryAttachmentsStrictSchema", () => {
  const withId = (a: AttachmentIntegrityInput, id: string) => ({ ...a, id });

  it("正当な添付は通る", () => {
    const result = inquiryAttachmentsStrictSchema.safeParse([
      withId(make(PNG_HEAD, 100), "1"),
      withId(make(PDF_HEAD, 200, { fileType: "application/pdf", fileName: "a.pdf" }), "2"),
    ]);
    expect(result.success).toBe(true);
  });

  it("従来スキーマでは通る偽装（fileSize 自己申告）を厳格スキーマは弾く", () => {
    const forged = [withId(make(PNG_HEAD, 1000, { fileSize: 1 }), "1")];
    expect(inquiryAttachmentsArraySchema.safeParse(forged).success).toBe(true);
    expect(inquiryAttachmentsStrictSchema.safeParse(forged).success).toBe(false);
  });
});
