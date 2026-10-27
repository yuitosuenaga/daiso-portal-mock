import { beforeEach, describe, expect, it, vi } from "vitest";

const requireHelpdeskAdminPageMock = vi.fn();
vi.mock("@/lib/server/require-helpdesk-admin-page", () => ({
  requireHelpdeskAdminPage: () => requireHelpdeskAdminPageMock(),
}));

const getTranslationsMock = vi.fn(async () => (key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: (...args: unknown[]) => getTranslationsMock(...(args as [])),
  getLocale: async () => "ja",
}));

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/server/auth-session", () => ({}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

const listHelpdeskStaffMock = vi.fn();
vi.mock("@/lib/server/helpdesk-staff-service", () => ({
  listHelpdeskStaff: (...args: unknown[]) => listHelpdeskStaffMock(...args),
}));

import StaffListPage from "./page";
import StaffNewPage from "./new/page";

const pages: Array<[string, () => Promise<unknown>]> = [
  ["staff", async () => StaffListPage()],
  ["staff/new", () => StaffNewPage()],
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("スタッフ管理ページ（admin専用）", () => {
  it.each(pages)(
    "%s は admin 以外だと notFound が送出され、ページ本体の処理に進まない",
    async (_name, render) => {
      requireHelpdeskAdminPageMock.mockRejectedValue(new Error("NEXT_NOT_FOUND"));

      await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");

      expect(requireHelpdeskAdminPageMock).toHaveBeenCalledTimes(1);
      expect(getTranslationsMock).not.toHaveBeenCalled();
      expect(listHelpdeskStaffMock).not.toHaveBeenCalled();
    }
  );

  it.each(pages)("%s は admin なら描画できる", async (_name, render) => {
    requireHelpdeskAdminPageMock.mockResolvedValue(undefined);

    await expect(render()).resolves.toBeTruthy();
  });
});
