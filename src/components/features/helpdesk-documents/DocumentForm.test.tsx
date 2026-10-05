import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentForm } from "@/components/features/helpdesk-documents/DocumentForm";

const createDocumentActionMock = vi
  .fn()
  .mockResolvedValue({ document: { id: "new-id" }, failedLocales: [] });
const updateDocumentActionMock = vi
  .fn()
  .mockResolvedValue({ document: { id: "existing-id" }, failedLocales: [] });
const retranslateDocumentActionMock = vi.fn().mockResolvedValue({ failedLocales: [] });
const pushMock = vi.fn();

vi.mock("@/lib/actions/documents", () => ({
  createDocumentAction: (...args: unknown[]) => createDocumentActionMock(...args),
  updateDocumentAction: (...args: unknown[]) => updateDocumentActionMock(...args),
  retranslateDocumentAction: (...args: unknown[]) => retranslateDocumentActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createDocumentActionMock.mockClear();
  updateDocumentActionMock.mockClear();
  retranslateDocumentActionMock.mockClear();
  pushMock.mockClear();
  createDocumentActionMock.mockResolvedValue({ document: { id: "new-id" }, failedLocales: [] });
});

const labels = {
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
  categoryOptions: [
    { id: "category-1", name: "大分類1", subCategories: [{ id: "sub-1", name: "中分類1" }] },
    { id: "category-2", name: "大分類2", subCategories: [{ id: "sub-2", name: "中分類2" }] },
  ],
  categoryLabel: "大分類",
  categoryPlaceholderOption: "選択してください",
  subCategoryLabel: "中分類",
  subCategoryNoneOption: "なし",
  categoryRequiredErrorMessage: "大分類を選択してください",
  titleLabel: "タイトル",
  titlePlaceholder: "タイトルを入力してください",
  descriptionLabel: "説明",
  descriptionPlaceholder: "説明を入力してください",
  statusLabel: "公開状態",
  statusDraftOption: "下書き",
  statusPublishedOption: "公開",
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
  translationPartialFailedMessage:
    "一部の言語の翻訳に失敗しました。後から再翻訳できます",
  retranslateButtonLabel: "翻訳を再実行",
  retranslateSuccessMessage: "翻訳が完了しました",
  backToListButtonLabel: "一覧へ戻る",
};

describe("DocumentForm", () => {
  it("新規作成時、公開状態の初期選択は「下書き」である", () => {
    render(<DocumentForm mode="create" {...labels} />);

    expect(
      (screen.getByLabelText("公開状態") as HTMLSelectElement).value
    ).toBe("draft");
  });

  it("新規作成時、公開状態を「公開」に変更して保存するとその内容でcreateDocumentActionが呼ばれる", async () => {
    render(<DocumentForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規ドキュメント" },
    });
    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });
    fireEvent.change(
      screen.getByLabelText("Googleドキュメントの共有リンク"),
      {
        target: {
          value: "https://docs.google.com/document/d/abc123/edit",
        },
      }
    );
    fireEvent.change(screen.getByLabelText("公開状態"), {
      target: { value: "published" },
    });
    fireEvent.change(screen.getByLabelText(/大分類/), {
      target: { value: "category-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createDocumentActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "published",
          sourceType: "google",
        })
      );
    });
  });

  it("状態選択は登録方法（sourceType）を切り替えても変化しない", () => {
    render(<DocumentForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("公開状態"), {
      target: { value: "published" },
    });
    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });

    expect(
      (screen.getByLabelText("公開状態") as HTMLSelectElement).value
    ).toBe("published");
  });

  it("編集モードでは登録済みのstatus（公開）が初期選択として表示される", () => {
    render(
      <DocumentForm
        mode="edit"
        documentId="existing-id"
        defaultValues={{
          sourceType: "google",
          title: "既存ドキュメント",
          description: "",
          status: "published",
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
          targeting: { scope: "all" },
          categoryId: "category-1",
          subCategoryId: null,
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("公開状態") as HTMLSelectElement).value
    ).toBe("published");
  });

  it("編集モードで公開状態を「下書き」に変更して保存すると、その内容でupdateDocumentActionが呼ばれる", async () => {
    render(
      <DocumentForm
        mode="edit"
        documentId="existing-id"
        defaultValues={{
          sourceType: "google",
          title: "既存ドキュメント",
          description: "",
          status: "published",
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
          targeting: { scope: "all" },
          categoryId: "category-1",
          subCategoryId: null,
        }}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("公開状態"), {
      target: { value: "draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateDocumentActionMock).toHaveBeenCalledWith(
        "existing-id",
        expect.objectContaining({ status: "draft" })
      );
    });
  });

  it("タイトルが未入力のまま保存しようとすると送信がブロックされる", async () => {
    render(<DocumentForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("登録方法"), {
      target: { value: "google" },
    });
    fireEvent.change(
      screen.getByLabelText("Googleドキュメントの共有リンク"),
      {
        target: {
          value: "https://docs.google.com/document/d/abc123/edit",
        },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getByText("この項目は必須です")).toBeTruthy();
    });
    expect(createDocumentActionMock).not.toHaveBeenCalled();
  });

  describe("自動翻訳", () => {
    function fillValidGoogleForm() {
      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "日本語タイトル" },
      });
      fireEvent.change(screen.getByLabelText("登録方法"), {
        target: { value: "google" },
      });
      fireEvent.change(
        screen.getByLabelText("Googleドキュメントの共有リンク"),
        { target: { value: "https://docs.google.com/document/d/abc123/edit" } }
      );
      fireEvent.change(screen.getByLabelText(/大分類/), {
        target: { value: "category-1" },
      });
    }

    it("言語タブ・追加言語の入力UIは表示されず、日本語のタイトル・説明のみを入力する", () => {
      render(<DocumentForm mode="create" {...labels} />);

      expect(screen.queryByRole("tab")).toBeNull();
      expect(screen.queryByRole("button", { name: "言語を追加" })).toBeNull();
      expect(screen.getAllByLabelText(/タイトル/)).toHaveLength(1);
    });

    it("保存時は翻訳（translations/titleEn）を送らず、日本語の内容のみでcreateDocumentActionを呼ぶ", async () => {
      render(<DocumentForm mode="create" {...labels} />);
      fillValidGoogleForm();

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(createDocumentActionMock).toHaveBeenCalled();
      });
      const input = createDocumentActionMock.mock.calls[0][0];
      expect(input.title).toBe("日本語タイトル");
      expect("translations" in input).toBe(false);
      expect("titleEn" in input).toBe(false);
      expect(pushMock).toHaveBeenCalledWith("/helpdesk/documents");
    });

    it("一部の言語の翻訳に失敗した場合は一覧へ遷移せず、再翻訳を案内する", async () => {
      createDocumentActionMock.mockResolvedValue({
        document: { id: "new-id" },
        failedLocales: ["vi"],
      });
      render(<DocumentForm mode="create" {...labels} />);
      fillValidGoogleForm();

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(
          screen.getByText("一部の言語の翻訳に失敗しました。後から再翻訳できます")
        ).toBeTruthy();
      });
      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "翻訳を再実行" })).toBeTruthy();
    });

    it("翻訳失敗後に再度保存すると、二重作成せず保存済みドキュメントを更新する", async () => {
      createDocumentActionMock.mockResolvedValue({
        document: { id: "new-id" },
        failedLocales: ["vi"],
      });
      render(<DocumentForm mode="create" {...labels} />);
      fillValidGoogleForm();

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "翻訳を再実行" })).toBeTruthy();
      });
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(updateDocumentActionMock).toHaveBeenCalledWith("new-id", expect.anything());
      });
      expect(createDocumentActionMock).toHaveBeenCalledTimes(1);
    });

    it("翻訳失敗後の「翻訳を再実行」で再翻訳が成功すると一覧へ遷移する", async () => {
      createDocumentActionMock.mockResolvedValue({
        document: { id: "new-id" },
        failedLocales: ["vi"],
      });
      render(<DocumentForm mode="create" {...labels} />);
      fillValidGoogleForm();
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      const retranslate = await screen.findByRole("button", { name: "翻訳を再実行" });

      fireEvent.click(retranslate);

      await waitFor(() => {
        expect(retranslateDocumentActionMock).toHaveBeenCalledWith("new-id");
      });
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/helpdesk/documents");
      });
    });

    it("編集モードでは「翻訳を再実行」ボタンが表示され、押下でretranslateDocumentActionが呼ばれる", async () => {
      render(
        <DocumentForm
          mode="edit"
          documentId="existing-id"
          defaultValues={{
            sourceType: "google",
            title: "既存",
            status: "draft",
            googleUrl: "https://docs.google.com/document/d/abc123/edit",
            googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
            targeting: { scope: "all" },
            categoryId: "category-1",
            subCategoryId: null,
          }}
          {...labels}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "翻訳を再実行" }));

      await waitFor(() => {
        expect(retranslateDocumentActionMock).toHaveBeenCalledWith("existing-id");
      });
      expect(await screen.findByText("翻訳が完了しました")).toBeTruthy();
    });
  });

  describe("大分類・中分類の選択", () => {
    it("中分類の選択肢は選択中の大分類配下のみに限定される", () => {
      render(<DocumentForm mode="create" {...labels} />);

      fireEvent.change(screen.getByLabelText(/大分類/), {
        target: { value: "category-1" },
      });

      const subCategorySelect = screen.getByLabelText("中分類") as HTMLSelectElement;
      const optionLabels = Array.from(subCategorySelect.options).map(
        (option) => option.textContent
      );
      expect(optionLabels).toContain("中分類1");
      expect(optionLabels).not.toContain("中分類2");
    });

    it("大分類の選択を変更すると中分類の選択がリセットされる", () => {
      render(<DocumentForm mode="create" {...labels} />);

      fireEvent.change(screen.getByLabelText(/大分類/), {
        target: { value: "category-1" },
      });
      fireEvent.change(screen.getByLabelText("中分類"), {
        target: { value: "sub-1" },
      });
      expect(
        (screen.getByLabelText("中分類") as HTMLSelectElement).value
      ).toBe("sub-1");

      fireEvent.change(screen.getByLabelText(/大分類/), {
        target: { value: "category-2" },
      });

      expect(
        (screen.getByLabelText("中分類") as HTMLSelectElement).value
      ).toBe("");
    });

    it("編集時の初期値（大分類・中分類）はマウント時にリセットされない", () => {
      render(
        <DocumentForm
          mode="edit"
          documentId="existing-id"
          defaultValues={{
            sourceType: "google",
            title: "既存ドキュメント",
            description: "",
            status: "published",
            googleUrl: "https://docs.google.com/document/d/abc123/edit",
            googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
            targeting: { scope: "all" },
            categoryId: "category-1",
            subCategoryId: "sub-1",
          }}
          {...labels}
        />
      );

      expect(
        (screen.getByLabelText(/大分類/) as HTMLSelectElement).value
      ).toBe("category-1");
      expect(
        (screen.getByLabelText("中分類") as HTMLSelectElement).value
      ).toBe("sub-1");
    });

    it("大分類が未選択のまま保存しようとすると送信がブロックされる", async () => {
      render(<DocumentForm mode="create" {...labels} />);

      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "新規ドキュメント" },
      });
      fireEvent.change(screen.getByLabelText("登録方法"), {
        target: { value: "google" },
      });
      fireEvent.change(
        screen.getByLabelText("Googleドキュメントの共有リンク"),
        { target: { value: "https://docs.google.com/document/d/abc123/edit" } }
      );

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(screen.getByText("大分類を選択してください")).toBeTruthy();
      });
      expect(createDocumentActionMock).not.toHaveBeenCalled();
    });
  });
});
