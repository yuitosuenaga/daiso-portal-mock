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
    requireApplicantSession: vi.fn(),
  };
});

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

// AppShell（クライアントコンポーネント）は`@/i18n/navigation`（next-intlの
// `createNavigation`経由で内部的に`next/navigation`を読み込む）に依存しており、
// vitest環境ではこの実体をそのまま読み込むと解決エラーになるためスタブ化する。
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  redirect: () => undefined,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import ApplicantLayout from "@/app/[locale]/(applicant)/layout";
import {
  UnauthorizedSessionError,
  requireApplicantSession,
} from "@/lib/server/auth-session";

describe("ApplicantLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効な申請者セッションのとき、子要素をAppShellでラップして描画する", async () => {
    vi.mocked(requireApplicantSession).mockResolvedValue({
      claims: { role: "applicant", applicantUserId: "applicant-1" },
    } as never);

    const element = await ApplicantLayout({
      children: "children",
      params: Promise.resolve({ locale: "ja" }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBe("children");
  });

  it("無効化されたアカウント（セッション失効）のとき、ログイン画面へリダイレクトする", async () => {
    vi.mocked(requireApplicantSession).mockRejectedValue(
      new UnauthorizedSessionError("Applicant session required")
    );

    await expect(
      ApplicantLayout({
        children: "children",
        params: Promise.resolve({ locale: "ja" }),
      })
    ).rejects.toThrow("REDIRECT:/ja/login");

    expect(redirectMock).toHaveBeenCalledWith("/ja/login");
  });

  it("ロケールがenのとき、英語ログイン画面へリダイレクトする", async () => {
    vi.mocked(requireApplicantSession).mockRejectedValue(
      new UnauthorizedSessionError("Applicant session required")
    );

    await expect(
      ApplicantLayout({
        children: "children",
        params: Promise.resolve({ locale: "en" }),
      })
    ).rejects.toThrow("REDIRECT:/en/login");
  });

  it("セッション検証で想定外のエラーが起きたとき、リダイレクトせず再送出する", async () => {
    vi.mocked(requireApplicantSession).mockRejectedValue(
      new Error("unexpected")
    );

    await expect(
      ApplicantLayout({
        children: "children",
        params: Promise.resolve({ locale: "ja" }),
      })
    ).rejects.toThrow("unexpected");

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
