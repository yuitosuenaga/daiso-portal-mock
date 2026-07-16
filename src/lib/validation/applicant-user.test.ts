import { describe, expect, it } from "vitest";

import {
  applicantUserCreateFormSchema,
  applicantUserUpdateFormSchema,
} from "@/lib/validation/applicant-user";

describe("applicantUserCreateFormSchema", () => {
  function buildInput(overrides: Record<string, unknown> = {}) {
    return {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "password123",
      ...overrides,
    };
  }

  it("メールアドレス・表示名・パスワードが入力されていれば検証を通過する", () => {
    const result = applicantUserCreateFormSchema.safeParse(buildInput());

    expect(result.success).toBe(true);
  });

  it("メールアドレスが未入力の場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ email: "" })
    );

    expect(result.success).toBe(false);
  });

  it("メールアドレスの形式が不正な場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ email: "not-an-email" })
    );

    expect(result.success).toBe(false);
  });

  it("表示名が未入力の場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ displayName: "" })
    );

    expect(result.success).toBe(false);
  });

  it("表示名が空白文字のみの場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ displayName: "   " })
    );

    expect(result.success).toBe(false);
  });

  it("パスワードが最小文字数(8文字)未満の場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ password: "short1" })
    );

    expect(result.success).toBe(false);
  });

  it("パスワードが未入力の場合はエラーになる", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ password: "" })
    );

    expect(result.success).toBe(false);
  });

  it("パスワードがちょうど8文字の場合は検証を通過する", () => {
    const result = applicantUserCreateFormSchema.safeParse(
      buildInput({ password: "12345678" })
    );

    expect(result.success).toBe(true);
  });
});

describe("applicantUserUpdateFormSchema", () => {
  function buildInput(overrides: Record<string, unknown> = {}) {
    return {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "",
      ...overrides,
    };
  }

  it("パスワードが空文字列の場合でも検証を通過する（既存パスワードを維持）", () => {
    const result = applicantUserUpdateFormSchema.safeParse(
      buildInput({ password: "" })
    );

    expect(result.success).toBe(true);
  });

  it("パスワードが未指定の場合でも検証を通過する（既存パスワードを維持）", () => {
    const result = applicantUserUpdateFormSchema.safeParse({
      email: "tanaka@example.com",
      displayName: "田中太郎",
    });

    expect(result.success).toBe(true);
  });

  it("パスワードに入力があり最小文字数(8文字)未満の場合はエラーになる", () => {
    const result = applicantUserUpdateFormSchema.safeParse(
      buildInput({ password: "short1" })
    );

    expect(result.success).toBe(false);
  });

  it("パスワードに入力があり最小文字数(8文字)以上の場合は検証を通過する", () => {
    const result = applicantUserUpdateFormSchema.safeParse(
      buildInput({ password: "12345678" })
    );

    expect(result.success).toBe(true);
  });

  it("メールアドレスが未入力の場合はエラーになる", () => {
    const result = applicantUserUpdateFormSchema.safeParse(
      buildInput({ email: "" })
    );

    expect(result.success).toBe(false);
  });

  it("表示名が未入力の場合はエラーになる", () => {
    const result = applicantUserUpdateFormSchema.safeParse(
      buildInput({ displayName: "" })
    );

    expect(result.success).toBe(false);
  });
});
