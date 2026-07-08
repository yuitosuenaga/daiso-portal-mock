import { describe, expect, it } from "vitest";

import { validateDocumentFile } from "@/lib/document-utils";
import { DOCUMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/document";

function buildFile(overrides: { name?: string; type?: string; size?: number }): File {
  const size = overrides.size ?? 100;
  const content = new Uint8Array(size);
  return new File([content], overrides.name ?? "test.pdf", {
    type: overrides.type ?? "application/pdf",
  });
}

describe("validateDocumentFile", () => {
  it("PDF形式・サイズ上限内のとき合格を返す", () => {
    const file = buildFile({ type: "application/pdf", size: 100 });

    expect(validateDocumentFile(file)).toEqual({ valid: true });
  });

  it("PDF以外の形式のとき不合格（type）を返す", () => {
    const file = buildFile({ type: "image/png", name: "test.png" });

    expect(validateDocumentFile(file)).toEqual({
      valid: false,
      reason: "type",
    });
  });

  it("最大サイズを超えるとき不合格（size）を返す", () => {
    const file = buildFile({
      type: "application/pdf",
      size: DOCUMENT_MAX_FILE_SIZE_BYTES + 1,
    });

    expect(validateDocumentFile(file)).toEqual({
      valid: false,
      reason: "size",
    });
  });
});
