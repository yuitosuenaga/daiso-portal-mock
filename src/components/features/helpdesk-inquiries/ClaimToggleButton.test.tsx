import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClaimToggleButton } from "@/components/features/helpdesk-inquiries/ClaimToggleButton";

const claimInquiryActionMock = vi.fn().mockResolvedValue(undefined);
const releaseInquiryClaimActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/helpdesk", () => ({
  claimInquiryAction: (...args: unknown[]) => claimInquiryActionMock(...args),
  releaseInquiryClaimAction: (...args: unknown[]) =>
    releaseInquiryClaimActionMock(...args),
}));

describe("ClaimToggleButton", () => {
  it("未対応中の場合、対応中にするボタンを押すとclaimInquiryActionが呼ばれる", async () => {
    render(
      <ClaimToggleButton
        inquiryId="inquiry-001"
        claim={null}
        claimButtonLabel="対応中にする"
        releaseButtonLabel="対応を外す"
        claimedByLabel="対応者"
        errorMessage="操作に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "対応中にする" }));

    await waitFor(() => {
      expect(claimInquiryActionMock).toHaveBeenCalledWith("inquiry-001");
    });
  });

  it("対応中の場合、担当者名を表示し、対応を外すボタンを押すとreleaseInquiryClaimActionが呼ばれる", async () => {
    render(
      <ClaimToggleButton
        inquiryId="inquiry-001"
        claim={{ staffName: "田中 太郎", claimedAt: "2026-07-01T00:00:00.000Z" }}
        claimButtonLabel="対応中にする"
        releaseButtonLabel="対応を外す"
        claimedByLabel="対応者"
        errorMessage="操作に失敗しました。時間を置いて再度お試しください。"
      />
    );

    expect(screen.getByText(/田中 太郎/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "対応を外す" }));

    await waitFor(() => {
      expect(releaseInquiryClaimActionMock).toHaveBeenCalledWith("inquiry-001");
    });
  });

  it("操作が失敗した場合はエラーメッセージを表示する", async () => {
    claimInquiryActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <ClaimToggleButton
        inquiryId="inquiry-001"
        claim={null}
        claimButtonLabel="対応中にする"
        releaseButtonLabel="対応を外す"
        claimedByLabel="対応者"
        errorMessage="操作に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "対応中にする" }));

    await waitFor(() => {
      expect(
        screen.getByText("操作に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
  });
});
