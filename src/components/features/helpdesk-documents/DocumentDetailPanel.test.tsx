import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentDetailPanel } from "@/components/features/helpdesk-documents/DocumentDetailPanel";
import type { Document } from "@/types/document";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/actions/documents", () => ({
  createDocumentAction: vi.fn(),
  updateDocumentAction: vi.fn(),
  deleteDocumentAction: vi.fn(),
}));

const DOCUMENT: Document = {
  id: "1",
  title: "テストドキュメント",
  description: "テスト用の説明文",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
};

const BASE_PROPS = {
  document: DOCUMENT,
  locale: "ja",
  detailTitleLabel: "ドキュメント詳細",
  editTitleLabel: "ドキュメントの編集",
  editButtonLabel: "編集",
  cancelButtonLabel: "キャンセル",
  backToListLabel: "一覧へ戻る",
  fileSizeLabel: "ファイルサイズ",
  uploadedAtLabel: "アップロード日",
  downloadLinkLabel: "ダウンロード",
  targetingAllLabel: "全体公開",
  targetingCountriesLabel: "対象国・地域",
  targetingCompaniesLabel: "対象販社",
  countryLabels: {},
  companyLabels: {},
  deleteButtonLabel: "削除",
  deleteConfirmMessage: "このドキュメントを削除しますか？",
  deleteErrorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
  formProps: {
    countryOptions: [],
    companyOptions: [],
    titleLabel: "タイトル",
    titlePlaceholder: "",
    descriptionLabel: "説明",
    descriptionPlaceholder: "",
    targetingLabel: "公開範囲",
    targetingAllOption: "全体公開",
    targetingCountriesOption: "特定の国・地域を指定",
    targetingCompaniesOption: "特定の販社を指定",
    countriesLabel: "国・地域",
    companiesLabel: "販社",
    fileLabel: "PDFファイル",
    fileHint: "",
    removeFileButtonLabel: "削除",
    submitButtonLabel: "保存する",
    requiredErrorMessage: "この項目は必須です",
    countriesRequiredErrorMessage: "1つ以上の国・地域を選択してください",
    companiesRequiredErrorMessage: "1つ以上の販社を選択してください",
    fileRequiredErrorMessage: "PDFファイルを選択してください",
    sizeExceededMessage: "ファイルサイズが上限（20MB）を超えています",
    typeNotAllowedMessage: "許可されていないファイル形式です（PDFのみ）",
    readFailedMessage:
      "ファイルの読み込みに失敗しました。もう一度お試しください。",
    requiredIndicator: "*",
    submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
  },
};

describe("DocumentDetailPanel", () => {
  it("初期表示（編集モード）でタイトル入力欄とPDFプレビューを表示し、表示専用の情報は表示しない", () => {
    render(<DocumentDetailPanel {...BASE_PROPS} />);

    expect(
      screen.getByRole("heading", { name: BASE_PROPS.editTitleLabel }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/タイトル/)).toBeTruthy();

    const iframe = screen.getByTitle("テストドキュメント");
    expect(iframe.getAttribute("src")).toBe(DOCUMENT.dataUrl);

    expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
  });

  it("「キャンセル」をクリックすると表示モードに切り替わり、登録済み情報とPDFプレビューを表示する", () => {
    render(<DocumentDetailPanel {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(
      screen.getByRole("heading", { name: BASE_PROPS.detailTitleLabel }),
    ).toBeTruthy();
    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("テスト用の説明文")).toBeTruthy();
    expect(screen.getByText("全体公開")).toBeTruthy();
    expect(screen.queryByLabelText(/タイトル/)).toBeNull();

    const iframe = screen.getByTitle("テストドキュメント");
    expect(iframe.getAttribute("src")).toBe(DOCUMENT.dataUrl);
  });

  it("表示モードで「編集」ボタンをクリックすると編集モードに戻る", () => {
    render(<DocumentDetailPanel {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByLabelText(/タイトル/)).toBeTruthy();
  });
});
