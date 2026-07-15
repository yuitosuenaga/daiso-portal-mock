import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InquiryListClient } from "@/components/features/inquiry-list/InquiryListClient";
import type { Inquiry } from "@/types/inquiry";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function resolveMessage(namespace: string, key: string): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : `${namespace}.${key}`;
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    title: "サンプルの問い合わせ",
    category: "other",
    urgency: "medium",
    storeRegion: "関東",
    originalText: "サンプル本文です。",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Company", country: "JP" },
    ...overrides,
  };
}

const INQUIRIES: Inquiry[] = [
  buildInquiry({
    id: "1",
    title: "商品破損についての問い合わせ",
    originalText: "納品された商品の一部に破損が見られます。",
    category: "defect",
    status: "new",
  }),
  buildInquiry({
    id: "2",
    title: "追加発注のお願い",
    originalText: "在庫が不足しているため追加発注をお願いします。",
    category: "order",
    status: "in_progress",
  }),
];

function renderClient() {
  return render(
    <InquiryListClient
      inquiries={INQUIRIES}
      categoryLabels={{
        defect: "不具合",
        order: "発注関連",
        system: "システム関連",
        other: "その他",
      }}
      categoryOptions={[
        { value: "defect", label: "不具合" },
        { value: "order", label: "発注関連" },
        { value: "system", label: "システム関連" },
        { value: "other", label: "その他" },
      ]}
      statusOptions={[
        { value: "new", label: "新規" },
        { value: "in_progress", label: "対応中" },
        { value: "resolved", label: "解決済み" },
      ]}
      urgencyLabels={{ high: "高", medium: "中", low: "低" }}
      statusLabels={{ new: "新規", in_progress: "対応中", resolved: "解決済み" }}
      statusFieldLabel="対応状況"
      urgencyFieldLabel="緊急度"
      locale="ja"
      untitledLabel="(タイトル未設定)"
    />
  );
}

describe("InquiryListClient", () => {
  it("キーワードを入力すると一致する問い合わせのみ表示される", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("キーワード検索"), "破損");

    expect(screen.getByText("商品破損についての問い合わせ")).toBeTruthy();
    expect(
      screen.queryByText("追加発注のお願い")
    ).toBeNull();
  });

  it("クリア操作で全件表示に戻る", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("キーワード検索"), "破損");
    expect(screen.queryByText("追加発注のお願い")).toBeNull();

    await user.click(screen.getByRole("button", { name: "クリア" }));

    expect(screen.getByText("商品破損についての問い合わせ")).toBeTruthy();
    expect(screen.getByText("追加発注のお願い")).toBeTruthy();
  });

  it("条件に一致する問い合わせが無いとき0件メッセージを表示する", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("キーワード検索"), "存在しない語句");

    expect(screen.getByText("該当する問い合わせがありません")).toBeTruthy();
  });
});
