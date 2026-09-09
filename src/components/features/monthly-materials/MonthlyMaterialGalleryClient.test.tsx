import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/monthly-materials", () => ({
  createMonthlyMaterialAction: vi.fn(),
  updateMonthlyMaterialAction: vi.fn(),
  deleteMonthlyMaterialAction: vi.fn(),
}));

import { MonthlyMaterialGalleryClient } from "@/components/features/monthly-materials/MonthlyMaterialGalleryClient";
import type { MonthlyMaterialFormLabels } from "@/components/features/monthly-materials/MonthlyMaterialSection";
import type { MonthlyMaterial } from "@/types/monthly-material";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function material(overrides: Partial<MonthlyMaterial> = {}): MonthlyMaterial {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting",
    department: "seasonalEvent",
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

const departmentOptions = [
  { value: "kitchen", label: "キッチン・食器" },
  { value: "food", label: "食品・菓子" },
];

const yearOptions = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
];

const monthOptions = [
  { value: "9", label: "9月" },
  { value: "8", label: "8月" },
];

const filterBarLabels = {
  categoryLabel: "カテゴリで絞り込み",
  categoryAll: "すべてのカテゴリ",
  yearLabel: "年で絞り込み",
  yearAll: "すべての年",
  monthLabel: "月で絞り込み",
  monthAll: "すべての月",
  clearButton: "条件をクリア",
};

const viewerLabels = {
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
  googlePreviewErrorMessage: "プレビューを表示できません",
  googlePreviewHint: "プレビューが表示されない場合は、元のドキュメントを開いてください",
  expandButtonLabel: "拡大表示",
};

const formLabels: MonthlyMaterialFormLabels = {
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
  departmentLabel: "カテゴリ",
  departmentOptions,
  yearLabel: "年",
  monthLabel: "月",
  monthOptions: Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}月`,
  })),
  sourceTypeLabel: "登録方式",
  sourceTypeUploadOption: "ファイルをアップロード",
  sourceTypeGoogleOption: "Googleドキュメントの共有リンクを登録",
  fileLabel: "ファイル",
  fileHint: "PDFファイルを選択してください",
  removeFileButtonLabel: "削除",
  googleUrlLabel: "共有リンクURL",
  googleUrlPlaceholder: "https://docs.google.com/...",
  googleUrlHint: "共有リンクを貼り付けてください",
  targetingLabel: "公開範囲",
  targetingAllOption: "全体公開",
  targetingCountriesOption: "特定の国・地域を指定",
  targetingCompaniesOption: "特定の販社を指定",
  countriesLabel: "対象国・地域",
  companiesLabel: "対象販社",
  submitButtonLabel: "保存",
  cancelButtonLabel: "キャンセル",
  requiredErrorMessage: "必須項目です",
  countriesRequiredErrorMessage: "1件以上選択してください",
  companiesRequiredErrorMessage: "1件以上選択してください",
  fileRequiredErrorMessage: "ファイルを選択してください",
  sizeExceededMessage: "ファイルサイズが上限を超えています",
  typeNotAllowedMessage: "PDF以外のファイルは登録できません",
  readFailedMessage: "ファイルの読み込みに失敗しました",
  googleUrlInvalidMessage: "有効な共有リンクを入力してください",
  requiredIndicator: "必須",
  submitErrorMessage: "保存に失敗しました",
};

const DEFAULT_PROPS = {
  locale: "ja",
  departmentOptions,
  yearOptions,
  monthOptions,
  filterBarLabels,
  emptyMessage: "資料はありません",
  noResultsMessage: "該当する資料がありません",
  editButtonLabel: "編集",
  deleteButtonLabel: "削除",
  deleteConfirmTitle: "資料の削除",
  deleteConfirmMessageTemplate: "『{heading}』の資料を削除します。よろしいですか？",
  deleteConfirmButtonLabel: "削除する",
  deleteCancelButtonLabel: "キャンセル",
  deleteErrorMessage: "削除に失敗しました",
  viewerLabels,
  formLabels,
};

const SAMPLE_MATERIALS: MonthlyMaterial[] = [
  material({ id: "1", department: "kitchen", year: 2026, month: 9, fileName: "kitchen.pdf" }),
  material({ id: "2", department: "food", year: 2026, month: 8, fileName: "food.pdf" }),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MonthlyMaterialGalleryClient", () => {
  it("カテゴリで絞り込むと、一致する資料のみ表示する", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    fireEvent.change(screen.getByLabelText("カテゴリで絞り込み"), {
      target: { value: "kitchen" },
    });

    expect(screen.getByText("kitchen.pdf")).toBeTruthy();
    expect(screen.queryByText("food.pdf")).toBeNull();
  });

  it("年で絞り込むと、一致する資料のみ表示する", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    fireEvent.change(screen.getByLabelText("月で絞り込み"), {
      target: { value: "9" },
    });

    expect(screen.getByText("kitchen.pdf")).toBeTruthy();
    expect(screen.queryByText("food.pdf")).toBeNull();
  });

  it("カテゴリ・年・月を併用して絞り込める", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    fireEvent.change(screen.getByLabelText("カテゴリで絞り込み"), {
      target: { value: "kitchen" },
    });
    fireEvent.change(screen.getByLabelText("月で絞り込み"), {
      target: { value: "9" },
    });

    expect(screen.getByText("kitchen.pdf")).toBeTruthy();
    expect(screen.queryByText("food.pdf")).toBeNull();

    fireEvent.change(screen.getByLabelText("月で絞り込み"), {
      target: { value: "8" },
    });

    expect(screen.queryByText("kitchen.pdf")).toBeNull();
    expect(screen.queryByText("food.pdf")).toBeNull();
  });

  it("絞り込み結果が0件の場合は該当なしメッセージを表示する", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    fireEvent.change(screen.getByLabelText("カテゴリで絞り込み"), {
      target: { value: "kitchen" },
    });
    fireEvent.change(screen.getByLabelText("月で絞り込み"), {
      target: { value: "8" },
    });

    expect(screen.getByText("該当する資料がありません")).toBeTruthy();
  });

  it("登録が1件も無い場合は登録0件のメッセージを表示する", () => {
    render(
      <MonthlyMaterialGalleryClient {...DEFAULT_PROPS} materials={[]} editable={false} />
    );

    expect(screen.getByText("資料はありません")).toBeTruthy();
    expect(screen.queryByText("該当する資料がありません")).toBeNull();
  });

  it("クリアボタンで絞り込み条件を解除し、全件表示に戻す", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    fireEvent.change(screen.getByLabelText("カテゴリで絞り込み"), {
      target: { value: "kitchen" },
    });
    expect(screen.queryByText("food.pdf")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("kitchen.pdf")).toBeTruthy();
    expect(screen.getByText("food.pdf")).toBeTruthy();
  });

  it("editable=falseの場合、編集ボタンを表示しない", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={false}
      />
    );

    expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
  });

  it("editable=trueの場合、編集ボタンを表示する", () => {
    render(
      <MonthlyMaterialGalleryClient
        {...DEFAULT_PROPS}
        materials={SAMPLE_MATERIALS}
        editable={true}
      />
    );

    expect(screen.getAllByRole("button", { name: "編集" })).toHaveLength(2);
  });
});
