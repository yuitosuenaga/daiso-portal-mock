import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));

import { ApplicantUserEmailTakenError, ApplicantUserNotFoundError } from "@/lib/server/applicant-user-service";
import { CompanyCodeTakenError, CompanyNotFoundError } from "@/lib/server/company-service";
import {
  DocumentCategoryInUseError,
  DocumentCategoryNameConflictError,
  DocumentCategoryNotFoundError,
} from "@/lib/server/document-category-service";
import { InquiryNotFoundError } from "@/lib/server/inquiry-service";

describe("サービス層エラーの文言（クライアントへ届きうるため機微情報を含めない）", () => {
  it("ID・メール・販社コード・名称・件数をmessageに含めない", () => {
    const errors = [
      new ApplicantUserEmailTakenError("secret@example.com"),
      new ApplicantUserNotFoundError("secret-id"),
      new CompanyCodeTakenError("secret-code"),
      new CompanyNotFoundError("secret-id"),
      new DocumentCategoryNotFoundError("secret-id"),
      new DocumentCategoryNameConflictError("secret-name"),
      new DocumentCategoryInUseError(123456, 654321),
      new InquiryNotFoundError("secret-id"),
    ];
    for (const error of errors) {
      expect(error.message).not.toMatch(/secret|123456|654321/);
    }
  });

  it("ログ調査用の値はプロパティに保持する", () => {
    expect(new ApplicantUserEmailTakenError("a@example.com").email).toBe("a@example.com");
    expect(new CompanyNotFoundError("c1").companyId).toBe("c1");
    expect(new DocumentCategoryNameConflictError("n").categoryName).toBe("n");
    expect(new InquiryNotFoundError("i1").inquiryId).toBe("i1");
  });
});
