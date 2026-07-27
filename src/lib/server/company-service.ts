import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import type { Company, CompanyWithStats, CreateCompanyInput } from "@/types/company";

/** ヘルプデスク代理登録画面の対象会社選択欄に表示する会社情報。 */
export interface CompanyOption {
  id: string;
  name: string;
  country: string;
}

export class CompanyNotFoundError extends Error {
  constructor(companyId: string) {
    super(`Company not found: ${companyId}`);
    this.name = "CompanyNotFoundError";
  }
}

/**
 * 販社コードが既存の会社と重複しているために保存できないことを表すエラー。
 * `"use server"`ファイル（`lib/actions/companies.ts`）はasync関数以外をエクスポート
 * できないため、このエラークラスはサービス層側に定義する。
 */
export class CompanyCodeTakenError extends Error {
  constructor(companyCode: string) {
    super(`Company code already taken: ${companyCode}`);
    this.name = "CompanyCodeTakenError";
  }
}

function mapCompany(record: {
  id: string;
  name: string;
  country: string;
  companyCode: string;
  createdAt: Date;
}): Company {
  return {
    id: record.id,
    name: record.name,
    country: record.country,
    companyCode: record.companyCode,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * 全社の会社名・国を`name`昇順で返す。ヘルプデスク側の代理問い合わせ登録画面
 * （`/helpdesk/inquiry/new`）専用の読み取り関数であり、問い合わせ内容等の
 * 機密情報は含まない（`helpdesk-inquiry-management`spec 要件15）。
 *
 * 現状は呼び出し元ページが`/helpdesk/*`配下のミドルウェアで保護されているが、
 * `lib/api/faqs.ts`・`lib/api/links.ts`等の既存パターンに合わせて、本関数自体にも
 * ヘルプデスクセッションの検証を持たせる（多層防御）。将来ミドルウェア対象外の
 * 経路（Route Handler等）から誤って呼び出された場合に全社情報が無検証で
 * 漏出することを防ぐ。
 */
export async function listCompaniesForHelpdesk(): Promise<CompanyOption[]> {
  await requireHelpdeskStaffSession();

  const records = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    country: record.country,
  }));
}

/**
 * 販社管理画面向けに、`name`昇順で全社を取得する。各社の`applicantUserCount`
 * （所属する`ApplicantUser`総件数）をPrismaの`_count`で集計して付与し、
 * `activeApplicantUserCount`（有効な`ApplicantUser`件数。一括無効化の対象見込み件数、
 * 要件20.4）を`applicantUsers`をフィルタ付きで取得した件数から算出して付与する。
 * （Prismaの`_count`はフィルタ付き集計に制約があるため、design.mdの方針どおり
 * `applicantUsers`を`select`して集計する方式を採る。）
 */
export async function listCompaniesForManagement(): Promise<CompanyWithStats[]> {
  await requireHelpdeskStaffSession();

  const records = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { applicantUsers: true } },
      applicantUsers: { where: { isActive: true }, select: { id: true } },
    },
  });

  return records.map((record) => ({
    ...mapCompany(record),
    applicantUserCount: record._count.applicantUsers,
    activeApplicantUserCount: record.applicantUsers.length,
  }));
}

/** 指定されたIDの会社を1件取得する。存在しない場合はnullを返す。 */
export async function getCompanyById(id: string): Promise<Company | null> {
  await requireHelpdeskStaffSession();

  const record = await prisma.company.findUnique({ where: { id } });

  return record ? mapCompany(record) : null;
}

/**
 * 会社を新規作成する。呼び出し元が事前に`isCompanyCodeTaken`で重複確認済みであることを前提とする。
 *
 * `Company`作成と同時に、お知らせの確認済み・実施済み状態やリマインド送信対象を追跡する
 * 会社単位のマスタ`AnnouncementRecipient`を代表1件（`contactName` = 会社名）作成する。
 * 両者を`prisma.$transaction`で1トランザクションにまとめ、いずれかが失敗した場合は
 * 両方をロールバックすることで、`AnnouncementRecipient`を欠く`Company`が残らないようにする
 * （`helpdesk-account-management`spec 要件12。`AnnouncementRecipient`のモデル・型・
 * トラッキングロジック自体はこのspec対象外のため変更せず、レコード作成のみを追加する）。
 */
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  await requireHelpdeskStaffSession();

  const record = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.name,
        country: input.country,
        companyCode: input.companyCode,
      },
    });

    await tx.announcementRecipient.create({
      data: {
        companyId: company.id,
        contactName: input.name,
      },
    });

    return company;
  });

  return mapCompany(record);
}

