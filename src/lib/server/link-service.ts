import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateLinkInput, Link } from "@/types/link";

export class LinkNotFoundError extends Error {
  constructor(linkId: string) {
    super(`Link not found: ${linkId}`);
    this.name = "LinkNotFoundError";
  }
}

/** ヘルプデスク管理一覧向けに、登録日（`createdAt`）を含むリンク情報。 */
export interface LinkWithTimestamp extends Link {
  createdAt: string;
}

function mapLink(record: {
  id: string;
  title: string;
  url: string;
  category: Link["category"];
  description: string | null;
}): Link {
  return {
    id: record.id,
    title: record.title,
    url: record.url,
    category: record.category,
    description: record.description ?? undefined,
  };
}

/**
 * リンク全件を取得する。並び順の保証はなく、絞り込みも行わない
 * （申請者側・ヘルプデスク側で同一の結果を返す既存モックの振る舞いを維持する）。
 */
export async function listLinks(): Promise<Link[]> {
  const records = await prisma.link.findMany();

  return records.map(mapLink);
}

/** ヘルプデスク管理一覧向けに、登録日（`createdAt`）降順で全件を返す。 */
export async function listLinksForHelpdesk(): Promise<LinkWithTimestamp[]> {
  const records = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) => ({
    ...mapLink(record),
    createdAt: record.createdAt.toISOString(),
  }));
}

/** 指定されたIDのリンクを1件取得する。存在しない場合はnullを返す。 */
export async function findLinkById(id: string): Promise<Link | null> {
  const record = await prisma.link.findUnique({ where: { id } });

  return record ? mapLink(record) : null;
}

/** リンクを新規作成する。登録日時（`createdAt`）はDBの既定値に委ねる。 */
export async function createLinkRecord(input: CreateLinkInput): Promise<Link> {
  const record = await prisma.link.create({
    data: {
      title: input.title,
      url: input.url,
      category: input.category,
      description: input.description,
    },
  });

  return mapLink(record);
}

/** 既存リンクの内容を更新する。存在しない場合は`LinkNotFoundError`を送出する。 */
export async function updateLinkRecord(
  id: string,
  input: CreateLinkInput
): Promise<Link> {
  try {
    const record = await prisma.link.update({
      where: { id },
      data: {
        title: input.title,
        url: input.url,
        category: input.category,
        description: input.description,
      },
    });

    return mapLink(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new LinkNotFoundError(id);
    }
    throw error;
  }
}

/** リンクを削除する。存在しない場合は`LinkNotFoundError`を送出する。 */
export async function deleteLinkRecord(id: string): Promise<void> {
  try {
    await prisma.link.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new LinkNotFoundError(id);
    }
    throw error;
  }
}
