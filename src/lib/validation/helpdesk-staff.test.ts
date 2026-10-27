import { describe, expect, it } from "vitest";

import { APPLICANT_USER_PASSWORD_MIN_LENGTH } from "@/lib/constants/applicant-user";
import { helpdeskStaffCreateFormSchema } from "@/lib/validation/helpdesk-staff";

const base = { email: "Staff@Example.com ", displayName: " 山田 ", role: "member" as const };

describe("helpdeskStaffCreateFormSchema", () => {
  it("メールをtrimして小文字化し、表示名をtrimする", () => {
    const parsed = helpdeskStaffCreateFormSchema.parse(base);
    expect(parsed.email).toBe("staff@example.com");
    expect(parsed.displayName).toBe("山田");
  });

  it("ロール未指定ならmemberになる", () => {
    const parsed = helpdeskStaffCreateFormSchema.parse({ email: "a@example.com", displayName: "A" });
    expect(parsed.role).toBe("member");
  });

  it("不正なロールを拒否する", () => {
    expect(() => helpdeskStaffCreateFormSchema.parse({ ...base, role: "owner" })).toThrow();
  });

  it("不正なメール・空の表示名を拒否する", () => {
    expect(() => helpdeskStaffCreateFormSchema.parse({ ...base, email: "nope" })).toThrow();
    expect(() => helpdeskStaffCreateFormSchema.parse({ ...base, displayName: "  " })).toThrow();
  });

  it("パスワードは未指定・空文字を許容する", () => {
    expect(helpdeskStaffCreateFormSchema.parse(base).password).toBeUndefined();
    expect(helpdeskStaffCreateFormSchema.parse({ ...base, password: "" }).password).toBe("");
  });

  it("パスワード入力時は最小文字数未満を拒否する", () => {
    const short = "x".repeat(APPLICANT_USER_PASSWORD_MIN_LENGTH - 1);
    const ok = "x".repeat(APPLICANT_USER_PASSWORD_MIN_LENGTH);
    expect(() => helpdeskStaffCreateFormSchema.parse({ ...base, password: short })).toThrow();
    expect(helpdeskStaffCreateFormSchema.parse({ ...base, password: ok }).password).toBe(ok);
  });
});
