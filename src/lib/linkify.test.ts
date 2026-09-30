import { describe, expect, it } from "vitest";

import { splitTextWithLinks } from "@/lib/linkify";

describe("splitTextWithLinks", () => {
  it("URLを含まない本文は1つのテキストとして返す", () => {
    expect(splitTextWithLinks("通常の本文\n2行目")).toEqual([
      { type: "text", value: "通常の本文\n2行目" },
    ]);
  });

  it("https/httpのURLをリンクとして切り出し、前後と改行を保持する", () => {
    expect(
      splitTextWithLinks("詳細は https://example.com/a?b=1#c を参照\nhttp://example.org")
    ).toEqual([
      { type: "text", value: "詳細は " },
      { type: "link", value: "https://example.com/a?b=1#c" },
      { type: "text", value: " を参照\n" },
      { type: "link", value: "http://example.org" },
    ]);
  });

  it("URL直後の全角文字・句読点・閉じ括弧はURLに含めない", () => {
    expect(splitTextWithLinks("https://example.com/を見てください")).toEqual([
      { type: "link", value: "https://example.com/" },
      { type: "text", value: "を見てください" },
    ]);
    expect(splitTextWithLinks("(https://example.com/x). 終わり")).toEqual([
      { type: "text", value: "(" },
      { type: "link", value: "https://example.com/x" },
      { type: "text", value: "). 終わり" },
    ]);
  });

  it("http/https以外のスキームやスキームのみの文字列はリンクにしない", () => {
    expect(splitTextWithLinks("javascript:alert(1) ftp://example.com https://")).toEqual([
      { type: "text", value: "javascript:alert(1) ftp://example.com https://" },
    ]);
  });
});
