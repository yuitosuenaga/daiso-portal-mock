import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManualForm } from "@/components/features/helpdesk-manuals/ManualForm";

const createManualActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateManualActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/manuals", () => ({
  createManualAction: (...args: unknown[]) => createManualActionMock(...args),
  updateManualAction: (...args: unknown[]) => updateManualActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createManualActionMock.mockClear();
  updateManualActionMock.mockClear();
  pushMock.mockClear();
});

const labels = {
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
  categoryOptions: [
    { value: "storeOperations", label: "店舗運営" },
    { value: "accounting", label: "経理" },
  ],
  monthOptions: [
    { value: "1", label: "1月" },
    { value: "9", label: "9月" },
  ],
  categoryLabel: "カテゴリ",
  categoryPlaceholderOption: "選択してください",
  categoryRequiredErrorMessage: "カテゴリを選択してください",
  titleLabel: "タイトル",
  titlePlaceholder: "タイトルを入力してください",
  descriptionLabel: "説明",
  descriptionPlaceholder: "説明を入力してください",
  languageJaTabLabel: "日本語",
  languageEnTabLabel: "English",
  yearLabel: "年",
  monthLabel: "月",
  targetingLabel: "公開範囲",
  targetingAllOption: "全体公開",
  targetingCountriesOption: "特定の国・地域を指定",
  targetingCompaniesOption: "特定の販社を指定",
  countriesLabel: "国・地域",
  companiesLabel: "販社",
  sourceTypeLabel: "登録方法",
  sourceTypeUploadOption: "ファイルをアップロード",
  sourceTypeGoogleOption: "Googleドキュメントの共有リンクを登録",
  fileLabel: "PDFファイル",
  fileHint: "PDFのみ、20MBまで",
  removeFileButtonLabel: "削除",
  googleUrlLabel: "Googleドキュメントの共有リンク",
  googleUrlPlaceholder: "https://docs.google.com/document/d/...",
  googleUrlHint: "共有設定を確認してください",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  countriesRequiredErrorMessage: "1つ以上の国・地域を選択してください",
  companiesRequiredErrorMessage: "1つ以上の販社を選択してください",
  fileRequiredErrorMessage: "PDFファイルを選択してください",
  sizeExceededMessage: "ファイルサイズが上限を超えています",
  typeNotAllowedMessage: "許可されていないファイル形式です",
  readFailedMessage: "ファイルの読み込みに失敗しました",
  googleUrlInvalidMessage: "Googleドキュメントの共有リンクを入力してください",
  requiredIndicator: "*",
  submitErrorMessage: "保存に失敗しました",
};

describe("ManualForm", () => {
  it("新規作成時、登録方法の初期選択は「ファイルをアップロード」であり、Googleリンク欄は表示されない", () => {
    render(<ManualForm mode="create" {...labels} />);

    expect(
      (screen.getByLabelText("登録方法") as HTMLSelectElement).value
    ).toBe("upload");
    expect(screen.queryByLabelText("Googleドキュメントの共有リンク")).toBeNull();
  });

  it("登録方法をGoogleに切り替えるとファイル欄が消えGoogleリンク欄が表示される", () => {
    render(<ManualForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });

    expect(screen.getByLabelText("Googleドキュメントの共有リンク")).toBeTruthy();
    expect(screen.queryByLabelText("PDFファイル")).toBeNull();
  });

  it("公開範囲を「特定の国・地域を指定」に切り替えると国・地域の選択欄が表示される", () => {
    render(<ManualForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("公開範囲"), {
      target: { value: "countries" },
    });

    expect(screen.getByLabelText(/^国・地域/)).toBeTruthy();
  });

  it("公開範囲を「特定の販社を指定」に切り替えると販社の選択欄が表示される", () => {
    render(<ManualForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("公開範囲"), {
      target: { value: "companies" },
    });

    expect(screen.getByLabelText(/^販社/)).toBeTruthy();
  });

  it("必須項目を入力してGoogle方式で保存すると、カテゴリ・年月を含む内容でcreateManualActionが呼ばれる", async () => {
    render(<ManualForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規マニュアル" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "English" }));
    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "New Manual" },
    });
    fireEvent.change(screen.getByLabelText(/^カテゴリ/), {
      target: { value: "accounting" },
    });
    fireEvent.change(screen.getByLabelText(/^年/), {
      target: { value: "2027" },
    });
    fireEvent.change(screen.getByLabelText(/^月/), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });
    fireEvent.change(screen.getByLabelText("Googleドキュメントの共有リンク"), {
      target: { value: "https://docs.google.com/document/d/abc123/edit" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createManualActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: "google",
          category: "accounting",
          year: 2027,
          month: 9,
          translations: [{ locale: "en", title: "New Manual", description: "" }],
        })
      );
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/manuals");
  });

  it("編集モードでは登録済みのカテゴリ・年月が初期選択として表示される", () => {
    render(
      <ManualForm
        mode="edit"
        manualId="existing-id"
        defaultValues={{
          sourceType: "upload",
          title: "既存マニュアル",
          titleEn: "Existing Manual",
          category: "storeOperations",
          year: 2025,
          month: 1,
          fileName: "test.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          dataUrl: "data:application/pdf;base64,AAAA",
          targeting: { scope: "all" },
        }}
        {...labels}
      />
    );

    expect((screen.getByLabelText(/^カテゴリ/) as HTMLSelectElement).value).toBe(
      "storeOperations"
    );
    expect((screen.getByLabelText(/^年/) as HTMLInputElement).value).toBe("2025");
    expect((screen.getByLabelText(/^月/) as HTMLSelectElement).value).toBe("1");
  });
});
