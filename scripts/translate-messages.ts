import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

import { TRANSLATED_LOCALES } from "../src/lib/constants/locales";
import { createClaudeTranslator, type FieldsTranslator } from "../src/lib/translation/claude-translator";

/**
 * `messages/ja.json`（画面文言の正）を基準に、`messages/{locale}.json`に無いキーだけをClaude APIで
 * 翻訳して補う。`en`を含む既存の訳は上書きしない。ja.jsonに文言を追加した後に再実行すれば差分のみ補完される。
 *
 *   npm run messages:translate -- [--locale=th,vi] [--dry-run]
 */

type Json = { [key: string]: string | Json };

const MESSAGES_DIR = join(process.cwd(), "messages");
const BATCH_SIZE = 40;

function flatten(tree: Json, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result[path] = value;
    else Object.assign(result, flatten(value, path));
  }
  return result;
}

function setPath(tree: Json, path: string, value: string): void {
  const parts = path.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) {
    const next = node[part];
    if (typeof next === "string" || next === undefined) node[part] = {};
    node = node[part] as Json;
  }
  node[parts[parts.length - 1]] = value;
}

/** `{name}`形式のプレースホルダ名の一覧（翻訳で壊れていないかの検証用） */
function placeholders(text: string): string {
  return (text.match(/\{\w+/g) ?? []).sort().join(",");
}

export async function translateMissingMessages(
  translator: FieldsTranslator,
  locale: string,
  dryRun = false,
): Promise<{ missing: number; translated: number; failed: string[] }> {
  const source = flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, "ja.json"), "utf8")) as Json);
  const targetPath = join(MESSAGES_DIR, `${locale}.json`);
  const existing: Json = existsSync(targetPath) ? (JSON.parse(readFileSync(targetPath, "utf8")) as Json) : {};
  const existingFlat = flatten(existing);

  const missingKeys = Object.keys(source).filter((key) => !(key in existingFlat));
  if (dryRun) return { missing: missingKeys.length, translated: 0, failed: [] };

  const translations: Record<string, string> = {};
  const failed: string[] = [];

  // 一部の項目をモデルが落としたバッチは全体が無効になるため、失敗時はバッチを半分に分けて再試行する
  async function translateBatch(keys: string[]): Promise<void> {
    const fields = Object.fromEntries(keys.map((key) => [key, source[key]]));
    try {
      const { translations: result } = await translator.translateFields({
        fields,
        sourceLocale: "ja",
        targetLocales: [locale],
      });
      for (const key of keys) {
        const value = result[locale]?.[key];
        if (value && placeholders(value) === placeholders(source[key])) translations[key] = value;
        else failed.push(key);
      }
    } catch (error) {
      if (keys.length > 1) {
        const half = Math.ceil(keys.length / 2);
        await translateBatch(keys.slice(0, half));
        await translateBatch(keys.slice(half));
        return;
      }
      console.error(`[messages] ${locale}: ${keys[0]} failed:`, error);
      failed.push(...keys);
    }
  }

  for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
    await translateBatch(missingKeys.slice(i, i + BATCH_SIZE));
  }

  // jaの構造・キー順に揃えて書き出す（既存の訳を優先し、無いキーのみ新規翻訳を使う）
  const output: Json = {};
  for (const key of Object.keys(source)) {
    const value = existingFlat[key] ?? translations[key];
    if (value !== undefined) setPath(output, key, value);
  }
  writeFileSync(targetPath, `${JSON.stringify(output, null, 2)}\n`);

  return { missing: missingKeys.length, translated: Object.keys(translations).length, failed };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const localeArg = args.find((arg) => arg.startsWith("--locale="));
  const locales = localeArg
    ? localeArg.slice("--locale=".length).split(",")
    : TRANSLATED_LOCALES.filter((locale) => locale !== "en");

  const translator = dryRun ? ({} as FieldsTranslator) : createClaudeTranslator();
  for (const locale of locales) {
    const result = await translateMissingMessages(translator, locale, dryRun);
    console.log(locale, result.failed.length > 0 ? { ...result, failed: result.failed.length } : result);
    if (result.failed.length > 0) console.error(`  failed keys (${locale}):`, result.failed);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
