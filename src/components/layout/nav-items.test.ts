import { describe, expect, it } from "vitest";

import {
  APPLICANT_NAV_ITEMS,
  HELPDESK_NAV_ITEMS,
  resolveActiveHref,
} from "./nav-items";

describe("resolveActiveHref", () => {
  describe("申請者側（rootHref: /）", () => {
    it("ルート直下は完全一致のときのみアクティブになる", () => {
      expect(resolveActiveHref("/", APPLICANT_NAV_ITEMS, "/")).toBe("/");
      expect(resolveActiveHref("/inquiry", APPLICANT_NAV_ITEMS, "/")).not.toBe(
        "/"
      );
    });

    it("/inquiry/newでは申請一覧ではなく申請のみがアクティブになる", () => {
      expect(
        resolveActiveHref("/inquiry/new", APPLICANT_NAV_ITEMS, "/")
      ).toBe("/inquiry/new");
    });

    it("/inquiry/123（詳細）では申請一覧がアクティブになる（最長一致優先）", () => {
      expect(resolveActiveHref("/inquiry/123", APPLICANT_NAV_ITEMS, "/")).toBe(
        "/inquiry"
      );
    });

    it("該当項目が無いパスではundefinedを返す", () => {
      expect(
        resolveActiveHref("/unknown", APPLICANT_NAV_ITEMS, "/")
      ).toBeUndefined();
    });
  });

  describe("ヘルプデスク側（rootHref: /helpdesk）", () => {
    it("ルート直下は完全一致のときのみアクティブになる", () => {
      expect(resolveActiveHref("/helpdesk", HELPDESK_NAV_ITEMS, "/helpdesk")).toBe(
        "/helpdesk"
      );
      expect(
        resolveActiveHref("/helpdesk/inquiries", HELPDESK_NAV_ITEMS, "/helpdesk")
      ).not.toBe("/helpdesk");
    });

    it("会社詳細ページ表示中は販社管理項目がアクティブになる", () => {
      expect(
        resolveActiveHref(
          "/helpdesk/companies/company-001",
          HELPDESK_NAV_ITEMS,
          "/helpdesk"
        )
      ).toBe("/helpdesk/companies");
    });

    it("問い合わせ詳細ページ表示中は申請管理項目がアクティブになる", () => {
      expect(
        resolveActiveHref(
          "/helpdesk/inquiries/inquiry-001",
          HELPDESK_NAV_ITEMS,
          "/helpdesk"
        )
      ).toBe("/helpdesk/inquiries");
    });
  });
});
