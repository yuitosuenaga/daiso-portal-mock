import { readFileSync } from "node:fs";
import { join } from "node:path";

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
});
