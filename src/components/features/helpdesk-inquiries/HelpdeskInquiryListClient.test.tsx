import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryListClient } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListClient";
import type { Inquiry } from "@/types/inquiry";
import messages from "../../../../messages/ja.json";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
    (key: string, values?: Record<string, unknown>) => {
      const template = resolveMessage(namespace, key);
      if (!values) {
        return template;
      }
      return Object.entries(values).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        template
      );
    },
}));

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    title: "テストタイトル",
    category: "defect",
    urgency: "low",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    ...overrides,
  };
}

const INQUIRIES: Inquiry[] = [
  buildInquiry({
    id: "1",
    title: "商品破損の報告",
    status: "new",
    urgency: "high",
    submittedBy: { companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
  }),
  buildInquiry({
    id: "2",
    title: "追加発注のお願い",
    status: "in_progress",
    urgency: "medium",
    claim: { staffName: "田中", claimedAt: "2026-06-02T00:00:00.000Z" },
    submittedBy: { companyName: "Daiso USA Inc.", country: "US" },
  }),
  buildInquiry({
    id: "3",
    title: "解決済みの問い合わせ",
    status: "resolved",
    urgency: "low",
    claim: null,
    submittedBy: { companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
  }),
];

function renderClient() {
  return render(
    <HelpdeskInquiryListClient
      inquiries={INQUIRIES}
      categoryLabels={{
        defect: "不具合",
        order: "発注関連",
        system: "システム関連",
        other: "その他",
      }}
      urgencyLabels={{ high: "高", medium: "中", low: "低" }}
      statusLabels={{ new: "新規", in_progress: "対応中", resolved: "解決済み" }}
      countryLabels={{ VN: "ベトナム", US: "アメリカ" }}
      countryOptions={[
        { value: "VN", label: "ベトナム" },
        { value: "US", label: "アメリカ" },
      ]}
      categoryOptions={[
        { value: "defect", label: "不具合" },
        { value: "order", label: "発注関連" },
      ]}
      statusOptions={[
        { value: "new", label: "新規" },
        { value: "in_progress", label: "対応中" },
        { value: "resolved", label: "解決済み" },
      ]}
      urgencyOptions={[
        { value: "high", label: "高" },
        { value: "medium", label: "中" },
        { value: "low", label: "低" },
      ]}
      claimBadgeLabel="対応中"
      claimedByLabel="対応者"
      locale="ja"
      untitledLabel="(タイトル未設定)"
    />
  );
}

describe("HelpdeskInquiryListClient", () => {
  it("claimされている問い合わせの担当者名が対応者セレクトの選択肢に現れる", () => {
    renderClient();

    const staffSelect = screen.getByLabelText("対応者") as HTMLSelectElement;
    const optionLabels = Array.from(staffSelect.options).map((o) => o.textContent);
    expect(optionLabels).toContain("田中");
  });

  it("サマリパネルの未着手ヒーロー数値をクリックすると一覧が絞り込まれ、未着手のみチェックが同期する", async () => {
    const { container } = renderClient();
    const user = userEvent.setup();

    await user.click(container.querySelector(".text-5xl")!);

    expect(screen.getByText("商品破損の報告")).toBeTruthy();
    expect(screen.queryByText("追加発注のお願い")).toBeNull();
    expect(
      (screen.getByLabelText("未着手のみ") as HTMLInputElement).checked
    ).toBe(true);
  });

  it("対応者行をクリックすると対応者セレクトの選択も同期する", async () => {
    renderClient();
    const user = userEvent.setup();

    const rowLabel = screen
      .getAllByText("田中")
      .find((el) => el.tagName !== "OPTION")!;
    await user.click(rowLabel);

    expect(screen.getByText("追加発注のお願い")).toBeTruthy();
    expect(screen.queryByText("商品破損の報告")).toBeNull();
    expect(
      (screen.getByLabelText("対応者") as HTMLSelectElement).value
    ).toBe("田中");
  });

  it("未解決のみを選んだ状態で対応状況を解決済みに変更すると、未解決のみが解除され一覧が空にならない", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("未解決のみ"));
    await user.selectOptions(screen.getByLabelText("対応状況"), "resolved");

    expect(
      (screen.getByLabelText("未解決のみ") as HTMLInputElement).checked
    ).toBe(false);
    expect(screen.getByText("解決済みの問い合わせ")).toBeTruthy();
  });

  it("対応状況を解決済みに変更した状態で未解決のみを選ぶと、対応状況の絞り込みが解除され一覧が空にならない", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("対応状況"), "resolved");
    await user.click(screen.getByLabelText("未解決のみ"));

    expect(
      (screen.getByLabelText("対応状況") as HTMLSelectElement).value
    ).toBe("");
    expect(screen.getByText("商品破損の報告")).toBeTruthy();
    expect(screen.queryByText("解決済みの問い合わせ")).toBeNull();
  });

  it("未着手のみを選んだ状態で対応者を選択すると、未着手のみが解除される", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("未着手のみ"));
    await user.selectOptions(screen.getByLabelText("対応者"), "田中");

    expect(
      (screen.getByLabelText("未着手のみ") as HTMLInputElement).checked
    ).toBe(false);
    expect(screen.getByText("追加発注のお願い")).toBeTruthy();
  });

  it("対応者を選択した状態で未着手のみを選ぶと、対応者の絞り込みが解除される", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("対応者"), "田中");
    await user.click(screen.getByLabelText("未着手のみ"));

    expect(
      (screen.getByLabelText("対応者") as HTMLSelectElement).value
    ).toBe("");
    expect(screen.getByText("商品破損の報告")).toBeTruthy();
    expect(screen.queryByText("追加発注のお願い")).toBeNull();
  });

  it("対応者行をクリックした後に未着手ヒーロー数値をクリックすると、対応者の絞り込みが解除される", async () => {
    const { container } = renderClient();
    const user = userEvent.setup();

    const rowLabel = screen
      .getAllByText("田中")
      .find((el) => el.tagName !== "OPTION")!;
    await user.click(rowLabel);
    expect(
      (screen.getByLabelText("対応者") as HTMLSelectElement).value
    ).toBe("田中");

    await user.click(container.querySelector(".text-5xl")!);

    expect(
      (screen.getByLabelText("対応者") as HTMLSelectElement).value
    ).toBe("");
    expect(
      (screen.getByLabelText("未着手のみ") as HTMLInputElement).checked
    ).toBe(true);
    expect(screen.getByText("商品破損の報告")).toBeTruthy();
    expect(screen.queryByText("追加発注のお願い")).toBeNull();
  });

  it("再現シナリオ: 未着手のみを選んだ状態で未解決のみを独立にOFFにすると、未着手のみも解除される（KPIと一覧件数の不整合を防ぐ）", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("未着手のみ"));
    expect(
      (screen.getByLabelText("未解決のみ") as HTMLInputElement).checked
    ).toBe(true);

    await user.click(screen.getByLabelText("未解決のみ"));

    expect(
      (screen.getByLabelText("未着手のみ") as HTMLInputElement).checked
    ).toBe(false);
    expect(
      (screen.getByLabelText("未解決のみ") as HTMLInputElement).checked
    ).toBe(false);
    expect(screen.getByText("商品破損の報告")).toBeTruthy();
    expect(screen.getByText("追加発注のお願い")).toBeTruthy();
    expect(screen.getByText("解決済みの問い合わせ")).toBeTruthy();
  });

  it("再現シナリオ: 未解決のみOFFの状態で滞留時間を選ぶと、未解決のみが自動的にONになる", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("滞留時間"), "over24h");

    expect(
      (screen.getByLabelText("未解決のみ") as HTMLInputElement).checked
    ).toBe(true);
  });

  it("再現シナリオ: 滞留時間が有効な状態で対応状況を解決済みに変更すると、対応状況が優先され滞留時間・未解決のみが解除される", async () => {
    renderClient();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("滞留時間"), "over24h");
    await user.selectOptions(screen.getByLabelText("対応状況"), "resolved");

    expect(
      (screen.getByLabelText("未解決のみ") as HTMLInputElement).checked
    ).toBe(false);
    expect((screen.getByLabelText("滞留時間") as HTMLSelectElement).value).toBe(
      ""
    );
    expect(screen.getByText("解決済みの問い合わせ")).toBeTruthy();
  });
});
