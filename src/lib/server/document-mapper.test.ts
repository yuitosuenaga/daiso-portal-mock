import { describe, expect, it } from "vitest";

import {
  DocumentDataIntegrityError,
  mapDocument,
  resolveDocumentContent,
} from "@/lib/server/document-mapper";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "document-1",
    title: "タイトル",
    description: null,
    status: "published" as const,
    sourceType: "upload" as const,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    googleUrl: null,
    googleEmbedUrl: null,
    uploadedAt: new Date("2026-07-01T09:00:00.000Z"),
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    translations: [] as { locale: string; title: string; description: string | null }[],
    ...overrides,
  };
}

describe("mapDocument", () => {
  it("sourceType: uploadのレコードをアップロード型のDocumentへマッピングする", () => {
    const result = mapDocument(baseRecord() as never);

    expect(result.sourceType).toBe("upload");
    if (result.sourceType === "upload") {
      expect(result.dataUrl).toBe("data:application/pdf;base64,AAAA");
    }
  });

  it("record.statusをDocument.statusへマッピングする（draft/published双方）", () => {
    const draftResult = mapDocument(baseRecord({ status: "draft" }) as never);
    expect(draftResult.status).toBe("draft");

    const publishedResult = mapDocument(
      baseRecord({ status: "published" }) as never
    );
    expect(publishedResult.status).toBe("published");
  });

  it("sourceType: googleのレコードをGoogle型のDocumentへマッピングする", () => {
    const result = mapDocument(
      baseRecord({
        sourceType: "google",
        fileName: null,
        fileType: null,
        fileSize: null,
        dataUrl: null,
        googleUrl: "https://docs.google.com/document/d/abc123/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      }) as never
    );

    expect(result.sourceType).toBe("google");
    if (result.sourceType === "google") {
      expect(result.googleEmbedUrl).toBe(
        "https://docs.google.com/document/d/abc123/preview"
      );
    }
  });

  it("sourceType: uploadなのにdataUrlが欠落している場合はDocumentDataIntegrityErrorを送出する", () => {
    expect(() => mapDocument(baseRecord({ dataUrl: null }) as never)).toThrow(
      DocumentDataIntegrityError
    );
  });

  it("sourceType: uploadなのにfileNameが欠落している場合はDocumentDataIntegrityErrorを送出する", () => {
    expect(() => mapDocument(baseRecord({ fileName: null }) as never)).toThrow(
      DocumentDataIntegrityError
    );
  });

  it("sourceType: googleなのにgoogleEmbedUrlが欠落している場合はDocumentDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapDocument(
        baseRecord({
          sourceType: "google",
          fileName: null,
          fileType: null,
          fileSize: null,
          dataUrl: null,
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: null,
        }) as never
      )
    ).toThrow(DocumentDataIntegrityError);
  });

  it("sourceType: googleなのにgoogleUrlが欠落している場合はDocumentDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapDocument(
        baseRecord({
          sourceType: "google",
          fileName: null,
          fileType: null,
          fileSize: null,
          dataUrl: null,
          googleUrl: null,
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
        }) as never
      )
    ).toThrow(DocumentDataIntegrityError);
  });

  it("record.translationsをDocument.translationsへマッピングする", () => {
    const result = mapDocument(
      baseRecord({
        translations: [
          { locale: "en", title: "English title", description: "English description" },
          { locale: "vi", title: "Vietnamese title", description: null },
        ],
      }) as never
    );

    expect(result.translations).toEqual([
      { locale: "en", title: "English title", description: "English description" },
      { locale: "vi", title: "Vietnamese title", description: undefined },
    ]);
  });
});

describe("resolveDocumentContent", () => {
  function document(
    overrides: Partial<{
      title: string;
      description?: string;
      translations: { locale: string; title: string; description?: string }[];
    }> = {}
  ) {
    return {
      title: "日本語タイトル",
      description: "日本語の説明",
      translations: [
        { locale: "en", title: "English title", description: "English description" },
      ],
      ...overrides,
    };
  }

  it("localeがjaのとき親列（title/description）を返す", () => {
    const result = resolveDocumentContent(document(), "ja");

    expect(result).toEqual({ title: "日本語タイトル", description: "日本語の説明" });
  });

  it("localeに一致する翻訳があればその内容を返す", () => {
    const result = resolveDocumentContent(
      document({
        translations: [
          { locale: "en", title: "English title", description: "English description" },
          { locale: "vi", title: "Vietnamese title", description: "Vietnamese description" },
        ],
      }),
      "vi"
    );

    expect(result).toEqual({
      title: "Vietnamese title",
      description: "Vietnamese description",
    });
  });

  it("localeに一致する翻訳が無い場合はenにフォールバックする", () => {
    const result = resolveDocumentContent(document(), "vi");

    expect(result).toEqual({
      title: "English title",
      description: "English description",
    });
  });

  it("localeに一致する翻訳もenも無い場合は既定言語（ja＝親列）にフォールバックする", () => {
    const result = resolveDocumentContent(document({ translations: [] }), "vi");

    expect(result).toEqual({ title: "日本語タイトル", description: "日本語の説明" });
  });
});
