import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createDocumentAction,
  deleteDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import { getDocumentByIdForHelpdesk } from "@/lib/api/documents";
import type { CreateDocumentInput } from "@/types/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput {
  return {
    title: "アクション経由の新規作成",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("createDocumentAction", () => {
  it("有効な入力でドキュメントを作成し、ルートを再検証する", async () => {
    const created = await createDocumentAction(buildInput());

    expect(created.id).toBeTruthy();
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createDocumentAction(buildInput({ title: "" }))).rejects.toThrow();
  });

  it("公開範囲を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createDocumentAction(
        buildInput({ targeting: { scope: "countries", countries: [] } })
      )
    ).rejects.toThrow();
  });

  it("PDF以外のファイル形式の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      fileType: "image/png",
    } as unknown as CreateDocumentInput;

    await expect(createDocumentAction(invalidInput)).rejects.toThrow();
  });
});

describe("updateDocumentAction / deleteDocumentAction", () => {
  it("既存ドキュメントを更新する", async () => {
    const created = await createDocumentAction(buildInput({ title: "更新前" }));

    await updateDocumentAction(created.id, buildInput({ title: "更新後" }));

    const result = await getDocumentByIdForHelpdesk(created.id);
    expect(result?.title).toBe("更新後");
  });

  it("既存ドキュメントを削除する", async () => {
    const created = await createDocumentAction(buildInput({ title: "削除対象" }));

    await deleteDocumentAction(created.id);

    const result = await getDocumentByIdForHelpdesk(created.id);
    expect(result).toBeNull();
  });
});
