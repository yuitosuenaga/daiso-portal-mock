import { describe, expect, it } from "vitest";

import {
  buildHelpdeskInquiryListHref,
  helpdeskInquiryFilterStateKey,
  parseHelpdeskInquiryFilters,
  toHelpdeskInquiryFilterQueryString,
} from "@/lib/helpdesk-inquiry-filter-query";
import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  type HelpdeskInquiryFilters,
} from "@/lib/helpdesk-inquiry-list";

describe("parseHelpdeskInquiryFilters", () => {
  it("searchParams未指定時はEMPTY_HELPDESK_INQUIRY_FILTERSを返す", () => {
    expect(parseHelpdeskInquiryFilters(undefined)).toEqual(
      EMPTY_HELPDESK_INQUIRY_FILTERS
    );
  });

  it("既知の値を正しくパースする", () => {
    const result = parseHelpdeskInquiryFilters({
      company: "Daiso",
      q: "破損",
      country: "US",
      category: "defect",
      status: "new",
      urgency: "high",
      unclaimed: "1",
      staff: "田中",
      unresolved: "1",
      aging: "over24h",
      date: "2026-06-01",
    });

    expect(result).toEqual({
      companyName: "Daiso",
      keyword: "破損",
      country: "US",
      category: "defect",
      status: "new",
      urgency: "high",
      unclaimedOnly: true,
      claimedBy: "田中",
      unresolvedOnly: true,
      aging: "over24h",
      receivedOn: "2026-06-01",
    });
  });

  it("未知・不正な値は空値にフォールバックする（例外を投げない）", () => {
    const result = parseHelpdeskInquiryFilters({
      country: "ZZ",
      category: "unknown",
      status: "unknown",
      urgency: "unknown",
      aging: "unknown",
      date: "not-a-date",
    });

    expect(result).toEqual(EMPTY_HELPDESK_INQUIRY_FILTERS);
  });

  it("会社名・対応者名は自由文字列として検証せず通す", () => {
    const result = parseHelpdeskInquiryFilters({
      company: "Any Company Inc.",
      staff: "誰でも良い名前",
    });

    expect(result.companyName).toBe("Any Company Inc.");
    expect(result.claimedBy).toBe("誰でも良い名前");
  });
});

describe("toHelpdeskInquiryFilterQueryString / buildHelpdeskInquiryListHref", () => {
  it("空値のキーは出力しない", () => {
    expect(toHelpdeskInquiryFilterQueryString({ companyName: "", status: "" })).toBe("");
  });

  it("指定した値のみクエリ文字列に含める", () => {
    const query = toHelpdeskInquiryFilterQueryString({
      unclaimedOnly: true,
      unresolvedOnly: true,
      urgency: "high",
    });
    expect(query).toBe("urgency=high&unclaimed=1&unresolved=1");
  });

  it("buildHelpdeskInquiryListHrefはクエリが空ならbasePathのみ返す", () => {
    expect(buildHelpdeskInquiryListHref("/helpdesk/inquiries", {})).toBe(
      "/helpdesk/inquiries"
    );
  });

  it("buildHelpdeskInquiryListHrefはクエリ付きhrefを生成する", () => {
    expect(
      buildHelpdeskInquiryListHref("/helpdesk/inquiries", {
        unclaimedOnly: true,
        unresolvedOnly: true,
      })
    ).toBe("/helpdesk/inquiries?unclaimed=1&unresolved=1");
  });
});

describe("parseHelpdeskInquiryFilters と toHelpdeskInquiryFilterQueryString の往復変換", () => {
  it("全フィールドを指定した状態が往復で一致する", () => {
    const filters: HelpdeskInquiryFilters = {
      companyName: "Daiso Vietnam Co., Ltd.",
      keyword: "test",
      country: "VN",
      category: "defect",
      status: "new",
      urgency: "high",
      unclaimedOnly: true,
      claimedBy: "田中",
      unresolvedOnly: true,
      aging: "over72h",
      receivedOn: "2026-06-01",
    };

    const query = toHelpdeskInquiryFilterQueryString(filters);
    const params: Record<string, string> = {};
    for (const [key, value] of Array.from(new URLSearchParams(query).entries())) {
      params[key] = value;
    }

    expect(parseHelpdeskInquiryFilters(params)).toEqual(filters);
  });
});

describe("helpdeskInquiryFilterStateKey", () => {
  it("同じ内容のフィルタは同じキーになる", () => {
    const a = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, status: "new" as const };
    const b = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, status: "new" as const };
    expect(helpdeskInquiryFilterStateKey(a)).toBe(helpdeskInquiryFilterStateKey(b));
  });

  it("異なる内容のフィルタは異なるキーになる", () => {
    const a = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, status: "new" as const };
    const b = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, status: "resolved" as const };
    expect(helpdeskInquiryFilterStateKey(a)).not.toBe(helpdeskInquiryFilterStateKey(b));
  });
});
