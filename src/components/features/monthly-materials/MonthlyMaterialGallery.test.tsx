import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MonthlyMaterialGallery } from "@/components/features/monthly-materials/MonthlyMaterialGallery";
import type { MonthlyMaterial } from "@/types/monthly-material";
import messages from "../../../../messages/ja.json";

const getMonthlyMaterialsMock = vi.fn();
const getAllMonthlyMaterialsForHelpdeskMock = vi.fn();

vi.mock("@/lib/api/monthly-materials", () => ({
  getMonthlyMaterials: (...args: unknown[]) => getMonthlyMaterialsMock(...args),
  getAllMonthlyMaterialsForHelpdesk: (...args: unknown[]) =>
    getAllMonthlyMaterialsForHelpdeskMock(...args),
}));

vi.mock("@/lib/actions/monthly-materials", () => ({
  createMonthlyMaterialAction: vi.fn(),
  updateMonthlyMaterialAction: vi.fn(),
  deleteMonthlyMaterialAction: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
  return Object.entries(values).reduce(
    (acc, [paramKey, paramValue]) => acc.replaceAll(`{${paramKey}}`, String(paramValue)),
    value
  );
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) => resolveMessage(namespace, key, values),
  getLocale: async () => "ja",
}));

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function material(overrides: Partial<MonthlyMaterial> = {}): MonthlyMaterial {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting",
    year: 2026,
    month: 9,
    sourceType: "upload",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  } as MonthlyMaterial;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MonthlyMaterialGallery", () => {
  it("editable=falseの場合、公開範囲でフィルタ済みの一覧（getMonthlyMaterials）を取得する", async () => {
    getMonthlyMaterialsMock.mockResolvedValue([material()]);

    const jsx = await MonthlyMaterialGallery({ category: "salesFloorMeeting", editable: false });
    render(jsx);

    expect(getMonthlyMaterialsMock).toHaveBeenCalledWith("salesFloorMeeting");
    expect(getAllMonthlyMaterialsForHelpdeskMock).not.toHaveBeenCalled();
    expect(screen.getByText("2026年9月")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "新規追加" })).toBeNull();
  });

  it("editable=trueの場合、全件取得（getAllMonthlyMaterialsForHelpdesk）し、新規追加ボタンを表示する", async () => {
    getAllMonthlyMaterialsForHelpdeskMock.mockResolvedValue([material()]);

    const jsx = await MonthlyMaterialGallery({ category: "salesFloorMeeting", editable: true });
    render(jsx);

    expect(getAllMonthlyMaterialsForHelpdeskMock).toHaveBeenCalledWith("salesFloorMeeting");
    expect(getMonthlyMaterialsMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "新規追加" })).toBeTruthy();
  });

  it("登録済みの年月のみを新しい順に表示する（未登録月は表示しない）", async () => {
    getMonthlyMaterialsMock.mockResolvedValue([
      material({ id: "1", year: 2026, month: 9 }),
      material({ id: "2", year: 2026, month: 8 }),
    ]);

    const jsx = await MonthlyMaterialGallery({ category: "salesFloorMeeting", editable: false });
    render(jsx);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((el) => el.textContent);
    expect(headings).toEqual(["2026年9月", "2026年8月"]);
    expect(screen.queryByText("2026年7月")).toBeNull();
  });

  it("資料が1件も無い場合は空状態メッセージを表示する", async () => {
    getMonthlyMaterialsMock.mockResolvedValue([]);

    const jsx = await MonthlyMaterialGallery({ category: "pop", editable: false });
    render(jsx);

    expect(screen.getByText("資料はありません")).toBeTruthy();
  });

  it("取得に失敗した場合はエラーメッセージを表示する", async () => {
    getMonthlyMaterialsMock.mockRejectedValue(new Error("network error"));

    const jsx = await MonthlyMaterialGallery({ category: "pop", editable: false });
    render(jsx);

    expect(screen.getByText("資料の取得に失敗しました")).toBeTruthy();
  });
});
