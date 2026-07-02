import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusSelect } from "@/components/features/helpdesk-inquiries/StatusSelect";

const changeInquiryStatusActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/helpdesk", () => ({
  changeInquiryStatusAction: (...args: unknown[]) =>
    changeInquiryStatusActionMock(...args),
}));

const options = [
  { value: "new", label: "新規" },
  { value: "in_progress", label: "対応中" },
  { value: "resolved", label: "解決済み" },
];
const errorMessage = "対応状況の変更に失敗しました。時間を置いて再度お試しください。";

describe("StatusSelect", () => {
  it("選択を変更するとchangeInquiryStatusActionが呼ばれる", async () => {
    render(
      <StatusSelect
        inquiryId="inquiry-001"
        status="new"
        label="対応状況"
        options={options}
        errorMessage={errorMessage}
      />
    );

    fireEvent.change(screen.getByLabelText("対応状況"), {
      target: { value: "resolved" },
    });

    await waitFor(() => {
      expect(changeInquiryStatusActionMock).toHaveBeenCalledWith(
        "inquiry-001",
        "resolved"
      );
    });
  });

  it("変更が失敗した場合はエラーメッセージを表示する", async () => {
    changeInquiryStatusActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <StatusSelect
        inquiryId="inquiry-001"
        status="new"
        label="対応状況"
        options={options}
        errorMessage={errorMessage}
      />
    );

    fireEvent.change(screen.getByLabelText("対応状況"), {
      target: { value: "resolved" },
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeTruthy();
    });
  });
});
