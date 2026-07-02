import type {
  CreateReplyTemplateInput,
  ReplyTemplate,
} from "@/types/reply-template";
import type { Inquiry } from "@/types/inquiry";
import { getGlobalMockStore } from "@/lib/mock-store";

/**
 * カテゴリ別テンプレートの可変ストア（フェーズ1限定、プロセス内メモリのみ）。
 * カテゴリごとに最低1件の初期テンプレートを用意する。
 * Server Actionsからの変更がRSCレンダリングに反映されるよう、`globalThis`上に保持する
 * （`lib/mock-store.ts`参照）。
 */
const MOCK_REPLY_TEMPLATES: ReplyTemplate[] = getGlobalMockStore(
  "reply-templates",
  () => [
    {
      id: "template-defect-001",
      category: "defect",
      body: "この度はご不便をおかけし申し訳ございません。不良品の詳細を確認のうえ、交換または返金の対応についてご案内いたします。",
    },
    {
      id: "template-order-001",
      category: "order",
      body: "お問い合わせいただいた発注内容について確認いたしました。発送予定日が確定次第、改めてご連絡いたします。",
    },
    {
      id: "template-system-001",
      category: "system",
      body: "システムの不具合について報告いただきありがとうございます。現在状況を確認しておりますので、今しばらくお待ちください。",
    },
    {
      id: "template-other-001",
      category: "other",
      body: "お問い合わせいただきありがとうございます。内容を確認のうえ、担当部署より改めてご連絡いたします。",
    },
  ]
);

/**
 * 全カテゴリ分のテンプレート一覧を取得するモックAPI関数。
 */
export async function getReplyTemplates(): Promise<ReplyTemplate[]> {
  return Promise.resolve([...MOCK_REPLY_TEMPLATES]);
}

/**
 * 指定カテゴリのテンプレート一覧を取得するモックAPI関数。
 */
export async function getReplyTemplatesByCategory(
  category: Inquiry["category"]
): Promise<ReplyTemplate[]> {
  return Promise.resolve(
    MOCK_REPLY_TEMPLATES.filter((template) => template.category === category)
  );
}

/**
 * 指定されたIDのテンプレートを1件取得するモックAPI関数。
 * 該当データが存在しない場合は例外をthrowせず `null` を解決する。
 */
export async function getReplyTemplateById(
  id: string
): Promise<ReplyTemplate | null> {
  const found = MOCK_REPLY_TEMPLATES.find((template) => template.id === id);

  return Promise.resolve(found ?? null);
}

/**
 * テンプレートを新規作成するモックAPI関数。
 */
export async function createReplyTemplate(
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const template: ReplyTemplate = {
    id: crypto.randomUUID(),
    ...input,
  };

  MOCK_REPLY_TEMPLATES.push(template);

  return Promise.resolve(template);
}

/**
 * 既存テンプレートの内容を更新するモックAPI関数。
 */
export async function updateReplyTemplate(
  id: string,
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const template = MOCK_REPLY_TEMPLATES.find((item) => item.id === id);
  if (!template) {
    throw new Error(`Reply template not found: ${id}`);
  }

  template.category = input.category;
  template.body = input.body;

  return Promise.resolve(template);
}
