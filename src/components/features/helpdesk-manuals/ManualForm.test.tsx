import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManualForm } from "@/components/features/helpdesk-manuals/ManualForm";

const createManualActionMock = vi
  .fn()
  .mockResolvedValue({ manual: { id: "new-id" }, failedLocales: [] });
const updateManualActionMock = vi
  .fn()
  .mockResolvedValue({ manual: { id: "existing-id" }, failedLocales: [] });
const retranslateManualActionMock = vi.fn().mockResolvedValue({ failedLocales: [] });
const pushMock = vi.fn();

vi.mock("@/lib/actions/manuals", () => ({
  createManualAction: (...args: unknown[]) => createManualActionMock(...args),
  updateManualAction: (...args: unknown[]) => updateManualActionMock(...args),
  retranslateManualAction: (...args: unknown[]) => retranslateManualActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createManualActionMock.mockClear();
  updateManualActionMock.mockClear();
  retranslateManualActionMock.mockClear();
  createManualActionMock.mockResolvedValue({ manual: { id: "new-id" }, failedLocales: [] });
  retranslateManualActionMock.mockResolvedValue({ failedLocales: [] });
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
  translationPartialFailureMessage:
    "一部の言語の翻訳に失敗しました。後から再翻訳できます",
  retranslateButtonLabel: "再翻訳する",
  retranslateErrorMessage: "再翻訳に失敗しました",
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
        })
      );
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/manuals");
  });

  it("言語タブや英語入力欄は表示されない（jaのみ入力）", () => {
    render(<ManualForm mode="create" {...labels} />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getAllByLabelText(/タイトル/)).toHaveLength(1);
  });

  async function submitValidGoogleForm() {
    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規マニュアル" },
    });
    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });
    fireEvent.change(screen.getByLabelText("Googleドキュメントの共有リンク"), {
      target: { value: "https://docs.google.com/document/d/abc123/edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
  }

  it("一部言語の翻訳に失敗した場合は遷移せず、警告と再翻訳ボタンを表示する", async () => {
    createManualActionMock.mockResolvedValue({
      manual: { id: "new-id" },
      failedLocales: ["th"],
    });
    render(<ManualForm mode="create" {...labels} />);

    await submitValidGoogleForm();

    expect(
      await screen.findByText("一部の言語の翻訳に失敗しました。後から再翻訳できます")
    ).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "再翻訳する" }));

    await waitFor(() => {
      expect(retranslateManualActionMock).toHaveBeenCalledWith("new-id");
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/helpdesk/manuals");
    });
  });

  it("再翻訳でも失敗が残る場合はエラーを表示し遷移しない", async () => {
    createManualActionMock.mockResolvedValue({
      manual: { id: "new-id" },
      failedLocales: ["th"],
    });
    retranslateManualActionMock.mockResolvedValue({ failedLocales: ["th"] });
    render(<ManualForm mode="create" {...labels} />);

    await submitValidGoogleForm();
    fireEvent.click(await screen.findByRole("button", { name: "再翻訳する" }));

    expect(await screen.findByText("再翻訳に失敗しました")).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("編集モードで翻訳が不足している場合は初期表示から再翻訳ボタンを表示する", () => {
    render(
      <ManualForm
        mode="edit"
        manualId="existing-id"
        missingTranslationLocales={["th"]}
        defaultValues={{
          sourceType: "google",
          title: "既存",
          category: "storeOperations",
          year: 2025,
          month: 1,
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
          targeting: { scope: "all" },
        }}
        {...labels}
      />
    );

    expect(screen.getByRole("button", { name: "再翻訳する" })).toBeTruthy();
  });

  it("編集モードでは登録済みのカテゴリ・年月が初期選択として表示される", () => {
    render(
      <ManualForm
        mode="edit"
        manualId="existing-id"
        defaultValues={{
          sourceType: "upload",
          title: "既存マニュアル",
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
