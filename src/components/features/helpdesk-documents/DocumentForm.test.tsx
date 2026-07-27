import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentForm } from "@/components/features/helpdesk-documents/DocumentForm";

const createDocumentActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateDocumentActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/documents", () => ({
  createDocumentAction: (...args: unknown[]) => createDocumentActionMock(...args),
  updateDocumentAction: (...args: unknown[]) => updateDocumentActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createDocumentActionMock.mockClear();
  updateDocumentActionMock.mockClear();
  pushMock.mockClear();
});

const labels = {
  countryOptions: [{ value: "VN", label: "ベトナム" }],
  companyOptions: [{ value: "vn-daiso-vietnam", label: "Daiso Vietnam" }],
  titleLabel: "タイトル",
  titlePlaceholder: "タイトルを入力してください",
  descriptionLabel: "説明",
  descriptionPlaceholder: "説明を入力してください",
  languageJaTabLabel: "日本語",
  languageEnTabLabel: "English",
  languageAddButtonLabel: "言語を追加",
  languageRemoveButtonLabel: "この言語を削除",
  languageLocaleCodeLabel: "言語コード",
  languageLocaleCodePlaceholder: "例: th, vi, zh",
  languageLocaleDuplicateErrorMessage: "他の言語と重複しない言語コードを入力してください",
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
    fireEvent.click(screen.getByRole("tab", { name: "English" }));
    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "New Document" },
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

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createDocumentActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "published",
          sourceType: "google",
          translations: [{ locale: "en", title: "New Document", description: "" }],
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
          titleEn: "Existing Document",
          descriptionEn: "",
          translations: [],
          status: "published",
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
          targeting: { scope: "all" },
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
          titleEn: "Existing Document",
          descriptionEn: "",
          translations: [],
          status: "published",
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
          targeting: { scope: "all" },
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

  describe("言語タブ", () => {
    it("既定では日本語タブが表示され、英語タブに切り替えるとタイトル入力欄が入れ替わる", () => {
      render(<DocumentForm mode="create" {...labels} />);

      const jaInput = screen.getByLabelText(/タイトル/) as HTMLInputElement;
      fireEvent.change(jaInput, { target: { value: "日本語タイトル" } });

      fireEvent.click(screen.getByRole("tab", { name: "English" }));
      const enInput = screen.getByLabelText(/タイトル/) as HTMLInputElement;
      expect(enInput.value).toBe("");

      fireEvent.click(screen.getByRole("tab", { name: "日本語" }));
      expect((screen.getByLabelText(/タイトル/) as HTMLInputElement).value).toBe(
        "日本語タイトル"
      );
    });

    it("英語タイトルが未入力のまま保存しようとすると英語タブへ自動的に切り替わり送信がブロックされる", async () => {
      render(<DocumentForm mode="create" {...labels} />);

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

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "English" }).getAttribute("aria-selected")
        ).toBe("true");
      });
      expect(screen.getByText("この項目は必須です")).toBeTruthy();
      expect(createDocumentActionMock).not.toHaveBeenCalled();
    });

    it("「言語を追加」で追加言語タブを作成し、言語コード・タイトルを入力して保存できる", async () => {
      render(<DocumentForm mode="create" {...labels} />);

      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "日本語タイトル" },
      });
      fireEvent.click(screen.getByRole("tab", { name: "English" }));
      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "English Title" },
      });

      fireEvent.click(screen.getByRole("button", { name: "言語を追加" }));

      fireEvent.change(screen.getByLabelText(/言語コード/), {
        target: { value: "vi" },
      });
      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "Tiêu đề tiếng Việt" },
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
        expect(createDocumentActionMock).toHaveBeenCalledWith(
          expect.objectContaining({
            translations: expect.arrayContaining([
              { locale: "en", title: "English Title", description: "" },
              { locale: "vi", title: "Tiêu đề tiếng Việt", description: "" },
            ]),
          })
        );
      });
    });

    it("追加言語の言語コードが既存言語と重複するとエラーになり送信がブロックされる", async () => {
      render(<DocumentForm mode="create" {...labels} />);

      // 登録方法をGoogleリンクに切り替え、有効なURLを入力しておく。アップロード方式のまま
      // 検証すると、ファイル未選択によるfileType（enum）の検証エラーが同時に発生し、
      // zodのdiscriminatedUnion+superRefineの仕様上、後続のsuperRefine（言語コード重複検証）が
      // 実行されなくなる（`announcementFormSchema`の`category`等でも同様の既知の挙動）ため、
      // 本テストではこの相互作用を避けるべく登録方法側のフィールドを有効にしておく。
      fireEvent.change(screen.getByLabelText("登録方法"), {
        target: { value: "google" },
      });
      fireEvent.change(
        screen.getByLabelText("Googleドキュメントの共有リンク"),
        { target: { value: "https://docs.google.com/document/d/abc123/edit" } }
      );

      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "日本語タイトル" },
      });
      fireEvent.click(screen.getByRole("tab", { name: "English" }));
      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "English Title" },
      });

      fireEvent.click(screen.getByRole("button", { name: "言語を追加" }));
      fireEvent.change(screen.getByLabelText(/言語コード/), {
        target: { value: "en" },
      });
      fireEvent.change(screen.getByLabelText(/タイトル/), {
        target: { value: "重複言語" },
      });

      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(
          screen.getByText("他の言語と重複しない言語コードを入力してください")
        ).toBeTruthy();
      });
      expect(createDocumentActionMock).not.toHaveBeenCalled();
    });

    it("「この言語を削除」で追加言語タブを削除し、日本語タブへ戻る", () => {
      render(<DocumentForm mode="create" {...labels} />);

      fireEvent.click(screen.getByRole("button", { name: "言語を追加" }));
      expect(screen.getByLabelText(/言語コード/)).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "この言語を削除" }));

      expect(screen.queryByLabelText("言語コード")).toBeNull();
      expect(
        screen.getByRole("tab", { name: "日本語" }).getAttribute("aria-selected")
      ).toBe("true");
    });
  });
});
