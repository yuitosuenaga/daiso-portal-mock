// 運用ログの保持期間の定義（副作用なしの純関数・定数）。DB・envには依存しない。

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type RetentionTarget = "authEvent" | "loginThrottle" | "announcementNotificationLog";

export interface RetentionRule {
  /** 保持日数。この日数を超えた行が削除対象。 */
  retentionDays: number;
  /** 保持日数の下限。これ未満は設定ミスとして実行を拒否する。 */
  minRetentionDays: number;
}

/**
 * 保持期間。変更はPRで行う（根拠: docs/infra/runbook.md「運用ログの保持期間と定期削除」）。
 * - authEvent: 監査ログ。365日
 * - loginThrottle: 試行制限の台帳。1日（ロック中の行は期間に関わらず残す）
 * - announcementNotificationLog: 通知送信履歴。180日。督促の重複送信防止は当日分のみ参照するため下限2日
 */
export const RETENTION_RULES: Record<RetentionTarget, RetentionRule> = {
  authEvent: { retentionDays: 365, minRetentionDays: 30 },
  loginThrottle: { retentionDays: 1, minRetentionDays: 1 },
  announcementNotificationLog: { retentionDays: 180, minRetentionDays: 2 },
};

/** 保持日数が下限以上であることを検証する。未満なら例外。 */
export function assertRetentionRule(target: RetentionTarget, rule: RetentionRule): void {
  if (!Number.isFinite(rule.retentionDays) || rule.retentionDays < rule.minRetentionDays) {
    throw new Error(
      `Retention for ${target} is below the minimum (${rule.retentionDays} < ${rule.minRetentionDays} days)`
    );
  }
}

/** この時刻より前の行が削除対象（ちょうどcutoffの行は残す）。 */
export function retentionCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * MS_PER_DAY);
}
