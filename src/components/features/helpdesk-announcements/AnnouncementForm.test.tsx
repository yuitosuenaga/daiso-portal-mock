import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementForm } from "@/components/features/helpdesk-announcements/AnnouncementForm";

const createAnnouncementActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateAnnouncementActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/announcements", () => ({
  createAnnouncementAction: (...args: unknown[]) =>
    createAnnouncementActionMock(...args),
  updateAnnouncementAction: (...args: unknown[]) =>
    updateAnnouncementActionMock(...args),
}));

beforeEach(() => {
  createAnnouncementActionMock.mockClear();
  updateAnnouncementActionMock.mockClear();
  pushMock.mockClear();
});

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const labels = {
  titleLabel: "タイトル",
  titlePlaceholder: "タイトルを入力してください",
  bodyLabel: "本文",
  bodyPlaceholder: "本文を入力してください",
  categoryLabel: "種別",
  categoryPlaceholder: "種別を選択してください",
  targetingLabel: "配信対象",
  targetingAllOption: "全体一律",
  targetingCountriesOption: "特定の国・地域を指定",
  countriesLabel: "国・地域",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  countriesRequiredErrorMessage: "1つ以上の国・地域を選択してください",
  requiredIndicator: "必須",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
  categoryOptions: [
    { value: "maintenance", label: "メンテナンス" },
    { value: "policy", label: "制度変更" },
    { value: "incident", label: "障害情報" },
    { value: "other", label: "その他" },
  ],
  countryOptions: [
    { value: "JP", label: "日本" },
    { value: "US", label: "アメリカ合衆国" },
    { value: "VN", label: "ベトナム" },
  ],
};

describe("AnnouncementForm", () => {
  it("必須項目が未入力のまま送信するとcreateAnnouncementActionが呼ばれない", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getAllByText("この項目は必須です").length).toBeGreaterThan(0);
    });
    expect(createAnnouncementActionMock).not.toHaveBeenCalled();
  });

  it("全体一律を選択して入力済みで送信するとcreateAnnouncementActionが呼ばれ一覧へ遷移する", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規お知らせ" },
    });
    fireEvent.change(screen.getByLabelText(/本文/), {
      target: { value: "本文テキスト" },
    });
    fireEvent.change(screen.getByLabelText(/種別/), {
      target: { value: "maintenance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createAnnouncementActionMock).toHaveBeenCalledWith({
        title: "新規お知らせ",
        body: "本文テキスト",
        category: "maintenance",
        targeting: { scope: "all" },
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/announcements");
  });

  it("特定の国・地域を指定したまま0件選択で送信すると送信がブロックされる", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規お知らせ" },
    });
    fireEvent.change(screen.getByLabelText(/本文/), {
      target: { value: "本文テキスト" },
    });
    fireEvent.change(screen.getByLabelText(/種別/), {
      target: { value: "maintenance" },
    });
    fireEvent.change(screen.getByLabelText("配信対象"), {
      target: { value: "countries" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("1つ以上の国・地域を選択してください")
      ).toBeTruthy();
    });
    expect(createAnnouncementActionMock).not.toHaveBeenCalled();
  });

  it("特定の国・地域を1件以上選択して送信するとその内容でcreateAnnouncementActionが呼ばれる", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規お知らせ" },
    });
    fireEvent.change(screen.getByLabelText(/本文/), {
      target: { value: "本文テキスト" },
    });
    fireEvent.change(screen.getByLabelText(/種別/), {
      target: { value: "maintenance" },
    });
    fireEvent.change(screen.getByLabelText("配信対象"), {
      target: { value: "countries" },
    });

    const countriesSelect = screen.getByLabelText(
      /国・地域/
    ) as HTMLSelectElement;
    const vnOption = within(countriesSelect).getByRole("option", {
      name: "ベトナム",
    }) as HTMLOptionElement;
    const jpOption = within(countriesSelect).getByRole("option", {
      name: "日本",
    }) as HTMLOptionElement;
    vnOption.selected = true;
    jpOption.selected = true;
    fireEvent.change(countriesSelect);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createAnnouncementActionMock).toHaveBeenCalledWith({
        title: "新規お知らせ",
        body: "本文テキスト",
        category: "maintenance",
        targeting: { scope: "countries", countries: ["JP", "VN"] },
      });
    });
  });

  it("編集モードでは既存の値が初期表示され、更新時にupdateAnnouncementActionが呼ばれる", async () => {
    render(
      <AnnouncementForm
        mode="edit"
        announcementId="existing-id"
        defaultValues={{
          title: "既存タイトル",
          body: "既存本文",
          category: "policy",
          targeting: { scope: "all" },
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText(/タイトル/) as HTMLInputElement).value
    ).toBe("既存タイトル");

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "編集後タイトル" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateAnnouncementActionMock).toHaveBeenCalledWith(
        "existing-id",
        {
          title: "編集後タイトル",
          body: "既存本文",
          category: "policy",
          targeting: { scope: "all" },
        }
      );
    });
  });

  it("createAnnouncementActionが失敗した場合、エラーメッセージを表示し遷移しない", async () => {
    createAnnouncementActionMock.mockRejectedValueOnce(new Error("network error"));
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規お知らせ" },
    });
    fireEvent.change(screen.getByLabelText(/本文/), {
      target: { value: "本文テキスト" },
    });
    fireEvent.change(screen.getByLabelText(/種別/), {
      target: { value: "maintenance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("保存に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
