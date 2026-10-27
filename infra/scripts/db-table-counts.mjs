// public スキーマの全テーブルの行数を「テーブル名 件数」で出力する（SELECT のみ）。
// DATABASE_URL は環境変数から読む。db-table-counts.sh から呼ぶ。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
  for (const { table_name } of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table_name}"`);
    console.log(`${table_name} ${count}`);
  }
} finally {
  await prisma.$disconnect();
}
