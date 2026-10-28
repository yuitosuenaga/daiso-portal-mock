import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyManagementList } from "@/components/features/helpdesk-companies/CompanyManagementList";
import { logLoadFailure } from "@/lib/server/load-failure";

const listCompaniesForManagementMock = vi.fn();

vi.mock("@/lib/server/company-service", () => ({
  listCompaniesForManagement: (...args: unknown[]) => listCompaniesForManagementMock(...args),
}));
vi.mock("@/lib/server/auth-session", () => ({
  isHelpdeskAdmin: async () => false,
}));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

describe("CompanyManagementList", () => {
  it("取得が例外をthrowしたときエラーカードを表示し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    listCompaniesForManagementMock.mockRejectedValueOnce(error);

    render(await CompanyManagementList());

    expect(screen.getByText("helpdeskCompanies.list.error")).toBeTruthy();
    expect(logLoadFailure).toHaveBeenCalledWith("CompanyManagementList", error);
  });
});
