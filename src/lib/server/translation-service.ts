import "server-only";

import {
  createClaudeTranslator,
  TranslationError,
  type FieldsTranslator,
  type Translator,
} from "@/lib/translation/claude-translator";

let cachedTranslator: (Translator & FieldsTranslator) | null | undefined;

function getClaudeTranslator(): (Translator & FieldsTranslator) | null {
  if (cachedTranslator !== undefined) {
    return cachedTranslator;
  }

  try {
    cachedTranslator = createClaudeTranslator();
  } catch (error) {
    if (error instanceof TranslationError && error.kind === "not_configured") {
      cachedTranslator = null;
    } else {
      throw error;
    }
  }

  return cachedTranslator;
}

export function getTranslator(): Translator | null {
  return getClaudeTranslator();
}

/** 複数フィールド・複数言語を1回で翻訳する翻訳器（全言語自動翻訳用）。未設定ならnull。 */
export function getFieldsTranslator(): FieldsTranslator | null {
  return getClaudeTranslator();
}

export function resetTranslatorCacheForTests(): void {
  cachedTranslator = undefined;
}
