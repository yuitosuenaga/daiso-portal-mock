import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/constants/locales";
import { CLIENT_NAMESPACES, pickClientMessages } from "./client-namespaces";

const ROOT = process.cwd();

/**
 * 引数が文字列リテラルでない useTranslations 呼び出しを許可するファイルと、実際に渡される namespace。
 * MobileNav は現状本番の呼び出し元が無い(テストのみ)が、将来再利用された場合に
 * helpdeskNav の欠落で実行時エラーにならないための安全網として残している。
 */
const DYNAMIC_NAMESPACE_FILES: Record<string, string[]> = {
  "src/components/layout/MobileNav.tsx": ["helpdeskNav"],
};

const FORBIDDEN_HOOKS = ["useMessages(", "useFormatter(", "useNow(", "useTimeZone("];

// use-intl 直 import は next-intl の絞り込み済み messages を迂回しうるため禁止。
// useLocale は messages に依存しないので禁止しない。
const USE_INTL_IMPORT = /["']use-intl(?:\/[^"']*)?["']/;

/** import 文(複数行含む)とコメントを除去する。useTranslations の識別子参照を数える前処理 */
function stripImports(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*import\b[^;]*?\bfrom\s*["'][^"']+["'];?/gm, "");
}

/** `useTranslations(` 形式以外の識別子参照(ジェネリクス・別名代入・引数渡し等)の数 */
function countUnextractableRefs(source: string): number {
  const code = stripImports(source);
  const refs = code.match(/\buseTranslations\b/g)?.length ?? 0;
  return refs - extractUseTranslations(code).length;
}

type Usage =
  | { kind: "literal"; namespace: string; topLevel: string }
  | { kind: "none" }
  | { kind: "dynamic"; arg: string };

function extractUseTranslations(source: string): Usage[] {
  const out: Usage[] = [];
  for (const m of source.matchAll(/\buseTranslations\(\s*([^)]*?)\s*\)/g)) {
    const arg = m[1]!;
    if (arg === "") {
      out.push({ kind: "none" });
      continue;
    }
    const lit = /^(["'`])([^"'`$]*)\1$/.exec(arg);
    if (lit) {
      out.push({ kind: "literal", namespace: lit[2]!, topLevel: lit[2]!.split(".")[0]! });
    } else {
      out.push({ kind: "dynamic", arg });
    }
  }
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(join(ROOT, "src")).map((p) => ({
  path: relative(ROOT, p).split("\\").join("/"),
  source: readFileSync(p, "utf8"),
}));

const clientSet = new Set<string>(CLIENT_NAMESPACES);

describe("extractUseTranslations(自己検証)", () => {
  it("複数行・シングルクォート・識別子・引数なしを扱う", () => {
    expect(extractUseTranslations(`useTranslations(\n  "a.b"\n)`)).toEqual([
      { kind: "literal", namespace: "a.b", topLevel: "a" },
    ]);
    expect(extractUseTranslations(`useTranslations('c')`)).toEqual([
      { kind: "literal", namespace: "c", topLevel: "c" },
    ]);
    expect(extractUseTranslations(`useTranslations(namespace)`)).toEqual([
      { kind: "dynamic", arg: "namespace" },
    ]);
    expect(extractUseTranslations(`useTranslations()`)).toEqual([{ kind: "none" }]);
  });

  it("抽出できない参照(ジェネリクス・別名)を検出し、import 行は無視する", () => {
    const imp = `import { useTranslations } from "next-intl";\n`;
    expect(countUnextractableRefs(`${imp}const t = useTranslations("a");`)).toBe(0);
    expect(countUnextractableRefs(`import {\n  useTranslations,\n} from "next-intl";`)).toBe(0);
    expect(countUnextractableRefs(`/** useTranslations */\n// useTranslations\n${imp}`)).toBe(0);
    expect(countUnextractableRefs(`${imp}useTranslations<X>("a")`)).toBe(1);
    expect(countUnextractableRefs(`${imp}const useT = useTranslations;`)).toBe(1);
  });

  it("use-intl の import を検出する", () => {
    expect(USE_INTL_IMPORT.test(`import { x } from "use-intl";`)).toBe(true);
    expect(USE_INTL_IMPORT.test(`from 'use-intl/core'`)).toBe(true);
    expect(USE_INTL_IMPORT.test(`from "next-intl"`)).toBe(false);
  });
});

describe("pickClientMessages", () => {
  it("CLIENT_NAMESPACES のみを残す", () => {
    expect(pickClientMessages({ header: {}, dashboard: {} })).toEqual({ header: {} });
  });
});

describe("CLIENT_NAMESPACES の網羅性", () => {
  const usages = files.flatMap((f) =>
    extractUseTranslations(f.source).map((u) => ({ file: f.path, usage: u })),
  );

  it("useTranslations の使用が少なくとも1件検出される(走査の健全性)", () => {
    expect(usages.length).toBeGreaterThan(10);
  });

  it("useTranslations の top-level namespace は全て CLIENT_NAMESPACES に含まれる", () => {
    const problems: string[] = [];
    for (const { file, usage } of usages) {
      if (usage.kind === "literal") {
        if (!clientSet.has(usage.topLevel)) problems.push(`${file}: ${usage.namespace}`);
      } else if (usage.kind === "none") {
        problems.push(`${file}: 引数なし useTranslations()`);
      } else {
        const allowed = DYNAMIC_NAMESPACE_FILES[file];
        if (!allowed) problems.push(`${file}: 動的引数 ${usage.arg}`);
        else
          for (const ns of allowed)
            if (!clientSet.has(ns.split(".")[0]!)) problems.push(`${file}: ${ns}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("CLIENT_NAMESPACES の各要素がどこかで使われている", () => {
    const used = new Set<string>();
    for (const { file, usage } of usages) {
      if (usage.kind === "literal") used.add(usage.topLevel);
      if (usage.kind === "dynamic")
        for (const ns of DYNAMIC_NAMESPACE_FILES[file] ?? []) used.add(ns.split(".")[0]!);
    }
    expect(CLIENT_NAMESPACES.filter((n) => !used.has(n))).toEqual([]);
  });

  it("useTranslations( 形式で抽出できない参照(ジェネリクス・別名等)が src に無い", () => {
    const hits = files
      .map((f) => ({ path: f.path, n: countUnextractableRefs(f.source) }))
      .filter((x) => x.n !== 0)
      .map((x) => `${x.path}: ${x.n}`);
    expect(hits).toEqual([]);
  });

  it("use-intl を直接 import していない", () => {
    expect(files.filter((f) => USE_INTL_IMPORT.test(f.source)).map((f) => f.path)).toEqual([]);
  });

  it("全メッセージ全体を要求するフックが src に無い", () => {
    const hits = files.flatMap((f) =>
      FORBIDDEN_HOOKS.filter((h) => f.source.includes(h)).map((h) => `${f.path}: ${h}`),
    );
    expect(hits).toEqual([]);
  });

  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale}.json に全 CLIENT_NAMESPACES が存在する`, () => {
      const json = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));
      expect(CLIENT_NAMESPACES.filter((n) => !(n in json))).toEqual([]);
    });
  }
});