/** 既存の会社情報を更新する。存在しない場合は`CompanyNotFoundError`を送出する。 */
export async function updateCompany(
  id: string,
  input: CreateCompanyInput
): Promise<Company> {
  await requireHelpdeskStaffSession();

  try {
    const record = await prisma.company.update({
      where: { id },
      data: {
        name: input.name,
        country: input.country,
        companyCode: input.companyCode,
      },
    });

    return mapCompany(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new CompanyNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 指定された販社コードが既存の会社と重複するかを確認する。
 * `excludeId`が指定された場合、そのIDの会社は重複判定から除外する（編集時に自分自身を除外するため）。
 */
export async function isCompanyCodeTaken(
  companyCode: string,
  excludeId?: string
): Promise<boolean> {
  await requireHelpdeskStaffSession();

  const record = await prisma.company.findFirst({
    where: {
      companyCode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  return record !== null;
}

/**
 * 指定された販社コード群のうち、既に`Company`として存在するものを返す
 * （CSV一括登録の一意性検証・要件19.7向けの読み取り専用関数。多層防御）。
 * `codes`が空配列の場合はPrismaを呼び出さず空配列を返す。
 */
export async function findExistingCompanyCodes(codes: string[]): Promise<string[]> {
  await requireHelpdeskStaffSession();

  if (codes.length === 0) {
    return [];
  }

  const records = await prisma.company.findMany({
    where: { companyCode: { in: codes } },
    select: { companyCode: true },
  });

  return records.map((record) => record.companyCode);
}

/**
 * 複数の会社を1トランザクションで一括作成する（CSV一括登録・要件19.9, 19.10）。
 * 各`Company`作成時に、既存の単件登録（`createCompany`／要件12）と同一の規則で
 * 対応する`AnnouncementRecipient`（`contactName` = 会社名）を同時に作成する。
 * いずれか1件でも失敗した場合は全件がロールバックされる（all-or-nothing）。
 * 呼び出し元（`importCompaniesAction`）が事前に全行の検証を完了させていることを前提とする。
 */
export async function createCompaniesBulk(
  inputs: CreateCompanyInput[]
): Promise<Company[]> {
  await requireHelpdeskStaffSession();

  if (inputs.length === 0) {
    return [];
  }

  const records = await prisma.$transaction(async (tx) => {
    const created: Awaited<ReturnType<typeof tx.company.create>>[] = [];

    for (const input of inputs) {
      const company = await tx.company.create({
        data: {
          name: input.name,
          country: input.country,
          companyCode: input.companyCode,
        },
      });

      await tx.announcementRecipient.create({
        data: {
          companyId: company.id,
          contactName: input.name,
        },
      });

      created.push(company);
    }

    return created;
  });

  return records.map(mapCompany);
}

/**
 * 選択された会社群に所属する有効な（`isActive = true`の）`ApplicantUser`を
 * 一括で無効化する（複数販社の一括無効化・要件20.2, 20.5, 20.6）。
 * `Company`自体には有効/無効フラグを持たせず、所属アカウントの`isActive`のみを
 * 更新する。`where`に`isActive: true`を含めることで、既に無効なレコードを
 * 対象外にし冪等性を担保する。`companyIds`が空配列の場合はPrismaを呼び出さず
 * `{ deactivatedCount: 0 }`を返す（防御）。
 */
export async function deactivateApplicantUsersByCompanies(
  companyIds: string[]
): Promise<{ deactivatedCount: number }> {
  await requireHelpdeskStaffSession();

  if (companyIds.length === 0) {
    return { deactivatedCount: 0 };
  }

  const result = await prisma.applicantUser.updateMany({
    where: {
      companyId: { in: companyIds },
      isActive: true,
    },
    data: { isActive: false },
  });

  return { deactivatedCount: result.count };
}
