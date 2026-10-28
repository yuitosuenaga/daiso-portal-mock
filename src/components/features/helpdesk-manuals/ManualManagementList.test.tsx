import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ManualManagementList } from "@/components/features/helpdesk-manuals/ManualManagementList";
import { logLoadFailure } from "@/lib/server/load-failure";

const getAllManualsMock = vi.fn();

vi.mock("@/lib/api/manuals", () => ({
  getAllManuals: (...args: unknown[]) => getAllManualsMock(...args),
}));
vi.mock("@/components/features/helpdesk-manuals/ManualManagementListClient", () => ({ ManualManagementListClient: () => null }));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

describe("ManualManagementList", () => {
  it("取得が例外をthrowしたときエラーカードを表示し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    getAllManualsMock.mockRejectedValueOnce(error);

    render(await ManualManagementList());

    expect(screen.getByText("helpdeskManuals.list.error")).toBeTruthy();
    expect(logLoadFailure).toHaveBeenCalledWith("ManualManagementList", error);
  });
});
