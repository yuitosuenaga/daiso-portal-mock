import { describe, expect, it } from "vitest";

import { addedTargetApplicantUsersWhere } from "@/lib/server/announcement-mapper";
import type { AnnouncementTargeting } from "@/types/announcement";

function withTargeting(targeting: AnnouncementTargeting) {
  return { targeting };
}

describe("addedTargetApplicantUsersWhere", () => {
  it("編集前が全体一律（all）のとき、常にnullを返す（要件35.3）", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "all" }),
        withTargeting({ scope: "countries", countries: ["VN"] })
      )
    ).toBeNull();

    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "all" }),
        withTargeting({ scope: "all" })
      )
    ).toBeNull();
  });

  it("編集前が特定国、編集後が全体一律（all）のとき、編集前の対象国に含まれない国のwhereを返す（要件35.4）", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN"] }),
        withTargeting({ scope: "all" })
      )
    ).toEqual({
      isActive: true,
      company: { country: { notIn: ["VN"] } },
    });
  });

  it("編集前後とも特定国で対象国が拡大したとき、差集合（新規追加分）のwhereを返す", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN"] }),
        withTargeting({ scope: "countries", countries: ["VN", "TH"] })
      )
    ).toEqual({
      isActive: true,
      company: { country: { in: ["TH"] } },
    });
  });

  it("編集前後とも特定国で対象国が縮小しただけのとき、nullを返す（要件35.5）", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN", "TH"] }),
        withTargeting({ scope: "countries", countries: ["VN"] })
      )
    ).toBeNull();
  });

  it("編集前後で対象国が同一のとき、nullを返す", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN"] }),
        withTargeting({ scope: "countries", countries: ["VN"] })
      )
    ).toBeNull();
  });

  it("新規追加分ありのときは常にwhereにisActive: trueを含める", () => {
    const countriesResult = addedTargetApplicantUsersWhere(
      withTargeting({ scope: "countries", countries: ["VN"] }),
      withTargeting({ scope: "countries", countries: ["VN", "TH"] })
    );
    expect(countriesResult).toMatchObject({ isActive: true });

    const allResult = addedTargetApplicantUsersWhere(
      withTargeting({ scope: "countries", countries: ["VN"] }),
      withTargeting({ scope: "all" })
    );
    expect(allResult).toMatchObject({ isActive: true });
  });
});
