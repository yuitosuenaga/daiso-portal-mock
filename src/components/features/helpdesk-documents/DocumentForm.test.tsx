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
        expect.objectContaining({ status: "published", sourceType: "google" })
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
});
