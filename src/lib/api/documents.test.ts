import { describe, expect, it } from "vitest";

import {
  createDocument,
  deleteDocument,
  getAllDocuments,
  getDocumentById,
  getDocumentByIdForHelpdesk,
  getDocuments,
  updateDocument,
} from "@/lib/api/documents";
import type { CreateDocumentInput } from "@/types/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(
  overrides: Partial<CreateDocumentInput> = {}
): CreateDocumentInput {
  return {
    title: "テストドキュメント",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("getDocuments（自社可視性フィルタ）", () => {
  it("アップロード日（uploadedAt）の降順で返す", async () => {
    const result = await getDocuments();

    const sortedIds = [...result]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((item) => item.id);

    expect(result.map((item) => item.id)).toEqual(sortedIds);
  });

  it("全体公開・自社国・自社販社のいずれかを満たすドキュメントのみを返す", async () => {
    const result = await getDocuments();

    expect(result.map((item) => item.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("自社国・自社販社を含まないドキュメントは取得結果から除外される", async () => {
    const result = await getDocuments();

    expect(result.some((item) => item.id === "4")).toBe(false);
    expect(result.some((item) => item.id === "5")).toBe(false);
  });
});

describe("getDocumentById", () => {
  it("自社に公開されたドキュメントを返す", async () => {
    const result = await getDocumentById("1");

    expect(result?.id).toBe("1");
  });

  it("自社に非公開のドキュメントIDに対してnullを返す", async () => {
    const result = await getDocumentById("4");

    expect(result).toBeNull();
  });

  it("存在しないIDに対してnullを返す", async () => {
    const result = await getDocumentById("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("getAllDocuments / getDocumentByIdForHelpdesk", () => {
  it("絞り込みなしで全件を返す", async () => {
    const result = await getAllDocuments();

    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result.some((item) => item.id === "4")).toBe(true);
  });

  it("自社に非公開のドキュメントも取得できる", async () => {
    const result = await getDocumentByIdForHelpdesk("4");

    expect(result?.id).toBe("4");
  });
});

describe("createDocument / updateDocument / deleteDocument", () => {
  it("作成したドキュメントがgetAllDocumentsに反映される", async () => {
    const created = await createDocument(buildInput({ title: "新規作成テスト" }));

    expect(created.id).toBeTruthy();
    expect(typeof created.uploadedAt).toBe("string");

    const all = await getAllDocuments();
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("自社を含まない公開範囲で作成したドキュメントはgetDocumentsから除外される", async () => {
    const created = await createDocument(
      buildInput({
        title: "他国向けドキュメント",
        targeting: { scope: "countries", countries: ["US"] },
      })
    );

    const scoped = await getDocuments();
    const all = await getAllDocuments();

    expect(scoped.some((item) => item.id === created.id)).toBe(false);
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("更新した内容がgetDocumentByIdForHelpdeskに反映される", async () => {
    const created = await createDocument(buildInput({ title: "更新前タイトル" }));

    await updateDocument(created.id, buildInput({ title: "更新後タイトル" }));

    const result = await getDocumentByIdForHelpdesk(created.id);
    expect(result?.title).toBe("更新後タイトル");
  });

  it("削除したドキュメントはgetAllDocumentsから除去される", async () => {
    const created = await createDocument(buildInput({ title: "削除テスト" }));

    await deleteDocument(created.id);

    const all = await getAllDocuments();
    expect(all.some((item) => item.id === created.id)).toBe(false);
  });

  it("存在しないIDのupdateDocumentはエラーになる", async () => {
    await expect(
      updateDocument("does-not-exist", buildInput())
    ).rejects.toThrow();
  });

  it("存在しないIDのdeleteDocumentはエラーになる", async () => {
    await expect(deleteDocument("does-not-exist")).rejects.toThrow();
  });
});
