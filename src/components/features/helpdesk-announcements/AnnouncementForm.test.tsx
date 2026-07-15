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
  statusLabel: "公開状態",
  statusDraftOption: "下書き",
  statusPublishedOption: "公開",
  actionRequiredLabel: "対応要否",
  actionRequiredTrueOption: "対応が必要",
  actionRequiredFalseOption: "対応不要",
  targetingLabel: "配信対象",
  targetingAllOption: "全体一律",
  targetingCountriesOption: "特定の国・地域を指定",
  countriesLabel: "国・地域",
  publishStartDateLabel: "公開開始日",
  publishEndDateLabel: "公開終了日",
  publishPeriodHint: "未入力の場合は常時公開になります",
  publishEndDateBeforeStartErrorMessage: "終了日は開始日以降の日付を指定してください",
  dueDateLabel: "対応期限",
  dueDateRequiredErrorMessage: "対応が必要な場合は対応期限を入力してください",
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
  documentOptions: [],
  attachmentsLabel: "添付ファイル",
  attachmentsHint: "画像・PDF、1件5MBまで、最大5件",
  attachmentsRemoveButtonLabel: "削除",
  attachmentsSizeExceededMessage: "ファイルサイズが上限を超えています",
  attachmentsTypeNotAllowedMessage: "許可されていないファイル形式です",
  attachmentsCountExceededMessage: "添付できるファイル数の上限に達しました",
  attachmentsReadFailedMessage: "ファイルの読み込みに失敗しました",
  linkedDocumentsLabel: "ドキュメントの紐づけ",
  linkedDocumentsPickButtonLabel: "ドキュメントから選択",
  linkedDocumentsEmptyMessage: "紐づけられたドキュメントはありません",
  linkedDocumentRemoveButtonLabel: "削除",
  linkedDocumentsDialogTitle: "ドキュメントを選択",
  linkedDocumentsDialogConfirmLabel: "選択を確定",
  linkedDocumentsDialogCancelLabel: "キャンセル",
  linkedDocumentsDialogNoDocumentsMessage: "登録済みのドキュメントはありません",
  linkedDocumentsTargetingAllLabel: "全体公開",
  linkedDocumentsTargetingCountriesPrefixLabel: "対象国:",
  linkedDocumentsTargetingCompaniesPrefixLabel: "対象会社:",
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
        status: "draft",
        targeting: { scope: "all" },
        actionRequired: false,
        publishStartDate: null,
        publishEndDate: null,
        dueDate: null,
        attachments: [],
        linkedDocumentIds: [],
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/announcements");
  });

  it("公開状態の初期値は「下書き」であり、「公開」に変更して送信するとその内容で送信される", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    expect(
      (screen.getByLabelText("公開状態") as HTMLSelectElement).value
    ).toBe("draft");

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "新規お知らせ" },
    });
    fireEvent.change(screen.getByLabelText(/本文/), {
      target: { value: "本文テキスト" },
    });
    fireEvent.change(screen.getByLabelText(/種別/), {
      target: { value: "maintenance" },
    });
    fireEvent.change(screen.getByLabelText("公開状態"), {
      target: { value: "published" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createAnnouncementActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: "published" })
      );
    });
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
        status: "draft",
        targeting: { scope: "countries", countries: ["JP", "VN"] },
        actionRequired: false,
        publishStartDate: null,
        publishEndDate: null,
        dueDate: null,
        attachments: [],
        linkedDocumentIds: [],
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
          status: "published",
          targeting: { scope: "all" },
          actionRequired: false,
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
          status: "published",
          targeting: { scope: "all" },
          actionRequired: false,
          publishStartDate: null,
          publishEndDate: null,
          dueDate: null,
          attachments: [],
          linkedDocumentIds: [],
        }
      );
    });
  });

  it("編集モードで公開状態を「下書き」に変更して送信すると、その内容でupdateAnnouncementActionが呼ばれる", async () => {
    render(
      <AnnouncementForm
        mode="edit"
        announcementId="existing-id"
        defaultValues={{
          title: "既存タイトル",
          body: "既存本文",
          category: "policy",
          status: "published",
          targeting: { scope: "all" },
          actionRequired: false,
        }}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("公開状態"), {
      target: { value: "draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateAnnouncementActionMock).toHaveBeenCalledWith(
        "existing-id",
        expect.objectContaining({ status: "draft" })
      );
    });
  });

  it("対応要否を「対応が必要」にした状態で対応期限未入力のまま送信すると送信がブロックされる", async () => {
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
    fireEvent.change(screen.getByLabelText("対応要否"), {
      target: { value: "true" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("対応が必要な場合は対応期限を入力してください")
      ).toBeTruthy();
    });
    expect(createAnnouncementActionMock).not.toHaveBeenCalled();
  });

  it("対応要否を「対応不要」に変更すると対応期限欄が非表示になりクリアされる", async () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("対応要否"), {
      target: { value: "true" },
    });
    fireEvent.change(screen.getByLabelText(/対応期限/), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("対応要否"), {
      target: { value: "false" },
    });

    expect(screen.queryByLabelText(/対応期限/)).toBeNull();

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
      expect(createAnnouncementActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ actionRequired: false, dueDate: null })
      );
    });
  });

  it("公開終了日が公開開始日より前だと送信がブロックされる", async () => {
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
    fireEvent.change(screen.getByLabelText("公開開始日"), {
      target: { value: "2026-08-10" },
    });
    fireEvent.change(screen.getByLabelText("公開終了日"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("終了日は開始日以降の日付を指定してください")
      ).toBeTruthy();
    });
    expect(createAnnouncementActionMock).not.toHaveBeenCalled();
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
