import { describe, expect, it } from "vitest";

import {
  ManualDataIntegrityError,
  mapManual,
  resolveManualContent,
} from "@/lib/server/manual-mapper";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "manual-1",
    title: "タイトル",
    description: null,
    category: "storeOperations" as const,
    year: 2026,
    month: 9,
    sourceType: "upload" as const,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    googleUrl: null,
    googleEmbedUrl: null,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    translations: [] as { locale: string; title: string; description: string | null }[],
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
    ...overrides,
  };
}

describe("mapManual", () => {
  it("sourceType: uploadのレコードをアップロード型のManualへマッピングする", () => {
    const result = mapManual(baseRecord() as never);

    expect(result.sourceType).toBe("upload");
    if (result.sourceType === "upload") {
      expect(result.dataUrl).toBe("data:application/pdf;base64,AAAA");
    }
  });

  it("record.category/year/monthをManual.category/year/monthへマッピングする", () => {
    const result = mapManual(
      baseRecord({ category: "accounting", year: 2027, month: 3 }) as never
    );

    expect(result.category).toBe("accounting");
    expect(result.year).toBe(2027);
    expect(result.month).toBe(3);
  });

  it("sourceType: googleのレコードをGoogle型のManualへマッピングする", () => {
    const result = mapManual(
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

  it("sourceType: uploadなのにdataUrlが欠落している場合はManualDataIntegrityErrorを送出する", () => {
    expect(() => mapManual(baseRecord({ dataUrl: null }) as never)).toThrow(
      ManualDataIntegrityError
    );
  });

  it("sourceType: uploadなのにfileNameが欠落している場合はManualDataIntegrityErrorを送出する", () => {
    expect(() => mapManual(baseRecord({ fileName: null }) as never)).toThrow(
      ManualDataIntegrityError
    );
  });

  it("sourceType: googleなのにgoogleEmbedUrlが欠落している場合はManualDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapManual(
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
    ).toThrow(ManualDataIntegrityError);
  });

  it("sourceType: googleなのにgoogleUrlが欠落している場合はManualDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapManual(
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
    ).toThrow(ManualDataIntegrityError);
  });

  it("record.translationsをManual.translationsへマッピングする", () => {
    const result = mapManual(
      baseRecord({
        translations: [
          { locale: "en", title: "English title", description: "English description" },
        ],
      }) as never
    );

    expect(result.translations).toEqual([
      { locale: "en", title: "English title", description: "English description" },
    ]);
  });
});

describe("resolveManualContent", () => {
  function manual(
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
    const result = resolveManualContent(manual(), "ja");

    expect(result).toEqual({ title: "日本語タイトル", description: "日本語の説明" });
  });

  it("localeに一致する翻訳があればその内容を返す", () => {
    const result = resolveManualContent(manual(), "en");

    expect(result).toEqual({
      title: "English title",
      description: "English description",
    });
  });

  it("localeに一致する翻訳が無い場合はenにフォールバックする", () => {
    const result = resolveManualContent(manual(), "vi");

    expect(result).toEqual({
      title: "English title",
      description: "English description",
    });
  });

  it("localeに一致する翻訳もenも無い場合は既定言語（ja＝親列）にフォールバックする", () => {
    const result = resolveManualContent(manual({ translations: [] }), "vi");

    expect(result).toEqual({ title: "日本語タイトル", description: "日本語の説明" });
  });
});
