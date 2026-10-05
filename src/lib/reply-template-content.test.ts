import { describe, expect, it } from "vitest";

import {
  localizeReplyTemplates,
  resolveReplyTemplateContent,
} from "@/lib/reply-template-content";
import type { ReplyTemplate } from "@/types/reply-template";

const template: ReplyTemplate = {
  id: "t1",
  category: "other",
  name: "受付確認",
  body: "受け付けました",
  translations: [
    { locale: "en", name: "Acknowledgement", body: "We have received your inquiry." },
    { locale: "th", name: "ยืนยัน", body: "เราได้รับเรื่องแล้ว" },
  ],
};

describe("resolveReplyTemplateContent", () => {
  it("jaは親の値を返す", () => {
    expect(resolveReplyTemplateContent(template, "ja")).toEqual({
      name: "受付確認",
      body: "受け付けました",
    });
  });

  it("locale一致の翻訳を返す", () => {
    expect(resolveReplyTemplateContent(template, "th")).toEqual({
      name: "ยืนยัน",
      body: "เราได้รับเรื่องแล้ว",
    });
  });

  it("翻訳が無いlocale(送信者言語がkoなど)はenにフォールバックする", () => {
    expect(resolveReplyTemplateContent(template, "ko").body).toBe("We have received your inquiry.");
  });

  it("翻訳が1件も無ければjaにフォールバックする", () => {
    expect(resolveReplyTemplateContent({ name: "A", body: "B" }, "th")).toEqual({
      name: "A",
      body: "B",
    });
  });
});

describe("localizeReplyTemplates", () => {
  it("名称はUI言語、本文は送信者の言語で解決する", () => {
    const [result] = localizeReplyTemplates([template], {
      displayLocale: "ja",
      replyLocale: "th",
    });

    expect(result.name).toBe("受付確認");
    expect(result.body).toBe("เราได้รับเรื่องแล้ว");
    expect(result.id).toBe("t1");
  });
});
