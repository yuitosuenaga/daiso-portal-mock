import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "@/components/features/inquiry-form/InquiryForm";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const createInquiryMock = vi.fn();

vi.mock("@/lib/actions/inquiry", () => ({
  createInquiryAction: (...args: unknown[]) => createInquiryMock(...args),
}));

beforeEach(() => {
  createInquiryMock.mockClear();
});

function renderInquiryForm() {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <InquiryForm />
    </NextIntlClientProvider>
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/案件種別/), "defect");
  await user.selectOptions(screen.getByLabelText(/緊急度/), "high");
  await user.type(screen.getByLabelText(/店舗・地域/), "Tokyo");
  await user.type(
    screen.getByLabelText(/問い合わせ内容/),
    "テストの問い合わせ内容です。"
  );
  await user.selectOptions(screen.getByLabelText(/原文言語/), "ja");
  await user.type(screen.getByLabelText(/会社名/), "Daiso");
  await user.selectOptions(screen.getByLabelText(/^国/), "JP");
}

describe("InquiryForm", () => {
  it("必須項目が未入力のまま送信すると createInquiry が呼ばれず送信がブロックされる", async () => {
    const user = userEvent.setup();
    renderInquiryForm();

    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(createInquiryMock).not.toHaveBeenCalled();
  });

  it("送信成功時に完了バナーを表示しフォームをリセットする", async () => {
    createInquiryMock.mockResolvedValueOnce({
      id: "test-id",
      category: "defect",
      urgency: "high",
      storeRegion: "Tokyo",
      originalText: "テストの問い合わせ内容です。",
      originalLanguage: "ja",
      status: "new",
      createdAt: new Date().toISOString(),
      submittedBy: { companyName: "Daiso", country: "JP" },
    });
    const user = userEvent.setup();
    renderInquiryForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getByText("送信が完了しました")).toBeTruthy();
    });
    expect(createInquiryMock).toHaveBeenCalledTimes(1);
    expect(createInquiryMock.mock.calls[0][0].attachments).toEqual([]);
    expect(
      (screen.getByLabelText(/店舗・地域/) as HTMLInputElement).value
    ).toBe("");
  });

  it("添付ファイルを選択して送信すると、送信データに添付ファイルが含まれる", async () => {
    createInquiryMock.mockResolvedValueOnce({
      id: "test-id",
      category: "defect",
      urgency: "high",
      storeRegion: "Tokyo",
      originalText: "テストの問い合わせ内容です。",
      originalLanguage: "ja",
      status: "new",
      createdAt: new Date().toISOString(),
      submittedBy: { companyName: "Daiso", country: "JP" },
      attachments: [],
    });
    const user = userEvent.setup();
    renderInquiryForm();

    await fillValidForm(user);
    const file = new File([new Uint8Array(100)], "photo.png", {
      type: "image/png",
    });
    await user.upload(
      screen.getByLabelText("添付ファイル") as HTMLInputElement,
      file
    );
    await waitFor(() => {
      expect(screen.getByText(/photo\.png/)).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(createInquiryMock).toHaveBeenCalledTimes(1);
    });
    const attachments = createInquiryMock.mock.calls[0][0].attachments;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileName).toBe("photo.png");
  });

  it("添付ファイルのエラー表示後に送信成功すると、エラーメッセージが残らない", async () => {
    createInquiryMock.mockResolvedValueOnce({
      id: "test-id",
      category: "defect",
      urgency: "high",
      storeRegion: "Tokyo",
      originalText: "テストの問い合わせ内容です。",
      originalLanguage: "ja",
      status: "new",
      createdAt: new Date().toISOString(),
      submittedBy: { companyName: "Daiso", country: "JP" },
      attachments: [],
    });
    const user = userEvent.setup();
    renderInquiryForm();

    const invalidFile = new File(["text"], "notes.txt", {
      type: "text/plain",
    });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [invalidFile] });
    fireEvent.change(input);

    expect(
      screen.getByText("許可されていないファイル形式です（画像またはPDFのみ）")
    ).toBeTruthy();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getByText("送信が完了しました")).toBeTruthy();
    });
    expect(
      screen.queryByText("許可されていないファイル形式です（画像またはPDFのみ）")
    ).toBeNull();
  });

  it("送信失敗時にエラーバナーを表示し入力内容を保持する", async () => {
    createInquiryMock.mockRejectedValueOnce(new Error("network error"));
    const user = userEvent.setup();
    renderInquiryForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getByText("送信に失敗しました")).toBeTruthy();
    });
    expect(
      (screen.getByLabelText(/店舗・地域/) as HTMLInputElement).value
    ).toBe("Tokyo");
  });
});
