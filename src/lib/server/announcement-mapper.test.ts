import { describe, expect, it } from "vitest";

import {
  addedTargetApplicantUsersWhere,
  targetApplicantUsersWhere,
  targetingToColumns,
} from "@/lib/server/announcement-mapper";
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

describe("個人・会社指定（users）のtargeting", () => {
  it("targetApplicantUsersWhereは指定個人または指定会社の所属で、かつ有効なアカウントに絞る", () => {
    expect(
      targetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1", "u2"], companyIds: ["c1"] })
      )
    ).toEqual({
      isActive: true,
      OR: [{ id: { in: ["u1", "u2"] } }, { companyId: { in: ["c1"] } }],
    });
  });

  it("targetingToColumnsが個人・会社指定をカラム形状へ変換する", () => {
    expect(
      targetingToColumns({ scope: "users", userIds: ["u1"], companyIds: ["c1"] })
    ).toEqual({
      targetingScope: "users",
      targetingCountries: [],
      targetingUserIds: ["u1"],
      targetingCompanyIds: ["c1"],
    });
    expect(targetingToColumns({ scope: "all" }).targetingUserIds).toEqual([]);
    expect(targetingToColumns({ scope: "all" }).targetingCompanyIds).toEqual([]);
  });

  it("個人・会社指定の追加分のみを新規追加として返す／縮小・同一はnull", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1"], companyIds: [] }),
        withTargeting({ scope: "users", userIds: ["u1", "u2"], companyIds: [] })
      )
    ).toEqual({
      isActive: true,
      AND: [{ OR: [{ id: { in: ["u1", "u2"] } }, { companyId: { in: [] } }] }],
      NOT: { OR: [{ id: { in: ["u1"] } }, { companyId: { in: [] } }] },
    });
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1", "u2"], companyIds: ["c1"] }),
        withTargeting({ scope: "users", userIds: ["u2"], companyIds: [] })
      )
    ).toBeNull();
  });

  it("会社を追加した場合は追加分を新規追加として返す", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1"], companyIds: ["c1"] }),
        withTargeting({ scope: "users", userIds: ["u1"], companyIds: ["c1", "c2"] })
      )
    ).toEqual({
      isActive: true,
      AND: [{ OR: [{ id: { in: ["u1"] } }, { companyId: { in: ["c1", "c2"] } }] }],
      NOT: { OR: [{ id: { in: ["u1"] } }, { companyId: { in: ["c1"] } }] },
    });
  });

  it("国指定から個人・会社指定へ切り替えた場合、旧対象国外の指定対象を追加分とする", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN"] }),
        withTargeting({ scope: "users", userIds: ["u1"], companyIds: ["c1"] })
      )
    ).toEqual({
      isActive: true,
      AND: [{ OR: [{ id: { in: ["u1"] } }, { companyId: { in: ["c1"] } }] }],
      NOT: { company: { country: { in: ["VN"] } } },
    });
  });
});
