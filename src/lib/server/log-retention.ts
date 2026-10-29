import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  assertRetentionRule,
  RETENTION_RULES,
  retentionCutoff,
  type RetentionTarget,
} from "@/lib/log-retention-policy";
import { logger } from "@/lib/server/logger";

export interface TableRetentionResult {
  /** 削除した件数（dryRunでは削除対象件数）。 */
  deleted: number;
  /** 締切で打ち切られ、削除対象が残っている可能性があるか。 */
  hasMore: boolean;
  /** 失敗時のエラー種別のみ（メッセージにPIIが混じり得るため本文は入れない）。 */
  error?: string;
}

export interface LogRetentionResult {
  tables: Record<RetentionTarget, TableRetentionResult>;
  dryRun: boolean;
  durationMs: number;
}

export interface LogRetentionOptions {
  dryRun?: boolean;
  /** 全テーブル合計の処理時間の上限（ms）。超えたら打ち切り、残りは次回実行に回す。 */
  deadlineMs?: number;
  /** 1回のDELETEで消す最大件数。 */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_DEADLINE_MS = 120_000;

interface TableSpec {
  target: RetentionTarget;
  /** テーブル名・列名はコード内の固定値のみ（外部入力を連結しない）。 */
  table: string;
  pk: string;
  condition: (now: Date, cutoff: Date) => Prisma.Sql;
}

/**
 * 日時はISO文字列をtimestamptz経由でUTCのtimestampにして渡す（列はtimestamp(3)でUTCを保持する）。
 * Prismaは生クエリのDate引数をtimestamptzとして渡すため、そのままではセッションのTimeZoneで
 * 境界がずれる（login-throttle.tsと同じ理由）。
 */
function utc(date: Date): Prisma.Sql {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

const TABLES: TableSpec[] = [
  {
    target: "authEvent",
    table: "AuthEvent",
    pk: "id",
    condition: (_now, cutoff) => Prisma.sql`"createdAt" < ${utc(cutoff)}`,
  },
  {
    target: "loginThrottle",
    table: "LoginThrottle",
    pk: "key",
    // ロック中（lockedUntilが未来）の行は期間に関わらず残す。
    condition: (now, cutoff) =>
      Prisma.sql`"updatedAt" < ${utc(cutoff)} AND ("lockedUntil" IS NULL OR "lockedUntil" < ${utc(now)})`,
  },
  {
    target: "announcementNotificationLog",
    table: "AnnouncementNotificationLog",
    pk: "id",
    condition: (_now, cutoff) => Prisma.sql`"sentAt" < ${utc(cutoff)}`,
  },
];

/** ログ用にエラー種別のみ返す（メッセージにPIIが混じり得るため本文は出さない）。 */
function errorKind(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    const name = (error as { name?: unknown }).name;
    return [typeof name === "string" ? name : "Error", typeof code === "string" ? code : null]
      .filter(Boolean)
      .join(":");
  }
  return "UnknownError";
}

async function purgeTable(
  spec: TableSpec,
  now: Date,
  opts: { dryRun: boolean; batchSize: number; deadlineAt: number }
): Promise<TableRetentionResult> {
  const rule = RETENTION_RULES[spec.target];
  const cutoff = retentionCutoff(now, rule.retentionDays);
  const cond = spec.condition(now, cutoff);
  const table = Prisma.raw(`"${spec.table}"`);
  const pk = Prisma.raw(`"${spec.pk}"`);

  if (opts.dryRun) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*) AS count FROM ${table} WHERE ${cond}`
    );
    return { deleted: Number(rows[0]?.count ?? 0), hasMore: false };
  }

  let deleted = 0;
  for (;;) {
    if (Date.now() >= opts.deadlineAt) {
      return { deleted, hasMore: true };
    }
    // 外側にも条件を重ねる: READ COMMITTEDでは、サブクエリで選んだ後に行が更新されうる
    // （例: 直前にロックされたLoginThrottle）。外側のWHEREで最新の行に対して再評価させ誤削除を防ぐ。
    const count = await prisma.$executeRaw(
      Prisma.sql`DELETE FROM ${table} WHERE ${pk} IN (SELECT ${pk} FROM ${table} WHERE ${cond} LIMIT ${opts.batchSize}) AND ${cond}`
    );
    deleted += count;
    if (count < opts.batchSize) {
      return { deleted, hasMore: false };
    }
  }
}

/**
 * 運用ログ（AuthEvent / LoginThrottle / AnnouncementNotificationLog）の保持期間超過分を削除する。
 * 冪等で、並行実行しても結果は同じ（削除対象が重なれば片方の削除件数が減るだけ）。
 * テーブルごとに失敗を隔離し、1つ失敗しても他は続行する。ログには件数・エラー種別のみ出す。
 */
export async function runLogRetention(
  now: Date = new Date(),
  options: LogRetentionOptions = {}
): Promise<LogRetentionResult> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("batchSize must be a positive integer");
  }
  // 設定ミスで直近データを消さないよう、削除の前に全テーブルの下限を検証する。
  for (const spec of TABLES) {
    assertRetentionRule(spec.target, RETENTION_RULES[spec.target]);
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + deadlineMs;
  const tables = {} as Record<RetentionTarget, TableRetentionResult>;
  for (const spec of TABLES) {
    try {
      tables[spec.target] = await purgeTable(spec, now, { dryRun, batchSize, deadlineAt });
    } catch (error) {
      const kind = errorKind(error);
      logger.error("[log-retention] table purge failed", { table: spec.table, errorKind: kind });
      tables[spec.target] = { deleted: 0, hasMore: false, error: kind };
    }
  }
  return { tables, dryRun, durationMs: Date.now() - startedAt };
}
