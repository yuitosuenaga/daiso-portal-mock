import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/translation-service", () => ({
  getTranslator: vi.fn(),
}));
vi.mock("@/lib/server/announcement-service", () => ({
  findAnnouncementById: vi.fn(),
}));

import { getTranslator } from "@/lib/server/translation-service";
import { findAnnouncementById } from "@/lib/server/announcement-service";
import { ensureEnTranslation } from "@/lib/server/announcement-translation";
import { TranslationError } from "@/lib/translation/claude-translator";
import type { Announcement, CreateAnnouncementInput } from "@/types/announcement";

function baseInput(overrides: Partial<CreateAnnouncementInput> = {}): CreateAnnouncementInput {
  return {
    title: "お知らせタイトル",
    body: "お知らせ本文",
    category: "other",
    status: "published",
    targeting: { scope: "all" },
    actionRequired: false,
    sendEmailNotification: false,
    attachments: [],
    linkedDocumentIds: [],
    translations: [],
    ...overrides,
  };
}

function baseAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "announcement-1",
    title: "お知らせタイトル",
    status: "published",
    publishedAt: "2026-07-01T00:00:00.000Z",
    category: "other",
    body: "お知らせ本文",
    targeting: { scope: "all" },
    actionRequired: false,
    sendEmailNotification: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    attachments: [],
    linkedDocumentIds: [],
    translations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureEnTranslation", () => {
  it("en行がない場合、Claude APIで自動翻訳しmachineとして補う", async () => {
    vi.mocked(getTranslator).mockReturnValue({
      translate: vi.fn().mockResolvedValue({ title: "Title", body: "Body", model: "claude-haiku-4-5" }),
    });

    const result = await ensureEnTranslation(baseInput());

    expect(result.translations).toEqual([
      { locale: "en", title: "Title", body: "Body", source: "machine", sourceHash: expect.any(String) },
    ]);
  });

  it("titleEn/bodyEnが入力されている（新規作成）場合、manualとして扱い翻訳APIを呼ばない", async () => {
    const translate = vi.fn();
    vi.mocked(getTranslator).mockReturnValue({ translate });

    const result = await ensureEnTranslation(
      baseInput({ translations: [{ locale: "en", title: "Manual Title", body: "Manual Body" }] })
    );

    expect(translate).not.toHaveBeenCalled();
    expect(result.translations).toEqual([
      { locale: "en", title: "Manual Title", body: "Manual Body", source: "manual" },
    ]);
  });

  it("翻訳APIが未設定（getTranslatorがnull）でen行もない場合、TranslationErrorを送出する", async () => {
    vi.mocked(getTranslator).mockReturnValue(null);

    await expect(ensureEnTranslation(baseInput())).rejects.toThrow(TranslationError);
  });

  it("更新時、既存en行がmachineかつ送信内容が既存と同一・ja本文が変わっている場合は再翻訳する", async () => {
    vi.mocked(findAnnouncementById).mockResolvedValue(
      baseAnnouncement({
        title: "旧タイトル",
        body: "旧本文",
        translations: [
          {
            locale: "en",
            title: "Old Title",
            body: "Old Body",
            source: "machine",
            sourceHash: "stale-hash",
          },
        ],
      })
    );
    const translate = vi.fn().mockResolvedValue({
      title: "New Title",
      body: "New Body",
      model: "claude-haiku-4-5",
    });
    vi.mocked(getTranslator).mockReturnValue({ translate });

    const result = await ensureEnTranslation(
      baseInput({
        title: "新タイトル",
        body: "新本文",
        translations: [{ locale: "en", title: "Old Title", body: "Old Body" }],
      }),
      "announcement-1"
    );

    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "新タイトル", body: "新本文", targetLocale: "en" })
    );
    expect(result.translations).toEqual([
      { locale: "en", title: "New Title", body: "New Body", source: "machine", sourceHash: expect.any(String) },
    ]);
  });

  it("更新時、既存en行がmachineでも送信内容がja本文とともに一致（未変更）なら再翻訳しない", async () => {
    vi.mocked(findAnnouncementById).mockResolvedValue(
      baseAnnouncement({
        title: "タイトル",
        body: "本文",
        translations: [
          {
            locale: "en",
            title: "Same Title",
            body: "Same Body",
            source: "machine",
            sourceHash: "will-be-computed-to-match",
          },
        ],
      })
    );
    vi.mocked(getTranslator).mockReturnValue({
      translate: vi.fn().mockResolvedValue({ title: "x", body: "x", model: "claude-haiku-4-5" }),
    });

    // ja本文が変わっていない（sourceHashが現在のtitle/bodyのハッシュと一致する）ケースを
    // 検証するため、まず1回自動翻訳させてsourceHashを取得し、それを既存値として再利用する。
    const first = await ensureEnTranslation(baseInput({ title: "タイトル", body: "本文" }));
    const computedHash = first.translations[0]!.sourceHash!;

    const translate = vi.fn();
    vi.mocked(getTranslator).mockReturnValue({ translate });

    vi.mocked(findAnnouncementById).mockResolvedValue(
      baseAnnouncement({
        title: "タイトル",
        body: "本文",
        translations: [
          {
            locale: "en",
            title: "Auto Title",
            body: "Auto Body",
            source: "machine",
            sourceHash: computedHash,
          },
        ],
      })
    );

    const result = await ensureEnTranslation(
      baseInput({
        title: "タイトル",
        body: "本文",
        translations: [{ locale: "en", title: "Auto Title", body: "Auto Body" }],
      }),
      "announcement-1"
    );

    expect(translate).not.toHaveBeenCalled();
    expect(result.translations).toEqual([
      { locale: "en", title: "Auto Title", body: "Auto Body", source: "manual" },
    ]);
  });

  it("更新時、既存en行がmanualの場合は送信内容をそのままmanualとして使う（再翻訳しない）", async () => {
    vi.mocked(findAnnouncementById).mockResolvedValue(
      baseAnnouncement({
        title: "旧タイトル",
        body: "旧本文",
        translations: [
          { locale: "en", title: "Manual Title", body: "Manual Body", source: "manual" },
        ],
      })
    );
    const translate = vi.fn();
    vi.mocked(getTranslator).mockReturnValue({ translate });

    const result = await ensureEnTranslation(
      baseInput({
        title: "新タイトル",
        body: "新本文",
        translations: [{ locale: "en", title: "Edited Title", body: "Manual Body" }],
      }),
      "announcement-1"
    );

    expect(translate).not.toHaveBeenCalled();
    expect(result.translations).toEqual([
      { locale: "en", title: "Edited Title", body: "Manual Body", source: "manual" },
    ]);
  });

  it("en以外の追加言語（additionalTranslations）は変更せずそのまま残す", async () => {
    vi.mocked(getTranslator).mockReturnValue({
      translate: vi.fn().mockResolvedValue({ title: "Title", body: "Body", model: "claude-haiku-4-5" }),
    });

    const result = await ensureEnTranslation(
      baseInput({ translations: [{ locale: "th", title: "หัวข้อ", body: "เนื้อหา" }] })
    );

    expect(result.translations).toEqual([
      expect.objectContaining({ locale: "en" }),
      { locale: "th", title: "หัวข้อ", body: "เนื้อหา" },
    ]);
  });
});
