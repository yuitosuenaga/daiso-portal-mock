// 結合テスト: `createCompany`（company-service）で作成した`Company`が、作成直後から
// お知らせのトラッキング（`getAnnouncementRecipientStatuses`）・自己申告記録
// （`recordCompanyConfirmation`/`recordCompanyCompletion`、いずれもannouncement-service）の
// 対象に含まれることを検証する（`helpdesk-account-management`spec 要件12.4・タスク27）。
//
// 実DBは使わず、`company`/`announcementRecipient`/`announcementRecipientStatus`/
// `announcement`について最小限の振る舞いを持つインメモリのフェイクPrismaを用意し、
// company-service（書き込み側）とannouncement-service（読み取り側）の実装コードを
// そのまま接続して検証する。両モジュールが同一の`AnnouncementRecipient`テーブルを
// 前提に協調動作することを、モックの決め打ちレスポンスではなく実際のデータの
// 受け渡しで確認するのが狙い。

import { describe, expect, it, beforeEach, vi } from "vitest";

interface FakeCompany {
  id: string;
  name: string;
  country: string;
  companyCode: string;
  createdAt: Date;
}

interface FakeRecipient {
  id: string;
  companyId: string;
  contactName: string;
}

interface FakeStatus {
  announcementId: string;
  recipientId: string;
  confirmedAt: Date | null;
  completedAt: Date | null;
  reminderSentAt: Date | null;
}

