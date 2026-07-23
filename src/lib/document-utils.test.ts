import { describe, expect, it } from "vitest";

import {
  DOCUMENT_NEW_BADGE_DAYS,
  filterDocuments,
  isRecentlyUploaded,
  targetingLabel,
  validateDocumentFile,
} from "@/lib/document-utils";
import { DOCUMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/document";
import type { Document } from "@/types/document";

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

describe("targetingLabel", () => {
  const LABELS = {
    allLabel: "全体公開",
    countriesLabel: "対象国・地域",
    companiesLabel: "対象販社",
    countryLabels: { vn: "ベトナム", th: "タイ" },
    companyLabels: { "vn-daiso-vietnam": "Daiso Vietnam" },
  };

  it("scope: allのとき全体公開ラベルを返す", () => {
    expect(targetingLabel({ scope: "all" }, LABELS)).toBe("全体公開");
  });

  it("scope: countriesのとき国名を結合したラベルを返す", () => {
    expect(
      targetingLabel({ scope: "countries", countries: ["vn", "th"] }, LABELS)
    ).toBe("対象国・地域: ベトナム, タイ");
  });

  it("scope: companiesのとき販社名を結合したラベルを返す", () => {
    expect(
      targetingLabel(
        { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
        LABELS
      )
    ).toBe("対象販社: Daiso Vietnam");
  });

  it("ラベルが未知のコードの場合はコード自体を表示する", () => {
    expect(
      targetingLabel({ scope: "countries", countries: ["unknown"] }, LABELS)
    ).toBe("対象国・地域: unknown");
  });
});

function buildDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    title: "利用規約",
    description: "各国共通の利用規約です。",
    sourceType: "upload",
    status: "published",
    fileName: "terms.pdf",
    fileType: "application/pdf",
    fileSize: 1000,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as Document;
}

describe("filterDocuments", () => {
  const documents = [
    buildDocument({ id: "doc-1", title: "利用規約", description: "共通ルール" }),
    buildDocument({ id: "doc-2", title: "Onboarding Guide", description: undefined }),
  ];

  it("キーワードが空のとき、入力配列をそのまま返す", () => {
    expect(filterDocuments(documents, "")).toEqual(documents);
  });

  it("キーワードが空白のみのとき、入力配列をそのまま返す", () => {
    expect(filterDocuments(documents, "   ")).toEqual(documents);
  });

  it("タイトルの部分一致（大文字小文字を区別しない）で絞り込む", () => {
    expect(filterDocuments(documents, "onboarding")).toEqual([documents[1]]);
  });

  it("説明の部分一致で絞り込む", () => {
    expect(filterDocuments(documents, "共通")).toEqual([documents[0]]);
  });

  it("説明が未設定のドキュメントでもタイトル一致で絞り込める", () => {
    expect(filterDocuments(documents, "Guide")).toEqual([documents[1]]);
  });

  it("一致するドキュメントが無いとき、空配列を返す", () => {
    expect(filterDocuments(documents, "存在しないキーワード")).toEqual([]);
  });
});

describe("isRecentlyUploaded", () => {
  const NOW = new Date("2026-07-22T00:00:00.000Z");

  it("基準日数（既定7日）以内のとき true を返す", () => {
    const uploadedAt = new Date(
      NOW.getTime() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isRecentlyUploaded(uploadedAt, NOW)).toBe(true);
  });

  it("基準日数ちょうど（境界値）のとき true を返す", () => {
    const uploadedAt = new Date(
      NOW.getTime() - DOCUMENT_NEW_BADGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isRecentlyUploaded(uploadedAt, NOW)).toBe(true);
  });

  it("基準日数を1ミリ秒でも超えると false を返す", () => {
    const uploadedAt = new Date(
      NOW.getTime() - DOCUMENT_NEW_BADGE_DAYS * 24 * 60 * 60 * 1000 - 1
    ).toISOString();
    expect(isRecentlyUploaded(uploadedAt, NOW)).toBe(false);
  });

  it("基準日数より前のとき false を返す", () => {
    const uploadedAt = new Date(
      NOW.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isRecentlyUploaded(uploadedAt, NOW)).toBe(false);
  });

  it("未来日時（不整合データ）のとき false を返す", () => {
    const uploadedAt = new Date(
      NOW.getTime() + 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isRecentlyUploaded(uploadedAt, NOW)).toBe(false);
  });
});
