import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * generateMetadata はページ本体と並行して走るため、認可・DB・API・サーバー処理を
 * 呼んではならない。import の許可リスト方式で静的に検査する
 * (import が増えた場合はここを意図的に更新すること)。
 */
const ROOT = process.cwd();

const TARGETS: Record<string, string[]> = {
  "src/lib/page-metadata.ts": [
    "@/lib/constants/locales",
    "next",
    "next-intl/server",
  ],
  "src/app/[locale]/layout.tsx": [
    "@/i18n/routing",
    "@/lib/constants/locales",
    "next",
    "next-intl",
    "next-intl/server",
    "next/navigation",
  ],
};

function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\sfrom\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of source.matchAll(re)) {
    specs.push((m[1] ?? m[2] ?? m[3])!);
  }
  return [...new Set(specs)].sort();
}

describe("extractImportSpecifiers(自己検証)", () => {
  it("各種 import 形式を抜き出す", () => {
    const src = [
      `import { a } from "x/a";`,
      `import type { B } from 'x/b';`,
      `import c, {\n d,\n} from "x/c";`,
      `import "x/side";`,
      `export { e } from "x/e";`,
      `const f = await import("x/f");`,
      `const g = require("x/g");`,
    ].join("\n");
    expect(extractImportSpecifiers(src)).toEqual([
      "x/a",
      "x/b",
      "x/c",
      "x/e",
      "x/f",
      "x/g",
      "x/side",
    ]);
  });
});

describe("generateMetadata 周辺の import は副作用のあるモジュールを含まない", () => {
  for (const [file, allowed] of Object.entries(TARGETS)) {
    it(`${file} の import は許可リストのみ`, () => {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(extractImportSpecifiers(source)).toEqual([...allowed].sort());
    });
  }
});
