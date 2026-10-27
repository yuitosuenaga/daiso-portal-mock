import { describe, expect, it } from "vitest";

import { pickSessionClaims } from "@/lib/auth/pick-session-claims";

describe("pickSessionClaims", () => {
  it("申請者のクレームのみを残し、JWTのその他のフィールドを落とす", () => {
    const result = pickSessionClaims({
      id: "u1",
      role: "applicant",
      applicantUserId: "u1",
      companyId: "c1",
      companyName: "Daiso",
      companyCode: "code",
      country: "VN",
      sub: "u1",
      iat: 1,
      exp: 2,
      jti: "jwt-id",
      email: "a@example.com",
      picture: "http://example.com/p.png",
    });

    expect(result).toEqual({
      id: "u1",
      role: "applicant",
      applicantUserId: "u1",
      companyId: "c1",
      companyName: "Daiso",
      companyCode: "code",
      country: "VN",
    });
  });

  it("ヘルプデスクのクレームのみを残す", () => {
    const result = pickSessionClaims({
      id: "s1",
      role: "helpdesk",
      staffId: "s1",
      displayName: "Staff",
      jti: "jwt-id",
      iat: 1,
    });

    expect(result).toEqual({
      id: "s1",
      role: "helpdesk",
      staffId: "s1",
      displayName: "Staff",
    });
  });
});
