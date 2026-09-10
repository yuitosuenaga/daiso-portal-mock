import { describe, expect, it } from "vitest";

import {
  buildInquiryListHref,
  inquiryFilterStateKey,
  parseInquiryFilters,
  toInquiryFilterQueryString,
} from "@/lib/inquiry-filter-query";
import { EMPTY_INQUIRY_FILTERS, type InquiryFilters } from "@/lib/inquiry-filter";

describe("parseInquiryFilters", () => {
  it("searchParams未指定時はEMPTY_INQUIRY_FILTERSを返す", () => {
    expect(parseInquiryFilters(undefined)).toEqual(EMPTY_INQUIRY_FILTERS);
  });

  it("既知の値を正しくパースする", () => {
    const result = parseInquiryFilters({
      q: "破損",
      status: "new",
      category: "defect",
      urgency: "high",
      unread: "1",
      unresolved: "1",
      aging: "over24h",
      date: "2026-06-01",
    });

    expect(result).toEqual({
      keyword: "破損",
      status: "new",
      category: "defect",
      urgency: "high",
      unreadOnly: true,
      unresolvedOnly: true,
      aging: "over24h",
      receivedOn: "2026-06-01",
    });
  });

  it("未知・不正な値は空値にフォールバックする（例外を投げない）", () => {
    const result = parseInquiryFilters({
      status: "unknown-status",
      category: "unknown-category",
      urgency: "unknown-urgency",
      aging: "unknown-bucket",
      date: "not-a-date",
      unread: "yes",
    });

    expect(result).toEqual(EMPTY_INQUIRY_FILTERS);
  });

  it("配列パラメータは先頭要素を採用する", () => {
    const result = parseInquiryFilters({ status: ["new", "resolved"] });
    expect(result.status).toBe("new");
  });

  it("boolean値は'true'も受理する", () => {
    const result = parseInquiryFilters({ unread: "true" });
    expect(result.unreadOnly).toBe(true);
  });
});

describe("toInquiryFilterQueryString / buildInquiryListHref", () => {
  it("空値のキーは出力しない", () => {
    expect(toInquiryFilterQueryString({ keyword: "", status: "" })).toBe("");
  });

  it("指定した値のみクエリ文字列に含める", () => {
    const query = toInquiryFilterQueryString({ unresolvedOnly: true, urgency: "high" });
    expect(query).toBe("urgency=high&unresolved=1");
  });

  it("キー順は定義順で安定する", () => {
    const query = toInquiryFilterQueryString({ receivedOn: "2026-06-01", status: "new" });
    expect(query).toBe("status=new&date=2026-06-01");
  });

  it("buildInquiryListHrefはクエリが空ならbasePathのみ返す", () => {
    expect(buildInquiryListHref("/inquiry", {})).toBe("/inquiry");
  });

  it("buildInquiryListHrefはクエリ付きhrefを生成する", () => {
    expect(buildInquiryListHref("/inquiry", { unreadOnly: true })).toBe(
      "/inquiry?unread=1"
    );
  });
});

describe("parseInquiryFilters と toInquiryFilterQueryString の往復変換", () => {
  it("全フィールドを指定した状態が往復で一致する", () => {
    const filters: InquiryFilters = {
      keyword: "test",
      status: "new",
      category: "defect",
      urgency: "high",
      unreadOnly: true,
      unresolvedOnly: true,
      aging: "over72h",
      receivedOn: "2026-06-01",
    };

    const query = toInquiryFilterQueryString(filters);
    const params: Record<string, string> = {};
    for (const [key, value] of Array.from(new URLSearchParams(query).entries())) {
      params[key] = value;
    }

    expect(parseInquiryFilters(params)).toEqual(filters);
  });
});

describe("inquiryFilterStateKey", () => {
  it("同じ内容のフィルタは同じキーになる", () => {
    const a = { ...EMPTY_INQUIRY_FILTERS, status: "new" as const };
    const b = { ...EMPTY_INQUIRY_FILTERS, status: "new" as const };
    expect(inquiryFilterStateKey(a)).toBe(inquiryFilterStateKey(b));
  });

  it("異なる内容のフィルタは異なるキーになる", () => {
    const a = { ...EMPTY_INQUIRY_FILTERS, status: "new" as const };
    const b = { ...EMPTY_INQUIRY_FILTERS, status: "resolved" as const };
    expect(inquiryFilterStateKey(a)).not.toBe(inquiryFilterStateKey(b));
  });
});
