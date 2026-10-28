import { describe, expect, it } from "vitest";

import { emailSchema } from "@/lib/validation/email";

describe("emailSchema", () => {
  it("前後の空白を除去して小文字化する", () => {
    expect(emailSchema.parse("  Tanaka@X.com ")).toBe("tanaka@x.com");
  });
  it("空文字・不正形式は拒否する", () => {
    expect(emailSchema.safeParse("   ").success).toBe(false);
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});
