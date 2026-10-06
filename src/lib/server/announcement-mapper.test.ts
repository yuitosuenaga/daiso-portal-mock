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

describe("個人指定（users）のtargeting", () => {
  it("targetApplicantUsersWhereは指定IDかつ有効なアカウントに絞る", () => {
    expect(
      targetApplicantUsersWhere(withTargeting({ scope: "users", userIds: ["u1", "u2"] }))
    ).toEqual({ isActive: true, id: { in: ["u1", "u2"] } });
  });

  it("targetingToColumnsが個人指定をカラム形状へ変換する", () => {
    expect(targetingToColumns({ scope: "users", userIds: ["u1"] })).toEqual({
      targetingScope: "users",
      targetingCountries: [],
      targetingUserIds: ["u1"],
    });
    expect(targetingToColumns({ scope: "all" }).targetingUserIds).toEqual([]);
  });

  it("個人指定の追加分のみを新規追加として返す／縮小・同一はnull", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1"] }),
        withTargeting({ scope: "users", userIds: ["u1", "u2"] })
      )
    ).toEqual({
      isActive: true,
      AND: [{ id: { in: ["u1", "u2"] } }],
      NOT: { id: { in: ["u1"] } },
    });
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "users", userIds: ["u1", "u2"] }),
        withTargeting({ scope: "users", userIds: ["u2"] })
      )
    ).toBeNull();
  });

  it("国指定から個人指定へ切り替えた場合、旧対象国外の指定個人を追加分とする", () => {
    expect(
      addedTargetApplicantUsersWhere(
        withTargeting({ scope: "countries", countries: ["VN"] }),
        withTargeting({ scope: "users", userIds: ["u1"] })
      )
    ).toEqual({
      isActive: true,
      AND: [{ id: { in: ["u1"] } }],
      NOT: { company: { country: { in: ["VN"] } } },
    });
  });
});
