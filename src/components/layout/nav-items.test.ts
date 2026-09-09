import { describe, expect, it } from "vitest";

import { HELPDESK_NAV_ITEMS, resolveActiveHref } from "./nav-items";

describe("resolveActiveHref", () => {
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

    it("問い合わせ詳細ページ表示中は問合せ管理項目がアクティブになる", () => {
      expect(
        resolveActiveHref(
          "/helpdesk/inquiries/inquiry-001",
          HELPDESK_NAV_ITEMS,
          "/helpdesk"
        )
      ).toBe("/helpdesk/inquiries");
    });

    it("売場検討会資料管理ページ表示中は売場検討会項目がアクティブになる", () => {
      expect(
        resolveActiveHref(
          "/helpdesk/sales-floor-meeting",
          HELPDESK_NAV_ITEMS,
          "/helpdesk"
        )
      ).toBe("/helpdesk/sales-floor-meeting");
    });

    it("POP資料管理ページ表示中はPOP項目がアクティブになる", () => {
      expect(resolveActiveHref("/helpdesk/pop", HELPDESK_NAV_ITEMS, "/helpdesk")).toBe(
        "/helpdesk/pop"
      );
    });

    it("マニュアル管理ページ表示中はマニュアル項目がアクティブになる", () => {
      expect(
        resolveActiveHref("/helpdesk/manuals", HELPDESK_NAV_ITEMS, "/helpdesk")
      ).toBe("/helpdesk/manuals");
    });
  });
});

describe("HELPDESK_NAV_ITEMS", () => {
  it("ドキュメント管理の直後にマニュアル項目を含む", () => {
    const hrefs = HELPDESK_NAV_ITEMS.map((item) => item.href);
    const documentsIndex = hrefs.indexOf("/helpdesk/documents");
    const manualsIndex = hrefs.indexOf("/helpdesk/manuals");

    expect(documentsIndex).toBeGreaterThanOrEqual(0);
    expect(manualsIndex).toBe(documentsIndex + 1);
  });
});
