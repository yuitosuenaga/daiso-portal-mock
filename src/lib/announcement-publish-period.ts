import type { Announcement } from "@/types/announcement";

/** 公開開始日（＋任意の時刻 HH:mm、未設定は9:00）を日本時間として解釈した時刻を返す。 */
export function parsePublishStart(isoDate: string, time: string | null | undefined): Date {
  return new Date(`${isoDate}T${time || "09:00"}:00.000+09:00`);
}

/** 公開終了日（＋任意の時刻 HH:mm、未設定は23:59）を日本時間として解釈した時刻を返す（その分の終わりまで公開）。 */
export function parsePublishEnd(isoDate: string, time: string | null | undefined): Date {
  return new Date(`${isoDate}T${time || "23:59"}:59.999+09:00`);
}

/** 公開開始日・終了日を基準に、現在時刻が公開期間内かどうかを判定する。 */
export function isWithinPublishPeriod(
  announcement: Pick<
    Announcement,
    "publishStartDate" | "publishStartTime" | "publishEndDate" | "publishEndTime"
  >,
  referenceDate: Date
): boolean {
  if (announcement.publishStartDate) {
    if (referenceDate < parsePublishStart(announcement.publishStartDate, announcement.publishStartTime)) {
      return false;
    }
  }
  if (announcement.publishEndDate) {
    if (referenceDate > parsePublishEnd(announcement.publishEndDate, announcement.publishEndTime)) {
      return false;
    }
  }
  return true;
}
