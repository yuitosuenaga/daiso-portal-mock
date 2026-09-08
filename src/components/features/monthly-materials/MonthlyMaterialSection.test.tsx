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

import {
  MonthlyMaterialSection,
  type MonthlyMaterialFormLabels,
  type MonthlyMaterialViewerLabels,
} from "@/components/features/monthly-materials/MonthlyMaterialSection";
import type { MonthlyMaterial } from "@/types/monthly-material";

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

const viewerLabels: MonthlyMaterialViewerLabels = {
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
  googlePreviewErrorMessage: "プレビューを表示できません",
  googlePreviewHint: "プレビューが表示されない場合は、元のドキュメントを開いてください",
};

const formLabels: MonthlyMaterialFormLabels = {
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

const DEFAULT_PROPS = {
  heading: "2026年9月",
  editButtonLabel: "編集",
  deleteButtonLabel: "削除",
  deleteConfirmTitle: "資料の削除",
  deleteConfirmMessage: "『2026年9月』の資料を削除します。この操作は取り消せません。よろしいですか？",
  deleteConfirmButtonLabel: "削除する",
  deleteCancelButtonLabel: "キャンセル",
  deleteErrorMessage: "削除に失敗しました",
  viewerLabels,
  formLabels,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MonthlyMaterialSection", () => {
  it("アップロード方式の場合、ファイル名を画面上に表示する", () => {
    render(
      <MonthlyMaterialSection
        {...DEFAULT_PROPS}
        material={material({ fileName: "sales-floor-meeting-2026-09.pdf" })}
        editable={false}
      />
    );

    expect(screen.getByText("sales-floor-meeting-2026-09.pdf")).toBeTruthy();
  });

  it("showHeading=falseの場合、見出し（h2）を描画しない", () => {
    render(
      <MonthlyMaterialSection
        {...DEFAULT_PROPS}
        material={material()}
        editable={false}
        showHeading={false}
        groupHeadingId="group-heading"
      />
    );

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("editable=falseの場合、編集ボタン・削除ボタンを表示しない", () => {
    render(
      <MonthlyMaterialSection {...DEFAULT_PROPS} material={material()} editable={false} />
    );

    expect(screen.getByText("2026年9月")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
    expect(screen.queryByRole("button", { name: "削除" })).toBeNull();
  });

  it("editable=trueの場合、編集ボタンを表示し、クリックで編集モードへ切り替わる", () => {
    render(
      <MonthlyMaterialSection {...DEFAULT_PROPS} material={material()} editable={true} />
    );

    expect(screen.getByRole("button", { name: "編集" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeTruthy();
  });

  it("編集モードでキャンセルすると表示モードへ戻る", () => {
    render(
      <MonthlyMaterialSection {...DEFAULT_PROPS} material={material()} editable={true} />
    );

    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.getByRole("button", { name: "編集" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });

  it("あるセクションを編集モードにしても、他のセクションは表示モードのままである", () => {
    render(
      <>
        <MonthlyMaterialSection
          {...DEFAULT_PROPS}
          material={material({ id: "1", month: 9 })}
          heading="2026年9月"
          editable={true}
        />
        <MonthlyMaterialSection
          {...DEFAULT_PROPS}
          material={material({ id: "2", month: 8 })}
          heading="2026年8月"
          editable={true}
        />
      </>
    );

    const editButtons = screen.getAllByRole("button", { name: "編集" });
    expect(editButtons).toHaveLength(2);

    fireEvent.click(editButtons[0]);

    // 1件目は編集モード（保存/キャンセルボタンが1組だけ表示される）
    expect(screen.getAllByRole("button", { name: "保存" })).toHaveLength(1);
    // 2件目は表示モードのまま（編集ボタンが1つだけ残る）
    expect(screen.getAllByRole("button", { name: "編集" })).toHaveLength(1);
  });
});
