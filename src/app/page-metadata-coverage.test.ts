import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/lib/constants/locales";

const APP_DIR = path.resolve(__dirname);
// タイトルを個別に持たず、[locale]/layout.tsx の default(ポータル名)を使う画面
const DEFAULT_TITLE_PAGES = ["[locale]/(applicant)/page.tsx"];

function findPages(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return findPages(full);
    return e.name === "page.tsx" ? [full] : [];
  });
}

function lookup(obj: unknown, keyPath: string): unknown {
  return keyPath
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

const pages = findPages(APP_DIR).map((f) => ({
  file: f,
  rel: path.relative(APP_DIR, f).split(path.sep).join("/"),
}));

describe("全ページの generateMetadata", () => {
  it("ページが検出できる", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  it.each(pages.filter((p) => !DEFAULT_TITLE_PAGES.includes(p.rel)))(
    "$rel は createPageMetadata で全言語に存在する見出しキーを使う",
    ({ file }) => {
      const src = fs.readFileSync(file, "utf8");
      const match = src.match(
        /export const generateMetadata = createPageMetadata\(\s*"([^"]+)",\s*"([^"]+)"\s*\)/,
      );
      expect(match).not.toBeNull();
      const [, namespace, key] = match!;
      for (const locale of SUPPORTED_LOCALES) {
        const messages = JSON.parse(
          fs.readFileSync(
            path.resolve(APP_DIR, "../../messages", `${locale}.json`),
            "utf8",
          ),
        );
        const value = lookup(messages[namespace], key);
        expect(typeof value, `${locale}: ${namespace}.${key}`).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    },
  );

  it.each(DEFAULT_TITLE_PAGES)("%s は generateMetadata を持たない(layout の default を使う)", (rel) => {
    const src = fs.readFileSync(path.join(APP_DIR, rel), "utf8");
    expect(src).not.toContain("generateMetadata");
  });

  it("動的ルートのページはエンティティを読む処理を generateMetadata に持たない", () => {
    for (const { file, rel } of pages.filter((p) => p.rel.includes("["))) {
      if (rel === "[locale]/layout.tsx") continue;
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes("generateMetadata")) continue;
      expect(src).toMatch(/export const generateMetadata = createPageMetadata\(/);
      expect(src).not.toMatch(/export (async )?function generateMetadata/);
    }
  });
});
