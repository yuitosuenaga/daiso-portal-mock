import { describe, expect, it } from "vitest";

import {
  readFileAsDataUrl,
  validateAttachmentFile,
} from "@/lib/attachment-utils";
import {
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
} from "@/lib/constants/attachment";

function buildFile(overrides: {
  name?: string;
  type?: string;
  size?: number;
}): File {
  const size = overrides.size ?? 100;
  const content = new Uint8Array(size);
  return new File([content], overrides.name ?? "test.png", {
    type: overrides.type ?? "image/png",
  });
}

describe("validateAttachmentFile", () => {
  it("許可された形式・サイズ内・件数上限内のとき合格を返す", () => {
    const file = buildFile({ type: "image/png", size: 100 });

    expect(validateAttachmentFile(file, 0)).toEqual({ valid: true });
  });

  it("件数が上限に達しているとき不合格（count）を返す", () => {
    const file = buildFile({});

    expect(validateAttachmentFile(file, ATTACHMENT_MAX_COUNT)).toEqual({
      valid: false,
      reason: "count",
    });
  });

  it("許可されていない形式のとき不合格（type）を返す", () => {
    const file = buildFile({ type: "text/plain" });

    expect(validateAttachmentFile(file, 0)).toEqual({
      valid: false,
      reason: "type",
    });
  });

  it("最大サイズを超えるとき不合格（size）を返す", () => {
    const file = buildFile({
      type: "image/png",
      size: ATTACHMENT_MAX_FILE_SIZE_BYTES + 1,
    });

    expect(validateAttachmentFile(file, 0)).toEqual({
      valid: false,
      reason: "size",
    });
  });

  it("PDFファイルは許可された形式として合格する", () => {
    const file = buildFile({ type: "application/pdf", name: "doc.pdf" });

    expect(validateAttachmentFile(file, 0)).toEqual({ valid: true });
  });
});

describe("validateAttachmentFile（合計サイズ）", () => {
  const limit = (existingTotalBytes: number) => ({
    existingTotalBytes,
    maxTotalBytes: ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
  });

  it("既選択分との合計が上限ちょうどなら合格", () => {
    const file = buildFile({ size: 100 });
    expect(
      validateAttachmentFile(file, 1, limit(ATTACHMENT_MAX_TOTAL_SIZE_BYTES - 100))
    ).toEqual({ valid: true });
  });

  it("既選択分との合計が上限を超えるとき不合格（total）を返す", () => {
    const file = buildFile({ size: 101 });
    expect(
      validateAttachmentFile(file, 1, limit(ATTACHMENT_MAX_TOTAL_SIZE_BYTES - 100))
    ).toEqual({ valid: false, reason: "total" });
  });

  it("合計上限を渡さなければ合計チェックは行わない（お知らせ等の共用側）", () => {
    const file = buildFile({ size: 100 });
    expect(validateAttachmentFile(file, 1)).toEqual({ valid: true });
  });
});

describe("readFileAsDataUrl", () => {
  it("ファイルの内容をBase64データURL文字列に変換する", async () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    const dataUrl = await readFileAsDataUrl(file);

    expect(dataUrl.startsWith("data:text/plain")).toBe(true);
    expect(dataUrl).toContain("base64,");
  });
});
