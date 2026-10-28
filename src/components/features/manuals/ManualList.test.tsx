import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ManualList } from "@/components/features/manuals/ManualList";
import type { ManualSummary } from "@/types/manual";
import messages from "../../../../messages/ja.json";

const getManualsMock = vi.fn();

vi.mock("@/lib/api/manuals", () => ({
  getManuals: (...args: unknown[]) => getManualsMock(...args),
}));

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

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => resolveMessage(namespace, key),
}));

const MANUAL: ManualSummary = {
  id: "1",
  title: "テストマニュアル",
  sourceType: "upload",
  category: "storeOperations",
  year: 2026,
  month: 9,
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  targeting: { scope: "all" },
  translations: [],
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
};

describe("ManualList", () => {
  it("ManualListClientへ渡るpropsとレンダリング結果にファイル本体(dataUrl)を含めない", async () => {
    getManualsMock.mockResolvedValueOnce([MANUAL]);

    const jsx = await ManualList();
    const clientElement = (
      jsx.props.children as { props?: { manuals?: unknown[] } }[]
    ).find((child) => child?.props?.manuals);
    expect(clientElement?.props?.manuals).toHaveLength(1);
    for (const manual of clientElement?.props?.manuals ?? []) {
      expect(manual).not.toHaveProperty("dataUrl");
    }

    const { container } = render(jsx);
    expect(container.innerHTML).not.toContain("data:application/pdf");
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("/api/manuals/1/file");
  });
});
