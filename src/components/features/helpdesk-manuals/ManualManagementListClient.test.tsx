import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ManualManagementListClient } from "@/components/features/helpdesk-manuals/ManualManagementListClient";
import type { Manual } from "@/types/manual";
import messages from "../../../../messages/ja.json";

function resolveMessage(
  namespace: string,
  key: string,
  values?: Record<string, unknown>
): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string") {
    return `${namespace}.${key}`;
  }
  if (!values) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, token: string) => String(values[token] ?? `{${token}}`));
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/actions/manuals", () => ({
  deleteManualAction: vi.fn(),
}));

function makeManual(overrides: Partial<Manual> = {}): Manual {
  return {
    id: "1",
    title: "テストマニュアル",
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
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
    ...overrides,
  } as Manual;
}

const BASE_PROPS = {
  locale: "ja",
  listTitle: "マニュアル管理",
  editLinkLabel: "編集",
  categoryLabel: "カテゴリ",
  revisionLabel: "改訂年月",
  sourceTypeUploadBadgeLabel: "アップロード",
  sourceTypeGoogleBadgeLabel: "Googleリンク",
  targetingLabels: {
    allLabel: "全体公開",
    countriesLabel: "対象国・地域",
    companiesLabel: "対象販社",
    countryLabels: {},
    companyLabels: {},
  },
};

describe("ManualManagementListClient", () => {
  it("マニュアル一覧をタイトル・編集リンク付きで表示する", () => {
    const manual = makeManual({ id: "1", title: "店舗運営マニュアル" });

    render(<ManualManagementListClient {...BASE_PROPS} manuals={[manual]} />);

    expect(screen.getByText("店舗運営マニュアル")).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });

  it("カテゴリ×年×月×キーワードの併用フィルタで絞り込む", async () => {
    const target = makeManual({
      id: "1",
      title: "発注ガイド",
      category: "inventoryOrdering",
      year: 2026,
      month: 6,
    });
    const other = makeManual({
      id: "2",
      title: "経理マニュアル",
      category: "accounting",
      year: 2026,
      month: 6,
    });

    render(<ManualManagementListClient {...BASE_PROPS} manuals={[target, other]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "発注・在庫管理");

    expect(screen.getByText("発注ガイド")).toBeTruthy();
    expect(screen.queryByText("経理マニュアル")).toBeNull();
  });

  it("該当するマニュアルが0件のとき、該当なしメッセージを表示する", async () => {
    const manual = makeManual({ id: "1", title: "唯一のマニュアル" });

    render(<ManualManagementListClient {...BASE_PROPS} manuals={[manual]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");

    expect(screen.queryByText("唯一のマニュアル")).toBeNull();
    expect(screen.getByText("該当するマニュアルがありません")).toBeTruthy();
  });
});
