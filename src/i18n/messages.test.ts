import { readFileSync } from "node:fs";
import { join } from "node:path";

import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/lib/constants/locales";

type Json = { [key: string]: string | Json };

function load(locale: string): Json {
  return JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Json;
}

function flatten(node: Json, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") result[prefix + key] = value;
    else Object.assign(result, flatten(value, `${prefix}${key}.`));
  }
  return result;
}

/** ICUメッセージ中の変数名（`{name}`・`{count, plural, ...}`の先頭）を集める。 */
function variables(message: string): string[] {
  const names: string[] = [];
  const pattern = /\{\s*(\w+)\s*[,}]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(message)) !== null) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names.sort();
}

/** `'{name}'`はICUでは「`{name}`という文字そのもの」を意味し、変数が展開されない。 */
const QUOTED_PLACEHOLDER = /(?<!')'\{\w+\}'(?!')/;

/** `''{name}''`は「アポストロフィ＋変数＋アポストロフィ」と解釈され、`'{name}'`（リテラル）との取り違えの元になる。 */
const DOUBLE_QUOTED_PLACEHOLDER = /''\{\w+\}''/;

/** メッセージ中の変数ごとに「`'{x}'`で囲んでいるか」を返す（formatTemplate方式かnext-intl変数方式かの区別）。 */
function quotingStyles(message: string): Record<string, "quoted" | "bare"> {
  const styles: Record<string, "quoted" | "bare"> = {};
  for (const match of message.matchAll(/(?<!')'\{(\w+)\}'(?!')/g)) styles[match[1]] = "quoted";
  for (const match of message.matchAll(/(?<!')\{\s*(\w+)\s*[,}]/g)) {
    if (!(match[1] in styles)) styles[match[1]] = "bare";
  }
  return styles;
}

const ja = flatten(load("ja"));
const otherLocales = SUPPORTED_LOCALES.filter((locale) => locale !== "ja");

describe.each(otherLocales)("messages/%s.json", (locale) => {
  const messages = flatten(load(locale));

  it("jaと同じキー集合を持つ", () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(ja).sort());
  });

  it("jaと同じ変数（プレースホルダー）を持つ", () => {
    const mismatched = Object.keys(ja).filter(
      (key) =>
        key in messages && variables(messages[key]).join(",") !== variables(ja[key]).join(",")
    );
    expect(mismatched).toEqual([]);
  });

  it("jaに無いのに、変数をアポストロフィで囲んでいない（展開されなくなる）", () => {
    const broken = Object.keys(messages).filter(
      (key) => QUOTED_PLACEHOLDER.test(messages[key]) && !QUOTED_PLACEHOLDER.test(ja[key] ?? "")
    );
    expect(broken).toEqual([]);
  });

  it("jaと各変数の書き方（'{x}'で囲む/囲まない）が一致する", () => {
    const mismatched = Object.keys(ja).filter((key) => {
      if (!(key in messages)) return false;
      const expected = quotingStyles(ja[key]);
      const actual = quotingStyles(messages[key]);
      return Object.keys(expected).some((name) => expected[name] !== actual[name]);
    });
    expect(mismatched).toEqual([]);
  });

  it("変数をアポストロフィ2個（''{x}''）で囲んでいない", () => {
    const broken = Object.keys(messages).filter((key) => DOUBLE_QUOTED_PLACEHOLDER.test(messages[key]));
    expect(broken).toEqual([]);
  });

  it("全メッセージがICU構文として解析できる", () => {
    const failed = Object.keys(messages).filter((key) => {
      try {
        new IntlMessageFormat(messages[key], locale);
        return false;
      } catch {
        return true;
      }
    });
    expect(failed).toEqual([]);
  });
});
