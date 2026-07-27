// 結合テスト: `createApplicantUser`（applicant-user-service）で新規作成した`ApplicantUser`が、
// 追加のマスタ生成なしに確認済みトラッキングの対象母集団（`getAnnouncementUserReadStatuses`、
// announcement-service）へ「未確認」として現れることを検証する
// （`announcements-management`spec 要件42.4）。
//
// 実DBは使わず、`applicantUser`/`announcement`について最小限の振る舞いを持つインメモリの
// フェイクPrismaを用意し、applicant-user-service（書き込み側）とannouncement-service
// （読み取り側）の実装コードをそのまま接続して検証する。受信レシート
// （`AnnouncementReadReceipt`）の事前生成が一切行われないことを、レシートテーブルへの
// 書き込みモックを一切用意しないことで確認する。

import { describe, expect, it, vi, beforeEach } from "vitest";

interface FakeCompany {
  id: string;
  country: string;
  companyCode: string;
}

interface FakeApplicantUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  companyId: string;
  isActive: boolean;
  preferredLocale: string;
  createdAt: Date;
}

const store = vi.hoisted(() => {
  const state = {
    companies: [] as FakeCompany[],
    applicantUsers: [] as FakeApplicantUser[],
    seq: 0,
  };

  function nextId(prefix: string): string {
    state.seq += 1;
    return `${prefix}-${state.seq}`;
  }

  const applicantUserCreate = vi.fn(
    async ({ data }: { data: Omit<FakeApplicantUser, "id" | "createdAt"> }) => {
      const record: FakeApplicantUser = { id: nextId("user"), createdAt: new Date(), ...data };
      state.applicantUsers.push(record);
      return record;
    }
  );

  function findCompany(companyId: string): FakeCompany {
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) {
      throw new Error(`fake store: company not found: ${companyId}`);
    }
    return company;
  }

  function userMatches(
    user: FakeApplicantUser,
    where: Record<string, unknown> | undefined
  ): boolean {
    if (!where) return true;
    if ("isActive" in where && user.isActive !== where.isActive) return false;
    if ("company" in where) {
      const company = findCompany(user.companyId);
      const companyWhere = where.company as { country?: { in?: string[] } | string };
      if (companyWhere?.country) {
        const filter = companyWhere.country;
        if (typeof filter === "string") {
          if (company.country !== filter) return false;
        } else if (filter?.in) {
          if (!filter.in.includes(company.country)) return false;
        }
      }
    }
    return true;
  }

  const applicantUserFindMany = vi.fn(
    async ({
      where,
      include,
    }: {
      where?: Record<string, unknown>;
      include?: { company?: boolean; announcementReadReceipts?: { where?: { announcementId?: string } } };
    }) => {
      return state.applicantUsers
        .filter((user) => userMatches(user, where))
        .map((user) => ({
          ...user,
          ...(include?.company ? { company: findCompany(user.companyId) } : {}),
          // 受信レシートは一切ストアに用意しない（事前生成が行われないことの検証）ため、
          // 常に空配列を返す（未確認状態を表す）。
          ...(include?.announcementReadReceipts ? { announcementReadReceipts: [] } : {}),
        }));
    }
  );

  const FIXED_ANNOUNCEMENT_ID = "ann-1";

  const announcementFindUnique = vi.fn(async ({ where }: { where: { id: string } }) => {
    if (where.id !== FIXED_ANNOUNCEMENT_ID) return null;
    return {
      id: FIXED_ANNOUNCEMENT_ID,
      title: "お知らせ",
      body: "本文",
      category: "other" as const,
      status: "published" as const,
      publishedAt: new Date("2026-07-01T00:00:00.000Z"),
      actionRequired: true,
      targetingScope: "all" as const,
      targetingCountries: [] as string[],
      publishStartDate: null,
      publishEndDate: null,
      dueDate: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      attachments: [],
      linkedDocuments: [],
      translations: [],
    };
  });

  return {
    state,
    FIXED_ANNOUNCEMENT_ID,
    applicantUserCreate,
    applicantUserFindMany,
    announcementFindUnique,
  };
});

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn().mockResolvedValue({
    claims: {
      id: "staff-1",
      role: "helpdesk",
      staffId: "staff-1",
      displayName: "田中 太郎",
    },
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: {
      create: store.applicantUserCreate,
      findMany: store.applicantUserFindMany,
    },
    announcement: {
      findUnique: store.announcementFindUnique,
    },
  },
}));

import { createApplicantUser } from "@/lib/server/applicant-user-service";
import { getAnnouncementUserReadStatuses } from "@/lib/server/announcement-service";

beforeEach(() => {
  store.state.companies.length = 0;
  store.state.applicantUsers.length = 0;
  store.state.seq = 0;
  store.state.companies.push({ id: "company-1", country: "VN", companyCode: "vn-daiso-vietnam" });
  vi.clearAllMocks();
});

describe("ApplicantUser作成直後の確認済みトラッキング対象母集団への反映（結合テスト・要件42.4）", () => {
  it("新規作成したApplicantUserが、追加マスタ生成なしにgetAnnouncementUserReadStatusesの対象母集団へ「未確認」として現れる", async () => {
    const created = await createApplicantUser("company-1", {
      email: "new-user@example.com",
      displayName: "New User",
      password: "password1234",
      preferredLocale: "en",
    });

    const statuses = await getAnnouncementUserReadStatuses(store.FIXED_ANNOUNCEMENT_ID);

    const match = statuses.find((status) => status.applicantUserId === created.id);
    expect(match).toBeDefined();
    expect(match?.confirmedAt).toBeNull();
    expect(match?.readReminderSentAt).toBeNull();
  });

  it("無効化済み（isActive: false）のApplicantUserは対象母集団に含まれない", async () => {
    store.state.applicantUsers.push({
      id: "inactive-user",
      email: "inactive@example.com",
      displayName: "Inactive User",
      passwordHash: "hash",
      companyId: "company-1",
      isActive: false,
      preferredLocale: "en",
      createdAt: new Date(),
    });

    const statuses = await getAnnouncementUserReadStatuses(store.FIXED_ANNOUNCEMENT_ID);

    expect(statuses.some((status) => status.applicantUserId === "inactive-user")).toBe(false);
  });
});
