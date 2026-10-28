import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

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

const HAN = /\p{Script=Han}/u;
const HIRAGANA = /\p{Script=Hiragana}/u;
// U+30FB(「・」)は中国語の文でも区切りとして使うため除く
const KATAKANA = /[\p{Script=Katakana}--[・]]/v;
const THAI = /\p{Script=Thai}/u;
const HANGUL = /\p{Script=Hangul}/u;
const BENGALI = /\p{Script=Bengali}/u;
// 固有名詞・技術用語の英字は許可するため、長い連続のみ禁止する（ICU変数名は除いて判定）
const LONG_LATIN = /[A-Za-z]{12,}/;

type Rule = { name: string; test: (message: string) => boolean };
const rule = (name: string, pattern: RegExp): Rule => ({ name, test: (m) => pattern.test(m) });

const LATIN_RULES = [
  rule("Han", HAN),
  rule("Hiragana", HIRAGANA),
  rule("Katakana", KATAKANA),
  rule("Thai", THAI),
  rule("Hangul", HANGUL),
];
const ZH_RULES = [
  rule("Hiragana", HIRAGANA),
  rule("Katakana", KATAKANA),
  rule("Thai", THAI),
  rule("Hangul", HANGUL),
];

const FORBIDDEN: Record<string, Rule[]> = {
  th: [
    rule("Han", HAN),
    rule("Hiragana", HIRAGANA),
    rule("Katakana", KATAKANA),
    rule("Bengali", BENGALI),
    rule("Hangul", HANGUL),
    rule("LongLatin", LONG_LATIN),
  ],
  zh: ZH_RULES,
  "zh-TW": ZH_RULES,
  en: LATIN_RULES,
  es: LATIN_RULES,
  pt: LATIN_RULES,
  vi: LATIN_RULES,
};

/** 「日本語」タブ名など、他言語のJSONに日本語表記があることが正当なキー。 */
const ALLOWED_KEYS = new Set(["helpdeskLinks.preview.localeTabJa", "helpdeskLinks.categories.form.language.jaTab"]);

/**
 * 既知の違反（`ロケール:キー:スクリプト` → 理由）。新しい違反だけを落とすため、
 * 直せていないものはここに理由付きで固定する。現状は空（th の混入6件は修正済み）。
 *
 * 文字種に表れない既知の誤訳（要ネイティブ確認・本テストの対象外）:
 * - zh-TW の「問合せ」を「問卷」（アンケート）と訳している7件:
 *   helpdeskInquiries.list.{title,description,empty,error,noResults} / helpdeskInquiries.detail.{notFound,error}
 */
const KNOWN_VIOLATIONS: Record<string, string> = {};

/** ICU変数（`{name}`・`{count, plural, ...}`の変数名）は文字種判定から除く。 */
function stripVariables(message: string): string {
  return message.replace(/\{\s*\w+\s*(?=[,}])/g, "{");
}

describe.each(Object.keys(FORBIDDEN))("messages/%s.json の文字種", (locale) => {
  const messages = flatten(load(locale));

  it("そのロケールで使わない文字種が混入していない", () => {
    const violations: string[] = [];
    for (const [key, message] of Object.entries(messages)) {
      if (ALLOWED_KEYS.has(key)) continue;
      const text = stripVariables(message);
      for (const { name, test } of FORBIDDEN[locale]) {
        const id = `${locale}:${key}:${name}`;
        if (test(text) && !(id in KNOWN_VIOLATIONS)) violations.push(id);
      }
    }
    expect(violations).toEqual([]);
  });
});
