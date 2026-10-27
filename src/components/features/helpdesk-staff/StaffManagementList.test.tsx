import { createTranslator } from "use-intl/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import enMessages from "../../../../messages/en.json";
import jaMessages from "../../../../messages/ja.json";

import { StaffManagementList } from "@/components/features/helpdesk-staff/StaffManagementList";

const state = vi.hoisted(() => ({ locale: "ja" as "ja" | "en" }));
const clientSpy = vi.hoisted(() => vi.fn(() => null));

const catalogs = { ja: jaMessages, en: enMessages };

// 実メッセージを使う本物のtranslator（getTranslationsと同じくt.raw()が使える）
vi.mock("next-intl/server", () => ({
  getLocale: async () => state.locale,
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: state.locale,
      messages: catalogs[state.locale],
      namespace,
    } as never),
}));

vi.mock("@/components/features/helpdesk-staff/StaffManagementListClient", () => ({
  StaffManagementListClient: clientSpy,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
}));

vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: async () => ({ claims: { staffId: "me" } }),
}));

vi.mock("@/lib/server/helpdesk-staff-service", () => ({
  listHelpdeskStaff: async () => [{ id: "s1" }],
}));

async function renderAndGetProps(locale: "ja" | "en") {
  state.locale = locale;
  clientSpy.mockClear();
  const element = await StaffManagementList();
  const children = (element.props as { children: unknown[] }).children;
  const client = children[1] as { props: Record<string, Record<string, string>> };
  return client.props;
}

describe("StaffManagementList の確認文言", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each(["ja", "en"] as const)(
    "%s: {name}入りの確認文は翻訳キー文字列でなく生テンプレートとして渡る",
    async (locale) => {
      const props = await renderAndGetProps(locale);
      const all = [
        props.toggleRoleLabels.promoteConfirm,
        props.toggleRoleLabels.demoteConfirm,
        props.toggleActiveLabels.deactivateConfirm,
        props.toggleActiveLabels.activateConfirm,
      ];
      for (const text of all) {
        expect(text).not.toMatch(/^helpdeskStaff\./);
        expect(text).toContain("{name}");
      }
    }
  );

  it("ja: 無効化確認文に担当中の問い合わせは解除されない旨を含む", async () => {
    const props = await renderAndGetProps("ja");
    expect(props.toggleActiveLabels.deactivateConfirm).toContain(
      "担当中の問い合わせは解除されません"
    );
  });

  it("en: 無効化確認文に担当中問い合わせ非解除の注記を含む", async () => {
    const props = await renderAndGetProps("en");
    expect(props.toggleActiveLabels.deactivateConfirm).toBe(
      enMessages.helpdeskStaff.toggle.deactivateConfirm
    );
    expect(props.toggleActiveLabels.deactivateConfirm).toMatch(/assigned|assignment/i);
  });
});