const store = vi.hoisted(() => {
  const state = {
    companies: [] as FakeCompany[],
    recipients: [] as FakeRecipient[],
    statuses: [] as FakeStatus[],
    seq: 0,
  };

  function nextId(prefix: string): string {
    state.seq += 1;
    return `${prefix}-${state.seq}`;
  }

  function findCompany(companyId: string): FakeCompany {
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) {
      throw new Error(`fake store: company not found: ${companyId}`);
    }
    return company;
  }

  function companyMatches(company: FakeCompany, where: Record<string, unknown>): boolean {
    if ("companyCode" in where) {
      if (company.companyCode !== where.companyCode) return false;
    }
    if ("country" in where) {
      const countryFilter = where.country as { in?: string[] } | string;
      if (typeof countryFilter === "string") {
        if (company.country !== countryFilter) return false;
      } else if (countryFilter?.in) {
        if (!countryFilter.in.includes(company.country)) return false;
      }
    }
    return true;
  }

  function recipientMatches(
    recipient: FakeRecipient,
    where: Record<string, unknown> | undefined
  ): boolean {
    if (!where) return true;
    if ("AND" in where) {
      const clauses = where.AND as Record<string, unknown>[];
      return clauses.every((clause) => recipientMatches(recipient, clause));
    }
    if ("company" in where) {
      return companyMatches(findCompany(recipient.companyId), where.company as Record<string, unknown>);
    }
    return true;
  }

  const companyCreate = vi.fn(async ({ data }: { data: Omit<FakeCompany, "id" | "createdAt"> }) => {
    const record: FakeCompany = { id: nextId("company"), createdAt: new Date(), ...data };
    state.companies.push(record);
    return record;
  });

  const announcementRecipientCreate = vi.fn(
    async ({ data }: { data: { companyId: string; contactName: string } }) => {
      const record: FakeRecipient = { id: nextId("recipient"), ...data };
      state.recipients.push(record);
      return record;
    }
  );

  const transaction = vi.fn(
    async (
      callback: (tx: {
        company: { create: typeof companyCreate };
        announcementRecipient: { create: typeof announcementRecipientCreate };
      }) => unknown
    ) => callback({ company: { create: companyCreate }, announcementRecipient: { create: announcementRecipientCreate } })
  );

  const announcementRecipientFindMany = vi.fn(
    async ({
      where,
      include,
    }: {
      where?: Record<string, unknown>;
      include?: { company?: boolean; statuses?: { where?: { announcementId?: string } } };
    }) => {
      return state.recipients
        .filter((recipient) => recipientMatches(recipient, where))
        .map((recipient) => {
          const statusesForRecipient = state.statuses.filter(
            (status) =>
              status.recipientId === recipient.id &&
              (!include?.statuses?.where?.announcementId ||
                status.announcementId === include.statuses.where.announcementId)
          );
          return {
            ...recipient,
            ...(include?.company ? { company: findCompany(recipient.companyId) } : {}),
            statuses: statusesForRecipient,
          };
        });
    }
  );

  const announcementRecipientStatusUpsert = vi.fn(
    async ({
      where,
      update,
      create,
    }: {
      where: { announcementId_recipientId: { announcementId: string; recipientId: string } };
      update: Partial<FakeStatus>;
      create: { announcementId: string; recipientId: string } & Partial<FakeStatus>;
    }) => {
      const key = where.announcementId_recipientId;
      const existing = state.statuses.find(
        (status) =>
          status.announcementId === key.announcementId && status.recipientId === key.recipientId
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const record: FakeStatus = {
        announcementId: create.announcementId,
        recipientId: create.recipientId,
        confirmedAt: create.confirmedAt ?? null,
        completedAt: create.completedAt ?? null,
        reminderSentAt: create.reminderSentAt ?? null,
      };
      state.statuses.push(record);
      return record;
    }
  );

  const FIXED_ANNOUNCEMENT_ID = "ann-1";

  const announcementFindUnique = vi.fn(async ({ where }: { where: { id: string } }) => {
    if (where.id !== FIXED_ANNOUNCEMENT_ID) return null;
    return {
      id: FIXED_ANNOUNCEMENT_ID,
      title: "システムメンテナンスのお知らせ",
      body: "対応をお願いします。",
      category: "maintenance" as const,
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
    companyCreate,
    announcementRecipientCreate,
    transaction,
    announcementRecipientFindMany,
    announcementRecipientStatusUpsert,
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
    company: {
      create: store.companyCreate,
    },
    announcementRecipient: {
      create: store.announcementRecipientCreate,
      findMany: store.announcementRecipientFindMany,
    },
    announcementRecipientStatus: {
      upsert: store.announcementRecipientStatusUpsert,
    },
    announcement: {
      findUnique: store.announcementFindUnique,
    },
    $transaction: store.transaction,
  },
}));

vi.mock("@/lib/server/announcement-notifications", () => ({
  notifyAnnouncementPublished: vi.fn().mockResolvedValue(undefined),
  notifyAnnouncementReminder: vi.fn().mockResolvedValue(undefined),
}));

import { createCompany } from "@/lib/server/company-service";
import {
  getAnnouncementRecipientStatuses,
  recordCompanyCompletion,
  recordCompanyConfirmation,
} from "@/lib/server/announcement-service";

beforeEach(() => {
  store.state.companies.length = 0;
  store.state.recipients.length = 0;
  store.state.statuses.length = 0;
  store.state.seq = 0;
  vi.clearAllMocks();
});

describe("Company作成直後のAnnouncementRecipient同期（結合テスト）", () => {
  it("新規Companyがgetアナウンス受信者ステータス一覧（getAnnouncementRecipientStatuses）に含まれる", async () => {
    const company = await createCompany({
      name: "新規オンボーディング商事",
      country: "PH",
      companyCode: "ph-new-onboarding",
    });

    const statuses = await getAnnouncementRecipientStatuses(store.FIXED_ANNOUNCEMENT_ID);

    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({
      companyCode: "ph-new-onboarding",
      companyName: "新規オンボーディング商事",
      contactName: "新規オンボーディング商事",
      confirmedAt: null,
      completedAt: null,
    });
    expect(company.companyCode).toBe("ph-new-onboarding");
  });

  it("新規Companyがrecordコンパニーコンファーメーション（recordCompanyConfirmation）の記録対象に含まれる", async () => {
    await createCompany({
      name: "新規オンボーディング商事",
      country: "PH",
      companyCode: "ph-new-onboarding",
    });

    await recordCompanyConfirmation(store.FIXED_ANNOUNCEMENT_ID, "ph-new-onboarding");

    const statuses = await getAnnouncementRecipientStatuses(store.FIXED_ANNOUNCEMENT_ID);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].confirmedAt).not.toBeNull();
  });

  it("新規Companyがrecordコンパニーコンプリーション（recordCompanyCompletion）の記録対象に含まれる", async () => {
    await createCompany({
      name: "新規オンボーディング商事",
      country: "PH",
      companyCode: "ph-new-onboarding",
    });

    await recordCompanyCompletion(store.FIXED_ANNOUNCEMENT_ID, "ph-new-onboarding");

    const statuses = await getAnnouncementRecipientStatuses(store.FIXED_ANNOUNCEMENT_ID);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].completedAt).not.toBeNull();
  });

  it("修正前の挙動（AnnouncementRecipient未作成）ならトラッキング対象0件になることを確認する（バグの再現）", async () => {
    // company.createのみ直接呼び出し、announcementRecipient.createを呼ばないことで
    // 修正前の`createCompany`実装（AnnouncementRecipientを作らない）を再現する。
    await store.companyCreate({
      data: { name: "旧実装で登録された会社", country: "PH", companyCode: "ph-legacy-bug" },
    });

    const statuses = await getAnnouncementRecipientStatuses(store.FIXED_ANNOUNCEMENT_ID);

    // `AnnouncementRecipientStatusView.companyCode`はフェーズ1モック時代の固定8社の
    // 閉じたUnion型（`DocumentCompanyCode`）だが、本specの管理画面から作成する会社は
    // 任意の`companyCode`を取り得るため、ここでは型を介さず文字列として比較する
    // （この型定義自体は`AnnouncementRecipient`所有specの対象であり本バグ修正の対象外）。
    expect(statuses.some((status) => (status.companyCode as string) === "ph-legacy-bug")).toBe(
      false
    );
  });
});
