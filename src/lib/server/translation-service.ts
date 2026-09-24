import "server-only";

import {
  createClaudeTranslator,
  TranslationError,
  type Translator,
} from "@/lib/translation/claude-translator";

let cachedTranslator: Translator | null | undefined;

export function getTranslator(): Translator | null {
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

export function resetTranslatorCacheForTests(): void {
  cachedTranslator = undefined;
}
