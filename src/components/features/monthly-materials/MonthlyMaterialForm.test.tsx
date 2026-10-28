import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/monthly-materials", () => ({
  createMonthlyMaterialAction: vi.fn(),
  updateMonthlyMaterialAction: vi.fn(),
}));

import {
  MonthlyMaterialForm,
  type MonthlyMaterialFormProps,
} from "@/components/features/monthly-materials/MonthlyMaterialForm";
import {
  createMonthlyMaterialAction,
  updateMonthlyMaterialAction,
} from "@/lib/actions/monthly-materials";
import { toMonthlyMaterialFormDefaultValues } from "@/lib/monthly-material-form-utils";
import type { MonthlyMaterialSummary } from "@/types/monthly-material";

const SUMMARY: MonthlyMaterialSummary = {
  id: "mm-1",
  category: "salesFloorMeeting",
  department: "other",
  year: 2026,
  month: 9,
  sourceType: "upload",
  fileName: "existing.pdf",
  fileType: "application/pdf",
  fileSize: 2048,
  targeting: { scope: "all" },
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
};

const GOOGLE_SUMMARY: MonthlyMaterialSummary = {
  id: "mm-2",
  category: "salesFloorMeeting",
  department: "other",
  year: 2026,
  month: 9,
  sourceType: "google",
  googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
  googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
  targeting: { scope: "all" },
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
};

const PROPS: Omit<MonthlyMaterialFormProps, "mode" | "defaultValues" | "materialId"> = {
  category: "salesFloorMeeting",
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
  departmentLabel: "カテゴリ",
  departmentOptions: [{ value: "other", label: "その他" }],
  yearLabel: "年",
  monthLabel: "月",
  monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` })),
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
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
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
  vi.mocked(updateMonthlyMaterialAction).mockResolvedValue(SUMMARY);
  vi.mocked(createMonthlyMaterialAction).mockResolvedValue(SUMMARY);
});

describe("toMonthlyMaterialFormDefaultValues", () => {
  it("dataUrlを持たないSummaryからフォーム初期値を作る（ファイル名等は表示用、dataUrlは空）", () => {
    expect(toMonthlyMaterialFormDefaultValues(SUMMARY)).toMatchObject({
      sourceType: "upload",
      fileName: "existing.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      dataUrl: "",
    });
  });
});

describe("MonthlyMaterialForm（編集）", () => {
  function renderEdit(summary: MonthlyMaterialSummary = SUMMARY) {
    return render(
      <MonthlyMaterialForm
        {...PROPS}
        mode="edit"
        materialId={summary.id}
        defaultValues={toMonthlyMaterialFormDefaultValues(summary)}
      />
    );
  }

  it("ファイルを差し替えず年月だけ変えて保存すると、payloadにdataUrlが含まれない", async () => {
    const { container } = renderEdit();
    fireEvent.change(container.querySelector("#monthly-material-year")!, {
      target: { value: "2027" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(updateMonthlyMaterialAction).toHaveBeenCalledTimes(1));
    const [id, payload] = vi.mocked(updateMonthlyMaterialAction).mock.calls[0]!;
    expect(id).toBe("mm-1");
    expect(payload).toMatchObject({ sourceType: "upload", year: 2027, month: 9 });
    expect(payload).not.toHaveProperty("dataUrl");
    expect(createMonthlyMaterialAction).not.toHaveBeenCalled();
  });

  it("ファイルを選び直すと、payloadに新しいdataUrlが含まれる", async () => {
    const { container } = renderEdit();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "new.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/new\.pdf/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(updateMonthlyMaterialAction).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(updateMonthlyMaterialAction).mock.calls[0]![1];
    expect(payload).toMatchObject({ sourceType: "upload", fileName: "new.pdf" });
    expect((payload as { dataUrl?: string }).dataUrl).toMatch(/^data:application\/pdf/);
  });

  it("既存ファイルを削除してファイル未選択のまま保存しようとすると送信されない", async () => {
    renderEdit();
    fireEvent.click(screen.getByRole("button", { name: /削除.*existing\.pdf/ }));

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText("ファイルを選択してください")).toBeTruthy());
    expect(updateMonthlyMaterialAction).not.toHaveBeenCalled();
  });

  it("Google型の資料を、ファイル未選択のままアップロード方式へ切り替えて保存しようとすると送信されない", async () => {
    const { container } = renderEdit(GOOGLE_SUMMARY);
    fireEvent.change(container.querySelector("#monthly-material-source-type")!, {
      target: { value: "upload" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText("ファイルを選択してください")).toBeTruthy());
    expect(updateMonthlyMaterialAction).not.toHaveBeenCalled();
  });
});

describe("MonthlyMaterialForm（新規登録）", () => {
  it("ファイル未選択では登録できない（新規はdataUrl必須のまま）", async () => {
    render(<MonthlyMaterialForm {...PROPS} mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText("ファイルを選択してください")).toBeTruthy());
    expect(createMonthlyMaterialAction).not.toHaveBeenCalled();
  });
});

describe.each(["UTC", "America/Los_Angeles"])(
  "MonthlyMaterialForm（新規）の年月の既定値（TZ=%s）",
  (tz) => {
    let originalTz: string | undefined;

    beforeEach(() => {
      originalTz = process.env.TZ;
      process.env.TZ = tz;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-31T16:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it("JST 11/1 01:00 の時点ではJSTの2026年11月が初期値になる", () => {
      const { container } = render(
        <MonthlyMaterialForm
          {...PROPS}
          mode="create"
          monthOptions={Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1}月`,
          }))}
        />
      );
      expect((container.querySelector("#monthly-material-year") as HTMLInputElement).value).toBe(
        "2026"
      );
      expect((container.querySelector("#monthly-material-month") as HTMLSelectElement).value).toBe(
        "11"
      );
    });
  }
);
