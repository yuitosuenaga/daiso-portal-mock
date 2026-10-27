import { beforeEach, describe, expect, it, vi } from "vitest";

const requireHelpdeskAdminPageMock = vi.fn();
vi.mock("@/lib/server/require-helpdesk-admin-page", () => ({
  requireHelpdeskAdminPage: () => requireHelpdeskAdminPageMock(),
}));

const getTranslationsMock = vi.fn(async () => (key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: (...args: unknown[]) => getTranslationsMock(...(args as [])),
}));

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/server/auth-session", () => ({}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

const getCompanyByIdMock = vi.fn();
vi.mock("@/lib/server/company-service", () => ({
  getCompanyById: (...args: unknown[]) => getCompanyByIdMock(...args),
}));

const getApplicantUserByIdMock = vi.fn();
vi.mock("@/lib/server/applicant-user-service", () => ({
  getApplicantUserById: (...args: unknown[]) => getApplicantUserByIdMock(...args),
}));

import ApplicantUserEditPage from "./[id]/applicant-users/[userId]/edit/page";
import ApplicantUserNewPage from "./[id]/applicant-users/new/page";
import CompanyEditPage from "./[id]/edit/page";
import CompanyImportPage from "./import/page";
import CompanyNewPage from "./new/page";

const props = { params: Promise.resolve({ id: "company-1", userId: "user-1" }) };

const pages: Array<[string, () => Promise<unknown>]> = [
  ["companies/new", () => CompanyNewPage()],
  ["companies/import", () => CompanyImportPage()],
  ["companies/[id]/edit", () => CompanyEditPage(props)],
  ["companies/[id]/applicant-users/new", () => ApplicantUserNewPage(props)],
  ["companies/[id]/applicant-users/[userId]/edit", () => ApplicantUserEditPage(props)],
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("販社管理の書き込み系ページ", () => {
  it.each(pages)(
    "%s は admin 以外だと notFound が送出され、ページ本体の処理に進まない",
    async (_name, render) => {
      requireHelpdeskAdminPageMock.mockRejectedValue(new Error("NEXT_NOT_FOUND"));

      await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");

      expect(requireHelpdeskAdminPageMock).toHaveBeenCalledTimes(1);
      expect(getTranslationsMock).not.toHaveBeenCalled();
      expect(getCompanyByIdMock).not.toHaveBeenCalled();
      expect(getApplicantUserByIdMock).not.toHaveBeenCalled();
    }
  );
});
