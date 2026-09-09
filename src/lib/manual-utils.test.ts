import { describe, expect, it } from "vitest";

import { filterManuals, manualTargetingLabel, resolveManualTitle } from "@/lib/manual-utils";
import type { Manual } from "@/types/manual";

function makeManual(overrides: Partial<Manual> = {}): Manual {
  return {
    id: "1",
    title: "店舗運営マニュアル",
    description: "基本ルール",
    sourceType: "upload",
    category: "storeOperations",
    year: 2026,
    month: 9,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    translations: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as Manual;
}

describe("filterManuals", () => {
  it("キーワードが空のとき、入力をそのまま返す", () => {
    const manuals = [makeManual({ id: "1" }), makeManual({ id: "2" })];

    expect(filterManuals(manuals, "")).toEqual(manuals);
  });

  it("タイトルの部分一致（大文字小文字を区別しない）で絞り込む", () => {
    const manualA = makeManual({ id: "1", title: "Register Manual" });
    const manualB = makeManual({ id: "2", title: "Inventory Manual" });

    const result = filterManuals([manualA, manualB], "register");

    expect(result).toEqual([manualA]);
  });

  it("説明文の部分一致でも絞り込む", () => {
    const manualA = makeManual({ id: "1", title: "A", description: "返品対応の手順" });
    const manualB = makeManual({ id: "2", title: "B", description: "発注の手順" });

    const result = filterManuals([manualA, manualB], "返品");

    expect(result).toEqual([manualA]);
  });
});

describe("manualTargetingLabel", () => {
  const labels = {
    allLabel: "全体公開",
    countriesLabel: "対象国・地域",
    companiesLabel: "対象販社",
    countryLabels: { VN: "ベトナム", TH: "タイ" },
    companyLabels: { "vn-daiso-vietnam": "Daiso Vietnam" },
  };

  it("scope: allのとき全体公開ラベルを返す", () => {
    expect(manualTargetingLabel({ scope: "all" }, labels)).toBe("全体公開");
  });

  it("scope: countriesのとき国名一覧を含むラベルを返す", () => {
    expect(
      manualTargetingLabel({ scope: "countries", countries: ["VN", "TH"] }, labels)
    ).toBe("対象国・地域: ベトナム, タイ");
  });

  it("scope: companiesのとき販社名一覧を含むラベルを返す", () => {
    expect(
      manualTargetingLabel(
        { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
        labels
      )
    ).toBe("対象販社: Daiso Vietnam");
  });
});

describe("resolveManualTitle", () => {
  it("localeがjaのとき親のtitleを返す", () => {
    const manual = makeManual({
      title: "日本語タイトル",
      translations: [{ locale: "en", title: "English title" }],
    });

    expect(resolveManualTitle(manual, "ja")).toBe("日本語タイトル");
  });

  it("localeに一致する翻訳があればその内容を返す", () => {
    const manual = makeManual({
      title: "日本語タイトル",
      translations: [{ locale: "en", title: "English title" }],
    });

    expect(resolveManualTitle(manual, "en")).toBe("English title");
  });

  it("localeに一致する翻訳が無い場合は親のtitleへフォールバックする", () => {
    const manual = makeManual({
      title: "日本語タイトル",
      translations: [{ locale: "en", title: "English title" }],
    });

    expect(resolveManualTitle(manual, "vi")).toBe("日本語タイトル");
  });
});
