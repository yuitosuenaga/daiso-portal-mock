import "server-only";

import { Prisma } from "@prisma/client";

import { normalizeEmail } from "@/lib/auth/google-login-policy";
import { prisma } from "@/lib/db/prisma";

/**
 * メールアドレスの大文字小文字を無視した一致（`lower(email) = 小文字化した入力`）で行のidを引く。
 *
 * Prismaの`mode: "insensitive"`+`equals`はPostgreSQLのILIKEになり、入力中の`_`・`%`が
 * ワイルドカードとして効いてしまう（例: 入力`a_b@x.com`が保存値`axb@x.com`に一致する）。
 * メールは完全一致で扱いたいので、タグ付きテンプレートの`lower(email) = $1`で照会する。
 * 結果は作成日時の昇順（同時刻はid）で返す。件数は大文字小文字違いの重複分のみで小さい。
 */
export async function findApplicantUserIdsByEmail(
  email: string,
  options: { excludeId?: string } = {}
): Promise<string[]> {
  const normalized = normalizeEmail(email);
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM "ApplicantUser" WHERE lower(email) = ${normalized}${
      options.excludeId ? Prisma.sql` AND id <> ${options.excludeId}` : Prisma.empty
    } ORDER BY "createdAt" ASC, id ASC`
  );
  return rows.map((row) => row.id);
}

/** `findApplicantUserIdsByEmail`のHelpdeskStaff版。 */
export async function findHelpdeskStaffIdsByEmail(email: string): Promise<string[]> {
  const normalized = normalizeEmail(email);
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM "HelpdeskStaff" WHERE lower(email) = ${normalized} ORDER BY "createdAt" ASC, id ASC`
  );
  return rows.map((row) => row.id);
}
