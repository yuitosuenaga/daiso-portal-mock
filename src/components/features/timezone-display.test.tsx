import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import { FaqAccordion } from "@/components/features/faq/FaqAccordion";
import { AnnouncementManagementListClient } from "@/components/features/helpdesk-announcements/AnnouncementManagementListClient";
import { HistoryTimeline } from "@/components/features/helpdesk-inquiries/HistoryTimeline";
import type { Announcement } from "@/types/announcement";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => "ja",
}));

vi.mock("@/lib/actions/announcements", () => ({
  deleteAnnouncementAction: vi.fn(),
}));

vi.mock("@/lib/actions/announcement-tracking", () => ({}));

const ANNOUNCEMENT: Announcement = {
  id: "1",
  title: "テストお知らせ",
  status: "published",
  // JST 2026-10-30 00:30（UTCでは前日）
  publishedAt: "2026-10-29T15:30:00Z",
  category: "maintenance",
  body: "本文",
  targeting: { scope: "all" },
  actionRequired: true,
  sendEmailNotification: false,
  publishStartDate: null,
  publishEndDate: null,
  dueDate: "2026-10-30",
  createdAt: "2026-10-29T15:30:00Z",
  updatedAt: "2026-10-29T15:30:00Z",
  attachments: [],
  linkedDocumentIds: [],
  translations: [],
};

// 米州・太平洋の両極のTZでも表示が変わらないこと
describe.each(["America/Sao_Paulo", "Pacific/Kiritimati"])("日時表示はブラウザTZに依存しない（TZ=%s）", (tz) => {
  let originalTz: string | undefined;

  beforeEach(() => {
    originalTz = process.env.TZ;
    process.env.TZ = tz;
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("AnnouncementListItem: dueDateは暦日のまま、publishedAtはJSTの日付", () => {
    render(
      <AnnouncementListItem
        announcement={ANNOUNCEMENT}
        categoryLabel="メンテナンス"
        actionRequiredBadgeLabel="対応が必要"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );
    expect(screen.getByText(/対応期限/).textContent).toContain("2026年10月30日");
    expect(document.querySelector("time")?.textContent).toBe("2026年10月30日");
  });

  it("FaqAccordion: 更新日はJSTの日付", () => {
    render(
      <FaqAccordion
        faqs={[
          {
            id: "1",
            category: "inquiry_method",
            question: "質問",
            answer: "回答",
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-01-01T00:00:00.000Z",
            translations: [],
          },
        ]}
        locale="ja"
        updatedLabel="更新日"
        newBadgeLabel="新着"
      />
    );
    expect(screen.getByText(/2020年1月1日/)).toBeTruthy();
  });

  it("HistoryTimeline: 時刻はJST", () => {
    render(
      <HistoryTimeline
        entries={[
          {
            id: "h1",
            inquiryId: "i1",
            type: "claimed",
            actorName: "田中",
            occurredAt: "2026-10-30T14:30:00.000Z",
          },
        ]}
        emptyMessage="なし"
        typeLabels={{
          claimed: "対応中",
          released: "解除",
          status_changed: "変更",
          reply_sent: "返信",
          requester_message: "メッセージ",
        }}
        locale="ja"
      />
    );
    expect(screen.getByText(/23:30/)).toBeTruthy();
    expect(screen.getByText(/2026年10月30日/)).toBeTruthy();
  });

  it("AnnouncementManagementListClient: 公開期間・対応期限は暦日のまま、公開日はJST", () => {
    render(
      <AnnouncementManagementListClient
        announcements={[
          {
            ...ANNOUNCEMENT,
            publishStartDate: "2026-10-30",
            publishStartTime: "09:00",
            publishEndDate: "2026-11-05",
            publishEndTime: "18:00",
          },
        ]}
        categoryLabels={{ maintenance: "メンテナンス", policy: "p", incident: "i", other: "o" }}
        countryLabels={{}}
        categoryOptions={[]}
        locale="ja"
        targetingAllLabel="全体"
        targetingCountriesLabel="国"
        targetingUsersLabel="{users}"
        actionRequiredBadgeLabel="要対応"
        statusBadgeDraftLabel="下書き"
        publishPeriodAlwaysLabel="常時"
        publishPeriodLabel="公開期間"
        publishPeriodToSeparator="〜"
        dueDateLabel="対応期限"
        editLinkLabel="編集"
        recipientStatusesByAnnouncementId={{}}
        userReadStatusesByAnnouncementId={{}}
      />
    );
    expect(screen.getByText(/公開期間: 2026年10月30日 09:00 〜 2026年11月5日 18:00/)).toBeTruthy();
    expect(screen.getByText(/対応期限: 2026年10月30日/)).toBeTruthy();
    expect(document.querySelector("time")?.textContent).toBe("2026年10月30日");
  });
});
