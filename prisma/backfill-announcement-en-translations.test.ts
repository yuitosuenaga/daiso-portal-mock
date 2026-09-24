import { describe, expect, it, vi } from "vitest";

import { backfillAnnouncementEnTranslations } from "./backfill-announcement-en-translations";
import type { Translator } from "../src/lib/translation/claude-translator";

function fakePrisma(announcements: { id: string; title: string; body: string }[]) {
  const findMany = vi.fn().mockResolvedValue(announcements);
  const upsert = vi.fn().mockResolvedValue(undefined);
  return {
    prisma: {
      announcement: { findMany },
      announcementTranslation: { upsert },
    },
    findMany,
    upsert,
  };
}

function fakeTranslator(
  impl: (input: { title: string; body: string }) => Promise<{ title: string; body: string; model: string }>
): Translator {
  return { translate: vi.fn(impl) };
}

describe("backfillAnnouncementEnTranslations", () => {
  it("en行が無いお知らせのみを対象にする", async () => {
    const { prisma, findMany } = fakePrisma([]);
    await backfillAnnouncementEnTranslations(
      prisma as never,
      fakeTranslator(async () => ({ title: "x", body: "x", model: "claude-haiku-4-5" }))
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { translations: { none: { locale: "en" } } } })
    );
  });

  it("翻訳結果をsource: machineでen行としてupsertする", async () => {
    const { prisma, upsert } = fakePrisma([
      { id: "announcement-1", title: "お知らせ", body: "本文です" },
    ]);
    const translator = fakeTranslator(async () => ({
      title: "Announcement",
      body: "This is the body",
      model: "claude-haiku-4-5",
    }));

    const result = await backfillAnnouncementEnTranslations(prisma as never, translator);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_locale: { announcementId: "announcement-1", locale: "en" } },
        create: expect.objectContaining({
          title: "Announcement",
          body: "This is the body",
          source: "machine",
        }),
      })
    );
    expect(result).toEqual({ translatedCount: 1, skippedCount: 0, failedCount: 0 });
  });

  it("1件の翻訳が失敗しても処理を継続し、failedCountに数える", async () => {
    const { prisma, upsert } = fakePrisma([
      { id: "announcement-1", title: "A", body: "A本文" },
      { id: "announcement-2", title: "B", body: "B本文" },
    ]);
    let call = 0;
    const translator: Translator = {
      translate: vi.fn(async () => {
        call += 1;
        if (call === 1) {
          throw new Error("api error");
        }
        return { title: "B Title", body: "B Body", model: "claude-haiku-4-5" };
      }),
    };

    const result = await backfillAnnouncementEnTranslations(prisma as never, translator);

    expect(result).toEqual({ translatedCount: 1, skippedCount: 0, failedCount: 1 });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
