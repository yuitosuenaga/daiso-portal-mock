import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markInquiryReadActionMock = vi.fn();

vi.mock("@/lib/actions/inquiry", () => ({
  markInquiryReadAction: (...args: unknown[]) =>
    markInquiryReadActionMock(...args),
}));

import { MarkInquiryRead } from "@/components/features/inquiry-list/MarkInquiryRead";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MarkInquiryRead", () => {
  it("マウント時にmarkInquiryReadActionを1度だけ呼び出す", async () => {
    markInquiryReadActionMock.mockResolvedValue(undefined);

    render(<MarkInquiryRead inquiryId="inquiry-1" />);

    await waitFor(() => {
      expect(markInquiryReadActionMock).toHaveBeenCalledWith("inquiry-1");
    });
    expect(markInquiryReadActionMock).toHaveBeenCalledTimes(1);
  });

  it("何も描画しない（nullを返す）", () => {
    markInquiryReadActionMock.mockResolvedValue(undefined);

    const { container } = render(<MarkInquiryRead inquiryId="inquiry-1" />);

    expect(container.textContent).toBe("");
  });

  it("markInquiryReadActionが失敗しても例外を外へ伝播させない", async () => {
    markInquiryReadActionMock.mockRejectedValue(new Error("failed"));

    expect(() => render(<MarkInquiryRead inquiryId="inquiry-1" />)).not.toThrow();

    await waitFor(() => {
      expect(markInquiryReadActionMock).toHaveBeenCalledWith("inquiry-1");
    });
  });
});
