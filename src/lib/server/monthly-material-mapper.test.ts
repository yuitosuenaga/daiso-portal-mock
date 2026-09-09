import { describe, expect, it } from "vitest";

import {
  MonthlyMaterialDataIntegrityError,
  mapMonthlyMaterial,
} from "@/lib/server/monthly-material-mapper";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting" as const,
    department: "seasonalEvent" as const,
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
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-01T09:00:00.000Z"),
    ...overrides,
  };
}

describe("mapMonthlyMaterial", () => {
  it("sourceType: uploadのレコードをアップロード型のMonthlyMaterialへマッピングする", () => {
    const result = mapMonthlyMaterial(baseRecord() as never);

    expect(result.sourceType).toBe("upload");
    expect(result.category).toBe("salesFloorMeeting");
    expect(result.department).toBe("seasonalEvent");
    expect(result.year).toBe(2026);
    expect(result.month).toBe(9);
    if (result.sourceType === "upload") {
      expect(result.dataUrl).toBe("data:application/pdf;base64,AAAA");
    }
  });

  it("sourceType: googleのレコードをGoogle型のMonthlyMaterialへマッピングする", () => {
    const result = mapMonthlyMaterial(
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

  it("targetingScope: countriesを国単位のtargetingへマッピングする", () => {
    const result = mapMonthlyMaterial(
      baseRecord({ targetingScope: "countries", targetingCountries: ["VN", "TH"] }) as never
    );

    expect(result.targeting).toEqual({ scope: "countries", countries: ["VN", "TH"] });
  });

  it("targetingScope: companiesを販社単位のtargetingへマッピングする", () => {
    const result = mapMonthlyMaterial(
      baseRecord({
        targetingScope: "companies",
        targetingCompanyCodes: ["vn-daiso-vietnam"],
      }) as never
    );

    expect(result.targeting).toEqual({
      scope: "companies",
      companyCodes: ["vn-daiso-vietnam"],
    });
  });

  it("sourceType: uploadなのにdataUrlが欠落している場合はMonthlyMaterialDataIntegrityErrorを送出する", () => {
    expect(() => mapMonthlyMaterial(baseRecord({ dataUrl: null }) as never)).toThrow(
      MonthlyMaterialDataIntegrityError
    );
  });

  it("sourceType: uploadなのにfileNameが欠落している場合はMonthlyMaterialDataIntegrityErrorを送出する", () => {
    expect(() => mapMonthlyMaterial(baseRecord({ fileName: null }) as never)).toThrow(
      MonthlyMaterialDataIntegrityError
    );
  });

  it("sourceType: googleなのにgoogleEmbedUrlが欠落している場合はMonthlyMaterialDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapMonthlyMaterial(
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
    ).toThrow(MonthlyMaterialDataIntegrityError);
  });

  it("sourceType: googleなのにgoogleUrlが欠落している場合はMonthlyMaterialDataIntegrityErrorを送出する", () => {
    expect(() =>
      mapMonthlyMaterial(
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
    ).toThrow(MonthlyMaterialDataIntegrityError);
  });
});
