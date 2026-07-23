import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/documents", () => ({
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/api/documents";
import {
  createDocumentAction,
  deleteDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import type { CreateDocumentInput, Document } from "@/types/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput {
  return {
    sourceType: "upload",
    title: "アクション経由の新規作成",
    status: "draft",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    ...overrides,
  } as CreateDocumentInput;
}

function buildGoogleInput(
  overrides: Partial<CreateDocumentInput> = {}
): CreateDocumentInput {
  return {
    sourceType: "google",
    title: "Google経由の新規作成",
    status: "draft",
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/should-be-ignored/preview",
    targeting: { scope: "all" },
    ...overrides,
  } as CreateDocumentInput;
}

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    title: "タイトル",
    sourceType: "upload",
    status: "published",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as Document;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDocumentAction", () => {
  it("有効な入力でドキュメントを作成し、ルートを再検証する", async () => {
    vi.mocked(createDocument).mockResolvedValue(document());

    const result = await createDocumentAction(buildInput());

    expect(createDocument).toHaveBeenCalled();
    expect(result.id).toBe("document-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createDocumentAction(buildInput({ title: "" }))).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("公開範囲を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createDocumentAction(
        buildInput({ targeting: { scope: "countries", countries: [] } })
      )
    ).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("statusが不正な値の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      status: "archived",
    } as unknown as CreateDocumentInput;

    await expect(createDocumentAction(invalidInput)).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("PDF以外のファイル形式の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      fileType: "image/png",
    } as unknown as CreateDocumentInput;

    await expect(createDocumentAction(invalidInput)).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("Googleリンクの有効な入力で作成し、googleEmbedUrlをgoogleUrlからサーバー側で再計算する", async () => {
    vi.mocked(createDocument).mockResolvedValue(
      document({
        sourceType: "google",
        fileName: undefined,
        fileType: undefined,
        fileSize: undefined,
        dataUrl: undefined,
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      } as unknown as Partial<Document>)
    );

    await createDocumentAction(buildGoogleInput());

    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      })
    );
  });

  it("Googleリンクが無効な形式の場合は例外になり、保存されない", async () => {
    await expect(
      createDocumentAction(
        buildGoogleInput({ googleUrl: "https://example.com/not-google" })
      )
    ).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });
});

describe("updateDocumentAction / deleteDocumentAction", () => {
  it("既存ドキュメントを更新し、ルートを再検証する", async () => {
    vi.mocked(updateDocument).mockResolvedValue(document({ title: "更新後" }));

    const result = await updateDocumentAction("document-1", buildInput({ title: "更新後" }));

    expect(updateDocument).toHaveBeenCalledWith(
      "document-1",
      expect.objectContaining({ title: "更新後" })
    );
    expect(result.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("Googleリンクドキュメントの更新時もgoogleEmbedUrlをgoogleUrlから再計算する", async () => {
    vi.mocked(updateDocument).mockResolvedValue(
      document({ sourceType: "google" } as unknown as Partial<Document>)
    );

    await updateDocumentAction(
      "document-1",
      buildGoogleInput({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
      })
    );

    expect(updateDocument).toHaveBeenCalledWith(
      "document-1",
      expect.objectContaining({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
        googleEmbedUrl: "https://docs.google.com/spreadsheets/d/xyz789/preview",
      })
    );
  });

  it("既存ドキュメントを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteDocument).mockResolvedValue(undefined);

    await deleteDocumentAction("document-1");

    expect(deleteDocument).toHaveBeenCalledWith("document-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
