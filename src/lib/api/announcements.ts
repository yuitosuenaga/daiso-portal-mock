import { Announcement, CreateAnnouncementInput } from "@/types/announcement";
import { getGlobalMockStore } from "@/lib/mock-store";
import { MOCK_CURRENT_COMPANY } from "@/lib/constants/current-company";

export interface GetRecentAnnouncementsOptions {
  limit?: number;
}

/**
 * お知らせの可変ストア。Server Actionsからの変更がRSCレンダリングに反映されるよう、
 * `globalThis`上に保持する（`lib/mock-store.ts`参照）。
 */
const MOCK_ANNOUNCEMENTS: Announcement[] = getGlobalMockStore(
  "announcements",
  () => [
    {
      id: "1",
      title: "システムメンテナンスのお知らせ（7月15日 2:00〜4:00）",
      publishedAt: "2026-07-01T09:00:00Z",
      category: "maintenance",
      body: "2026年7月15日 2:00〜4:00の間、システムメンテナンスを実施いたします。メンテナンス中はポータルサイトにアクセスできませんのでご注意ください。ご不便をおかけしますが、何卒ご理解のほどよろしくお願いいたします。",
      targeting: { scope: "all" },
      actionRequired: true,
    },
    {
      id: "2",
      title: "新しいFAQページを追加しました",
      publishedAt: "2026-06-28T09:00:00Z",
      category: "other",
      body: "よくあるお問い合わせをまとめたFAQページを新設しました。お問い合わせの前にぜひご活用ください。今後も内容を随時更新してまいります。",
      targeting: { scope: "all" },
      actionRequired: false,
    },
    {
      id: "3",
      title: "問い合わせフォームの項目を更新しました",
      publishedAt: "2026-06-20T09:00:00Z",
      category: "policy",
      body: "問い合わせ・申請フォームの入力項目を一部更新しました。案件種別・緊急度の選択肢が変更されておりますので、ご利用の際はご確認ください。",
      targeting: { scope: "all" },
      actionRequired: true,
    },
    {
      id: "4",
      title: "夏季休業期間のお知らせ（8月13日〜16日）",
      publishedAt: "2026-06-15T09:00:00Z",
      category: "other",
      body: "誠に恐れ入りますが、8月13日〜16日は夏季休業期間とさせていただきます。休業期間中に受け付けた問い合わせは、休業明けに順次対応いたします。",
      targeting: { scope: "all" },
      actionRequired: false,
    },
    {
      id: "5",
      title: "決済システム障害の発生について",
      publishedAt: "2026-06-10T09:00:00Z",
      category: "incident",
      body: "本日未明、決済システムに障害が発生し、一部の処理が正常に完了しない事象が確認されました。現在は復旧しておりますが、影響を受けた処理については別途ご案内いたします。",
      targeting: { scope: "all" },
      actionRequired: true,
    },
  ]
);

function isVisibleToCurrentCompany(announcement: Announcement): boolean {
  return (
    announcement.targeting.scope === "all" ||
    announcement.targeting.countries.includes(MOCK_CURRENT_COMPANY.country)
  );
}

function sortByPublishedAtDesc(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/**
 * 自社（`MOCK_CURRENT_COMPANY`）に配信対象が及ぶお知らせのうち、最新のものを返す。
 */
export async function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]> {
  const limit = options?.limit ?? 3;
  const visible = sortByPublishedAtDesc(
    MOCK_ANNOUNCEMENTS.filter(isVisibleToCurrentCompany)
  );

  return Promise.resolve(visible.slice(0, limit));
}

/**
 * 自社（`MOCK_CURRENT_COMPANY`）に配信対象が及ぶお知らせ全件を公開日の降順で返す。
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const visible = MOCK_ANNOUNCEMENTS.filter(isVisibleToCurrentCompany);

  return Promise.resolve(sortByPublishedAtDesc(visible));
}

/**
 * 指定したIDのお知らせを1件返す。自社に配信対象が及ばない、または該当データが
 * 存在しない場合はnullを解決する。
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const found = MOCK_ANNOUNCEMENTS.find(
    (item) => item.id === id && isVisibleToCurrentCompany(item)
  );

  return Promise.resolve(found ?? null);
}

/**
 * 絞り込みを行わず、全社向けのお知らせ全件を公開日の降順で返すモックAPI関数。
 * ヘルプデスク側のお知らせ管理画面が利用する。
 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  return Promise.resolve(sortByPublishedAtDesc(MOCK_ANNOUNCEMENTS));
}

/**
 * 配信対象による絞り込みを行わず、指定したIDのお知らせを1件返すモックAPI関数。
 * ヘルプデスク側の編集画面が利用する。該当データが存在しない場合はnullを解決する。
 */
export async function getAnnouncementByIdForHelpdesk(
  id: string
): Promise<Announcement | null> {
  const found = MOCK_ANNOUNCEMENTS.find((item) => item.id === id);

  return Promise.resolve(found ?? null);
}

/**
 * お知らせを新規作成するモックAPI関数。公開日時は保存操作を行った時刻とする。
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const announcement: Announcement = {
    id: crypto.randomUUID(),
    publishedAt: new Date().toISOString(),
    ...input,
  };

  MOCK_ANNOUNCEMENTS.push(announcement);

  return Promise.resolve(announcement);
}

/**
 * 既存お知らせの内容を更新するモックAPI関数。
 */
export async function updateAnnouncement(
  id: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const announcement = MOCK_ANNOUNCEMENTS.find((item) => item.id === id);
  if (!announcement) {
    throw new Error(`Announcement not found: ${id}`);
  }

  announcement.title = input.title;
  announcement.body = input.body;
  announcement.category = input.category;
  announcement.targeting = input.targeting;

  return Promise.resolve(announcement);
}

/**
 * お知らせを削除するモックAPI関数。
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const index = MOCK_ANNOUNCEMENTS.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Announcement not found: ${id}`);
  }

  MOCK_ANNOUNCEMENTS.splice(index, 1);

  return Promise.resolve();
}
