import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ManualListClient } from "@/components/features/manuals/ManualListClient";
import type { Manual } from "@/types/manual";
import messages from "../../../../messages/ja.json";

function resolveMessage(namespace: string, key: string): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : `${namespace}.${key}`;
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => resolveMessage(namespace, key),
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
    dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
    targeting: { scope: "all" },
    translations: [],
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
    ...overrides,
  } as Manual;
}

const BASE_PROPS = {
  locale: "ja",
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
  revisionLabel: "改訂年月",
};

describe("ManualListClient", () => {
  it("カテゴリを選択すると該当マニュアルのみに絞り込む", async () => {
    const manualA = makeManual({ id: "1", title: "店舗運営A", category: "storeOperations" });
    const manualB = makeManual({ id: "2", title: "経理B", category: "accounting" });

    render(<ManualListClient {...BASE_PROPS} manuals={[manualA, manualB]} />);

    expect(screen.getByText("店舗運営A")).toBeTruthy();
    expect(screen.getByText("経理B")).toBeTruthy();

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "店舗運営");

    expect(screen.getByText("店舗運営A")).toBeTruthy();
    expect(screen.queryByText("経理B")).toBeNull();
  });

  it("年を選択すると該当マニュアルのみに絞り込む", async () => {
    const manual2026 = makeManual({ id: "1", title: "2026年資料", year: 2026 });
    const manual2025 = makeManual({ id: "2", title: "2025年資料", year: 2025 });

    render(<ManualListClient {...BASE_PROPS} manuals={[manual2026, manual2025]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("年"), "2026");

    expect(screen.getByText("2026年資料")).toBeTruthy();
    expect(screen.queryByText("2025年資料")).toBeNull();
  });

  it("月を選択すると該当マニュアルのみに絞り込む", async () => {
    const manualSep = makeManual({ id: "1", title: "9月資料", month: 9 });
    const manualJan = makeManual({ id: "2", title: "1月資料", month: 1 });

    render(<ManualListClient {...BASE_PROPS} manuals={[manualSep, manualJan]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("月"), "9");

    expect(screen.getByText("9月資料")).toBeTruthy();
    expect(screen.queryByText("1月資料")).toBeNull();
  });

  it("キーワード×カテゴリ×年×月の併用フィルタをAND条件で適用する", async () => {
    const target = makeManual({
      id: "1",
      title: "発注ガイド",
      category: "inventoryOrdering",
      year: 2026,
      month: 6,
    });
    const sameCategoryDifferentYear = makeManual({
      id: "2",
      title: "発注ガイド旧版",
      category: "inventoryOrdering",
      year: 2025,
      month: 6,
    });
    const differentCategory = makeManual({
      id: "3",
      title: "発注に関する規程",
      category: "accounting",
      year: 2026,
      month: 6,
    });

    render(
      <ManualListClient
        {...BASE_PROPS}
        manuals={[target, sameCategoryDifferentYear, differentCategory]}
      />
    );

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "発注・在庫管理");
    await user.selectOptions(screen.getByLabelText("年"), "2026");
    await user.selectOptions(screen.getByLabelText("月"), "6");
    await user.type(screen.getByLabelText("キーワード検索"), "発注ガイド");

    expect(screen.getByText("発注ガイド")).toBeTruthy();
    expect(screen.queryByText("発注ガイド旧版")).toBeNull();
    expect(screen.queryByText("発注に関する規程")).toBeNull();
  });

  it("該当するマニュアルが0件のとき、該当なしメッセージを表示する", async () => {
    const manual = makeManual({ id: "1", title: "唯一のマニュアル" });

    render(<ManualListClient {...BASE_PROPS} manuals={[manual]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");

    expect(screen.queryByText("唯一のマニュアル")).toBeNull();
    expect(screen.getByText("該当するマニュアルがありません")).toBeTruthy();
  });

  it("条件クリアで全ての絞り込みを初期化する", async () => {
    const manualA = makeManual({ id: "1", title: "店舗運営A", category: "storeOperations" });
    const manualB = makeManual({ id: "2", title: "経理B", category: "accounting" });

    render(<ManualListClient {...BASE_PROPS} manuals={[manualA, manualB]} />);

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "店舗運営");
    expect(screen.queryByText("経理B")).toBeNull();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("店舗運営A")).toBeTruthy();
    expect(screen.getByText("経理B")).toBeTruthy();
  });
});
