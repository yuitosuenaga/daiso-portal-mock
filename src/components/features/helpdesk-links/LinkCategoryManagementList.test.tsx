import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkCategoryManagementList } from "@/components/features/helpdesk-links/LinkCategoryManagementList";
import { logLoadFailure } from "@/lib/server/load-failure";

const getAllLinkCategoriesMock = vi.fn();

vi.mock("@/lib/api/link-categories", () => ({
  getAllLinkCategories: (...args: unknown[]) => getAllLinkCategoriesMock(...args),
}));
vi.mock("@/components/features/helpdesk-links/LinkPreviewPanel", () => ({
  LinkPreviewPanel: async () => null,
}));
vi.mock("@/components/features/helpdesk-links/LinkCategoryManagementListClient", () => ({ LinkCategoryManagementListClient: () => null }));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

describe("LinkCategoryManagementList", () => {
  it("取得が例外をthrowしたときエラーカードを表示し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    getAllLinkCategoriesMock.mockRejectedValueOnce(error);

    render(await LinkCategoryManagementList());

    expect(screen.getByText("helpdeskLinks.categories.list.error")).toBeTruthy();
    expect(logLoadFailure).toHaveBeenCalledWith("LinkCategoryManagementList", error);
  });
});
