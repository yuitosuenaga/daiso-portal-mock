import { describe, expect, it } from "vitest";

import { pickAccountByEmail } from "@/lib/auth/email-match";

describe("pickAccountByEmail", () => {
  it("0件ならnull", () => {
    expect(pickAccountByEmail([], "a@x.com")).toBeNull();
  });
  it("1件なら大文字小文字が違ってもその行", () => {
    const row = { email: "Tanaka@x.com" };
    expect(pickAccountByEmail([row], "tanaka@X.COM")).toBe(row);
  });
  it("複数で入力と完全一致する行があればそれを返す", () => {
    const upper = { email: "Tanaka@x.com" };
    const lower = { email: "tanaka@x.com" };
    expect(pickAccountByEmail([upper, lower], "tanaka@x.com")).toBe(lower);
    expect(pickAccountByEmail([lower, upper], "Tanaka@x.com")).toBe(upper);
  });
  it("複数で完全一致が無ければambiguous", () => {
    const rows = [{ email: "Tanaka@x.com" }, { email: "TANAKA@x.com" }];
    expect(pickAccountByEmail(rows, "tanaka@x.com")).toBe("ambiguous");
  });
  it("入力の前後の空白は無視して比較する", () => {
    const upper = { email: "Tanaka@x.com" };
    const lower = { email: "tanaka@x.com" };
    expect(pickAccountByEmail([upper, lower], "  tanaka@x.com ")).toBe(lower);
  });
});
