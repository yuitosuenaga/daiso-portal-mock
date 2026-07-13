import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Next.jsの開発時ホットリロードでモジュールが再評価されても、
 * PrismaClientのインスタンスを再生成しないよう`globalThis`に保持する。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
