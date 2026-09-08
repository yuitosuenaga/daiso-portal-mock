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

import { AddMonthlyMaterialButton } from "@/components/features/monthly-materials/AddMonthlyMaterialButton";
import type { MonthlyMaterialFormProps } from "@/components/features/monthly-materials/MonthlyMaterialForm";

const formLabels: Omit<
  MonthlyMaterialFormProps,
  "category" | "mode" | "materialId" | "defaultValues" | "onCancel" | "onSuccess"
> = {
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddMonthlyMaterialButton", () => {
  it("初期状態では追加ボタンのみ表示され、フォームは表示されない", () => {
    render(
      <AddMonthlyMaterialButton
        category="salesFloorMeeting"
        addButtonLabel="新規追加"
        formLabels={formLabels}
      />
    );

    expect(screen.getByRole("button", { name: "新規追加" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });

  it("クリックすると新規登録フォームがその場に表示される", () => {
    render(
      <AddMonthlyMaterialButton
        category="salesFloorMeeting"
        addButtonLabel="新規追加"
        formLabels={formLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "新規追加" }));

    expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "新規追加" })).toBeNull();
  });

  it("フォームでキャンセルすると追加ボタンの表示に戻る", () => {
    render(
      <AddMonthlyMaterialButton
        category="salesFloorMeeting"
        addButtonLabel="新規追加"
        formLabels={formLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "新規追加" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.getByRole("button", { name: "新規追加" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });
});
