import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentGoogleLinkField } from "@/components/features/helpdesk-documents/DocumentGoogleLinkField";

describe("DocumentGoogleLinkField", () => {
  it("値の変更時にonChangeへ入力文字列を渡す", () => {
    const onChange = vi.fn();

    render(
      <DocumentGoogleLinkField
        value=""
        onChange={onChange}
        label="Googleドキュメントの共有リンク"
        hint="共有設定に関するヒント"
        placeholder="https://docs.google.com/document/d/..."
      />
    );

    fireEvent.change(screen.getByLabelText("Googleドキュメントの共有リンク"), {
      target: { value: "https://docs.google.com/document/d/abc123/edit" },
    });

    expect(onChange).toHaveBeenCalledWith(
      "https://docs.google.com/document/d/abc123/edit"
    );
  });

  it("invalidがtrueのときaria-invalidを設定する", () => {
    render(
      <DocumentGoogleLinkField
        value="https://example.com/not-google"
        onChange={vi.fn()}
        label="Googleドキュメントの共有リンク"
        hint="共有設定に関するヒント"
        placeholder="https://docs.google.com/document/d/..."
        invalid
      />
    );

    expect(
      screen.getByLabelText("Googleドキュメントの共有リンク").getAttribute("aria-invalid")
    ).toBe("true");
  });

  it("invalidが未指定またはfalseのときaria-invalidを設定しない", () => {
    render(
      <DocumentGoogleLinkField
        value="https://docs.google.com/document/d/abc123/edit"
        onChange={vi.fn()}
        label="Googleドキュメントの共有リンク"
        hint="共有設定に関するヒント"
        placeholder="https://docs.google.com/document/d/..."
      />
    );

    expect(
      screen.getByLabelText("Googleドキュメントの共有リンク").getAttribute("aria-invalid")
    ).toBeNull();
  });

  it("エラーメッセージ自体は表示しない（呼び出し側のFormFieldが表示する責務）", () => {
    render(
      <DocumentGoogleLinkField
        value="https://example.com/not-google"
        onChange={vi.fn()}
        label="Googleドキュメントの共有リンク"
        hint="共有設定に関するヒント"
        placeholder="https://docs.google.com/document/d/..."
        invalid
      />
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
