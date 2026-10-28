import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentCategoryManagementList } from "@/components/features/helpdesk-document-categories/DocumentCategoryManagementList";
import { logLoadFailure } from "@/lib/server/load-failure";

const getAllDocumentCategoriesMock = vi.fn();

vi.mock("@/lib/api/document-categories", () => ({
  getAllDocumentCategories: (...args: unknown[]) => getAllDocumentCategoriesMock(...args),
}));
vi.mock("@/components/features/helpdesk-document-categories/DocumentCategoryManagementListClient", () => ({ DocumentCategoryManagementListClient: () => null }));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

describe("DocumentCategoryManagementList", () => {
  it("取得が例外をthrowしたときエラーカードを表示し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    getAllDocumentCategoriesMock.mockRejectedValueOnce(error);

    render(await DocumentCategoryManagementList());

    expect(screen.getByText("helpdeskDocumentCategories.list.error")).toBeTruthy();
    expect(logLoadFailure).toHaveBeenCalledWith("DocumentCategoryManagementList", error);
  });
});
