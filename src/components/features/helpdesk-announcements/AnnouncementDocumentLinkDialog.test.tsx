import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementDocumentLinkDialog } from "@/components/features/helpdesk-announcements/AnnouncementDocumentLinkDialog";
import type { Document } from "@/types/document";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    title: "業務マニュアル",
    sourceType: "upload",
    fileName: "manual.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  } as Document;
}

const labels = {
  dialogTitle: "ドキュメントを選択",
  confirmButtonLabel: "選択を確定",
  cancelButtonLabel: "キャンセル",
  noDocumentsMessage: "登録済みのドキュメントはありません",
  targetingAllLabel: "全体公開",
  targetingCountriesPrefixLabel: "対象国:",
  targetingCompaniesPrefixLabel: "対象会社:",
};

describe("AnnouncementDocumentLinkDialog", () => {
  it("ドキュメント一覧をタイトル・ファイルサイズ・公開範囲サマリーとともに表示する", () => {
    render(
      <AnnouncementDocumentLinkDialog
        open
        onOpenChange={vi.fn()}
        documentOptions={[
          makeDocument({
            id: "doc-1",
            title: "業務マニュアル",
            targeting: { scope: "countries", countries: ["JP", "VN"] },
          }),
        ]}
        selectedIds={[]}
        onConfirm={vi.fn()}
        maxCount={5}
        {...labels}
      />
    );

    expect(screen.getByText("業務マニュアル")).toBeTruthy();
    expect(screen.getByText(/1\.0KB/)).toBeTruthy();
    expect(screen.getByText(/対象国: JP, VN/)).toBeTruthy();
  });

  it("ドキュメントが1件も無いとき空メッセージを表示する", () => {
    render(
      <AnnouncementDocumentLinkDialog
        open
        onOpenChange={vi.fn()}
        documentOptions={[]}
        selectedIds={[]}
        onConfirm={vi.fn()}
        maxCount={5}
        {...labels}
      />
    );

    expect(
      screen.getByText("登録済みのドキュメントはありません")
    ).toBeTruthy();
  });

  it("上限件数に達すると未選択のチェックボックスが無効化される", () => {
    const documentOptions = Array.from({ length: 3 }, (_, i) =>
      makeDocument({ id: `doc-${i}`, title: `ドキュメント${i}` })
    );

    render(
      <AnnouncementDocumentLinkDialog
        open
        onOpenChange={vi.fn()}
        documentOptions={documentOptions}
        selectedIds={["doc-0", "doc-1"]}
        onConfirm={vi.fn()}
        maxCount={2}
        {...labels}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
    expect(checkboxes[2].disabled).toBe(true);
  });

  it("選択を確定すると選択済みIDでonConfirmが呼ばれ、ダイアログが閉じる", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const documentOptions = [
      makeDocument({ id: "doc-1", title: "ドキュメント1" }),
      makeDocument({ id: "doc-2", title: "ドキュメント2" }),
    ];

    render(
      <AnnouncementDocumentLinkDialog
        open
        onOpenChange={onOpenChange}
        documentOptions={documentOptions}
        selectedIds={["doc-1"]}
        onConfirm={onConfirm}
        maxCount={5}
        {...labels}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole("button", { name: "選択を確定" }));

    expect(onConfirm).toHaveBeenCalledWith(["doc-1", "doc-2"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("キャンセルするとonConfirmを呼ばずにダイアログが閉じる", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AnnouncementDocumentLinkDialog
        open
        onOpenChange={onOpenChange}
        documentOptions={[makeDocument()]}
        selectedIds={[]}
        onConfirm={onConfirm}
        maxCount={5}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
