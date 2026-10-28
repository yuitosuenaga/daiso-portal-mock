import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkPreviewPanel } from "@/components/features/helpdesk-links/LinkPreviewPanel";
import { logLoadFailure } from "@/lib/server/load-failure";

const getLinksMock = vi.fn();
const getLinkCategoriesForApplicantMock = vi.fn();

vi.mock("@/lib/api/links", () => ({
  getLinks: (...args: unknown[]) => getLinksMock(...args),
}));
vi.mock("@/lib/api/link-categories", () => ({
  getLinkCategoriesForApplicant: (...args: unknown[]) => getLinkCategoriesForApplicantMock(...args),
}));
vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg: string | { namespace: string }) => {
    const namespace = typeof arg === "string" ? arg : arg.namespace;
    return (key: string) => `${namespace}.${key}`;
  },
}));

describe("LinkPreviewPanel", () => {
  it("取得が例外をthrowしたときhasError=trueで描画を継続し、logLoadFailureで記録する", async () => {
    const error = new Error("db down");
    getLinksMock.mockRejectedValueOnce(error);
    getLinkCategoriesForApplicantMock.mockResolvedValue([]);

    const jsx = await LinkPreviewPanel();

    expect(jsx.props.hasError).toBe(true);
    expect(() => render(jsx)).not.toThrow();
    expect(logLoadFailure).toHaveBeenCalledWith("LinkPreviewPanel", error);
  });
});
