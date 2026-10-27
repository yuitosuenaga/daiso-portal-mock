import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-session", () => {
  class UnauthorizedSessionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "UnauthorizedSessionError";
    }
  }
  return {
    UnauthorizedSessionError,
    requireHelpdeskStaffSession: vi.fn(),
  };
});

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

// HelpdeskAppShell（クライアントコンポーネント）はnext-intlのナビゲーションに依存するためスタブ化する。
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  redirect: () => undefined,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import HelpdeskDashboardLayout from "@/app/[locale]/helpdesk/(dashboard)/layout";
import {
  UnauthorizedSessionError,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";

describe("HelpdeskDashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なヘルプデスクセッションのとき、子要素を描画する", async () => {
    vi.mocked(requireHelpdeskStaffSession).mockResolvedValue({
      claims: { role: "helpdesk", staffId: "staff-1" },
    } as never);

    const element = await HelpdeskDashboardLayout({
      children: "children",
      params: Promise.resolve({ locale: "ja" }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBe("children");
  });

  it("セッションが失効（無効化）しているとき、ヘルプデスクログインへリダイレクトする", async () => {
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValue(
      new UnauthorizedSessionError("Helpdesk session required")
    );

    await expect(
      HelpdeskDashboardLayout({
        children: "children",
        params: Promise.resolve({ locale: "en" }),
      })
    ).rejects.toThrow("REDIRECT:/en/helpdesk/login");
  });

  it("想定外のエラーのとき、リダイレクトせず再送出する", async () => {
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValue(new Error("unexpected"));

    await expect(
      HelpdeskDashboardLayout({
        children: "children",
        params: Promise.resolve({ locale: "ja" }),
      })
    ).rejects.toThrow("unexpected");

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
