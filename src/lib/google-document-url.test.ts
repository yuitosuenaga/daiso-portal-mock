import { describe, expect, it } from "vitest";

import { parseGoogleDocumentUrl, toGoogleEmbedUrl } from "@/lib/google-document-url";

describe("parseGoogleDocumentUrl", () => {
  it("Googleドキュメントの共有リンクから種別とファイルIDを抽出する", () => {
    expect(
      parseGoogleDocumentUrl(
        "https://docs.google.com/document/d/abc123XYZ-_/edit?usp=sharing"
      )
    ).toEqual({ kind: "document", fileId: "abc123XYZ-_" });
  });

  it("Googleスプレッドシートの共有リンクから種別とファイルIDを抽出する", () => {
    expect(
      parseGoogleDocumentUrl(
        "https://docs.google.com/spreadsheets/d/xyz789/edit#gid=0"
      )
    ).toEqual({ kind: "spreadsheets", fileId: "xyz789" });
  });

  it("Googleスライドの共有リンクから種別とファイルIDを抽出する", () => {
    expect(
      parseGoogleDocumentUrl("https://docs.google.com/presentation/d/pres1/edit")
    ).toEqual({ kind: "presentation", fileId: "pres1" });
  });

  it("前後の空白をトリムして判定する", () => {
    expect(
      parseGoogleDocumentUrl("  https://docs.google.com/document/d/abc123/edit  ")
    ).toEqual({ kind: "document", fileId: "abc123" });
  });

  it("Google以外のドメインには null を返す", () => {
    expect(parseGoogleDocumentUrl("https://example.com/document/d/abc123")).toBeNull();
  });

  it("不正な形式のURLには null を返す", () => {
    expect(parseGoogleDocumentUrl("not-a-url")).toBeNull();
  });

  it("空文字には null を返す", () => {
    expect(parseGoogleDocumentUrl("")).toBeNull();
  });
});

describe("toGoogleEmbedUrl", () => {
  it("Googleドキュメントの共有リンクを埋め込み用プレビューURLへ変換する", () => {
    expect(
      toGoogleEmbedUrl("https://docs.google.com/document/d/abc123/edit?usp=sharing")
    ).toBe("https://docs.google.com/document/d/abc123/preview");
  });

  it("Googleスプレッドシートの共有リンクを埋め込み用プレビューURLへ変換する", () => {
    expect(
      toGoogleEmbedUrl("https://docs.google.com/spreadsheets/d/xyz789/edit")
    ).toBe("https://docs.google.com/spreadsheets/d/xyz789/preview");
  });

  it("Googleスライドの共有リンクを埋め込み用プレビューURLへ変換する", () => {
    expect(
      toGoogleEmbedUrl("https://docs.google.com/presentation/d/pres1/edit")
    ).toBe("https://docs.google.com/presentation/d/pres1/preview");
  });

  it("無効なURLには null を返す", () => {
    expect(toGoogleEmbedUrl("https://example.com/not-google")).toBeNull();
  });
});
