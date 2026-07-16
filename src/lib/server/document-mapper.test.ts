import { describe, expect, it } from "vitest";

import {
  DocumentDataIntegrityError,
  mapDocument,
} from "@/lib/server/document-mapper";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "document-1",
    title: "タイトル",
    description: null,
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
});
