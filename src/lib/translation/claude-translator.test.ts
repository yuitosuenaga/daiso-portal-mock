import { describe, expect, it, vi, beforeEach } from "vitest";

const parseMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { parse: parseMock };
  },
}));

import { errorFields } from "@/lib/server/logger";
import { createClaudeTranslator, TranslationError } from "@/lib/translation/claude-translator";

beforeEach(() => {
  parseMock.mockReset();
});

describe("createClaudeTranslator", () => {
  it("apiKeyが未設定（optionsもENV.ANTHROPIC_API_KEYも無い）場合、not_configuredのTranslationErrorを送出する", () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      expect(() => createClaudeTranslator()).toThrow(TranslationError);
      try {
        createClaudeTranslator();
      } catch (error) {
        expect((error as TranslationError).kind).toBe("not_configured");
      }
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it("正常なJSONを受け取った場合、{title, body}を返す", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { title: "Translated Title", body: "Translated Body" },
    });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    const result = await translator.translate({
      title: "元のタイトル",
      body: "元の本文",
      sourceLocale: "ja",
      targetLocale: "en",
    });

    expect(result).toEqual({
      title: "Translated Title",
      body: "Translated Body",
      model: "claude-haiku-4-5",
    });
    const callArgs = parseMock.mock.calls[0]?.[0];
    expect(callArgs.messages[0].content).toContain("<source_title>");
    expect(callArgs.messages[0].content).toContain("元のタイトル");
  });

  it("stop_reasonがrefusalの場合、refusalのTranslationErrorを送出する", async () => {
    parseMock.mockResolvedValue({ stop_reason: "refusal", parsed_output: null });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    await expect(
      translator.translate({ title: "a", body: "b", sourceLocale: "ja", targetLocale: "en" })
    ).rejects.toMatchObject({ kind: "refusal" });
  });

  it("stop_reasonがmax_tokensの場合、truncatedのTranslationErrorを送出する", async () => {
    parseMock.mockResolvedValue({ stop_reason: "max_tokens", parsed_output: null });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    await expect(
      translator.translate({ title: "a", body: "b", sourceLocale: "ja", targetLocale: "en" })
    ).rejects.toMatchObject({ kind: "truncated" });
  });

  it("parsed_outputがnull（スキーマ不一致）の場合、invalid_outputのTranslationErrorを送出する", async () => {
    parseMock.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    await expect(
      translator.translate({ title: "a", body: "b", sourceLocale: "ja", targetLocale: "en" })
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("SDK呼び出し自体が失敗した場合、api_errorのTranslationErrorを送出する", async () => {
    parseMock.mockRejectedValue(new Error("network down"));
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    await expect(
      translator.translate({ title: "a", body: "b", sourceLocale: "ja", targetLocale: "en" })
    ).rejects.toMatchObject({ kind: "api_error" });
  });

  it("api_errorはSDKエラーをcauseに保持し、errorFieldsでstatus・request_id・SDK側スタックが出る", async () => {
    const sdkError = Object.assign(new Error("429 rate limited"), {
      name: "RateLimitError",
      status: 429,
      request_id: "req_abc123",
    });
    parseMock.mockRejectedValue(sdkError);
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    const thrown = await translator
      .translate({ title: "a", body: "b", sourceLocale: "ja", targetLocale: "en" })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(TranslationError);
    expect((thrown as Error).cause).toBe(sdkError);
    type Fields = { errorName: string; errorProps: Record<string, unknown>; status?: number; stack_trace: string; cause: Fields };
    const fields = errorFields(thrown) as unknown as Fields;
    expect(fields.errorName).toBe("TranslationError");
    expect(fields.errorProps.kind).toBe("api_error");
    expect(fields.cause.errorName).toBe("RateLimitError");
    expect(fields.cause.status).toBe(429);
    expect(fields.cause.errorProps.request_id).toBe("req_abc123");
    expect(fields.cause.stack_trace).toContain("429 rate limited");
  });

  it("titleが空文字の場合、空のtitleをそのまま返す", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { title: "", body: "Body only" },
    });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    const result = await translator.translate({
      title: "",
      body: "本文のみ",
      sourceLocale: "ja",
      targetLocale: "en",
    });

    expect(result.title).toBe("");
  });
});

describe("translateFields", () => {
  it("複数言語の訳をlocale→フィールドの形で返す", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: {
        translations: [
          { locale: "en", fields: [{ key: "title", value: "T-en" }] },
          { locale: "vi", fields: [{ key: "title", value: "T-vi" }] },
        ],
      },
    });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    const result = await translator.translateFields({
      fields: { title: "題" },
      sourceLocale: "ja",
      targetLocales: ["en", "vi"],
    });

    expect(result.translations).toEqual({ en: { title: "T-en" }, vi: { title: "T-vi" } });
  });

  it("対象localeまたはフィールドが欠けていればinvalid_outputを送出する", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { translations: [{ locale: "en", fields: [{ key: "title", value: "T" }] }] },
    });
    const translator = createClaudeTranslator({ apiKey: "test-key" });

    await expect(
      translator.translateFields({ fields: { title: "題" }, sourceLocale: "ja", targetLocales: ["en", "vi"] }),
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });
});
