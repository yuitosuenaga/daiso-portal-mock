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
 * （所属する`ApplicantUser`件数）をPrismaの`_count`で集計して付与する。
 */
export async function listCompaniesForManagement(): Promise<CompanyWithStats[]> {
  await requireHelpdeskStaffSession();

  const records = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { applicantUsers: true } } },
  });

  return records.map((record) => ({
    ...mapCompany(record),
    applicantUserCount: record._count.applicantUsers,
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
