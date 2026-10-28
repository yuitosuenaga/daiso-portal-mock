import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HelpdeskInquiryNewPage from "./page";
import { logLoadFailure } from "@/lib/server/load-failure";

const listCompaniesForHelpdeskMock = vi.fn();

vi.mock("@/lib/server/company-service", () => ({
  listCompaniesForHelpdesk: (...args: unknown[]) => listCompaniesForHelpdeskMock(...args),
}));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("@/components/features/inquiry-form/InquiryForm", () => ({
  InquiryForm: () => <div>form</div>,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("HelpdeskInquiryNewPage", () => {
  it("販社一覧の取得が例外をthrowしたときエラーカードを表示し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    listCompaniesForHelpdeskMock.mockRejectedValueOnce(error);

    render(await HelpdeskInquiryNewPage());

    expect(screen.getByText("inquiryForm.loadError")).toBeTruthy();
    expect(logLoadFailure).toHaveBeenCalledWith("HelpdeskInquiryNewPage", error);
  });
});
