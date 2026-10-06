import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementForm } from "@/components/features/helpdesk-announcements/AnnouncementForm";

const saveResult = (id: string) => ({
  announcement: { id },
  failedLocales: [] as string[],
  forcedDraft: false,
});
const createAnnouncementActionMock = vi.fn().mockResolvedValue(saveResult("new-id"));
const updateAnnouncementActionMock = vi.fn().mockResolvedValue(saveResult("existing-id"));
const pushMock = vi.fn();

vi.mock("@/lib/actions/applicant-users", () => ({
  searchApplicantUsersForTargetingAction: vi.fn().mockResolvedValue([]),
}));

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
  sendEmailNotificationLabel: "メール送信",
  sendEmailNotificationTrueOption: "メールを送信する",
  sendEmailNotificationFalseOption: "メールを送信しない",
  targetingLabel: "配信対象",
  targetingAllOption: "全体一律",
  targetingCountriesOption: "特定の国・地域を指定",
  targetingUsersOption: "個人を指定",
  usersLabel: "配信対象の個人",
  usersLabels: {
    groupLabel: "配信対象の個人",
    searchPlaceholder: "氏名・メールアドレス・会社名で検索",
    searchHint: "検索語を入力すると候補が表示されます",
    noResultsMessage: "該当するユーザーがいません",
    searchErrorMessage: "検索に失敗しました",
    selectedCountLabel: "{count}名選択中",
    removeChipButtonLabel: "削除",
    alreadySelectedLabel: "選択済み",
    searchingLabel: "検索中",
    resultsCountLabel: "{count}件見つかりました",
    unavailableLabel: "利用不可",
  },
  usersRequiredErrorMessage: "配信対象の個人を1名以上選択してください",
  usersUnavailableErrorMessage: "選択した個人は配信対象にできません",
  countriesLabel: "国・地域",
  countriesSearchPlaceholder: "国名で検索",
  countriesSelectAllButtonLabel: "すべて選択",
  countriesClearAllButtonLabel: "選択をすべて解除",
  countriesSelectedCountLabel: "{count}件選択中",
  countriesNoResultsMessage: "該当する国・地域がありません",
  countriesRemoveChipButtonLabel: "削除",
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
  translationFailedDraftMessage: "翻訳に失敗したため下書きとして保存しました",
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
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
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
        sendEmailNotification: false,
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

    fireEvent.click(screen.getByRole("checkbox", { name: "日本" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ベトナム" }));

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createAnnouncementActionMock).toHaveBeenCalledWith({
        title: "新規お知らせ",
        body: "本文テキスト",
        category: "maintenance",
        status: "draft",
        targeting: { scope: "countries", countries: ["JP", "VN"] },
        actionRequired: false,
        sendEmailNotification: false,
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
          sendEmailNotification: false,
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
          sendEmailNotification: false,
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
          sendEmailNotification: false,
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

  it("直接アップロードのPDF添付はPdfViewerでプレビュー表示され、画像添付は表示されない", async () => {
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
          sendEmailNotification: false,
          attachments: [
            {
              id: "attachment-pdf",
              fileName: "manual.pdf",
              fileType: "application/pdf",
              fileSize: 1024,
              dataUrl: "data:application/pdf;base64,AAAA",
            },
            {
              id: "attachment-image",
              fileName: "photo.png",
              fileType: "image/png",
              fileSize: 2048,
              dataUrl: "data:image/png;base64,BBBB",
            },
          ],
        }}
        {...labels}
      />
    );

    const iframe = screen.getByTitle("manual.pdf");
    expect(iframe.getAttribute("src")).toBe("data:application/pdf;base64,AAAA");
    expect(screen.queryByTitle("photo.png")).toBeNull();
  });

  it("紐づけドキュメントはPdfViewerでプレビュー表示される", async () => {
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
          sendEmailNotification: false,
          linkedDocumentIds: ["document-1"],
        }}
        {...labels}
        documentOptions={[
          {
            id: "document-1",
            title: "紐づけドキュメント",
            sourceType: "upload",
            status: "published",
            fileName: "linked.pdf",
            fileType: "application/pdf",
            fileSize: 4096,
            dataUrl: "data:application/pdf;base64,CCCC",
            targeting: { scope: "all" },
            uploadedAt: "2026-07-01T00:00:00.000Z",
            translations: [],
            categoryId: null,
            subCategoryId: null,
          },
        ]}
      />
    );

    const iframe = screen.getByTitle("紐づけドキュメント");
    expect(iframe.getAttribute("src")).toBe("data:application/pdf;base64,CCCC");
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

  it("個人指定の対象が全て無効で保存が拒否された場合、専用のエラーを表示し遷移しない", async () => {
    updateAnnouncementActionMock.mockResolvedValueOnce({ error: "targetUsersUnavailable" });
    render(
      <AnnouncementForm
        mode="edit"
        announcementId="existing-id"
        defaultValues={{
          title: "既存タイトル",
          body: "既存本文",
          category: "policy",
          status: "published",
          targeting: { scope: "users", userIds: ["u1"] },
          actionRequired: false,
          sendEmailNotification: false,
        }}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getByText("選択した個人は配信対象にできません")).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("翻訳失敗で下書き保存された場合、編集モードでは通知文言を表示し一覧へ遷移しない", async () => {
    updateAnnouncementActionMock.mockResolvedValueOnce({
      announcement: { id: "existing-id" },
      failedLocales: ["en"],
      forcedDraft: true,
    });
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
          sendEmailNotification: false,
        }}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getByText("翻訳に失敗したため下書きとして保存しました")).toBeTruthy();
    });
    expect((screen.getByLabelText("公開状態") as HTMLSelectElement).value).toBe("draft");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("翻訳失敗で下書き保存された場合、作成モードでは編集画面へ遷移する", async () => {
    createAnnouncementActionMock.mockResolvedValueOnce({
      announcement: { id: "created-id" },
      failedLocales: ["en"],
      forcedDraft: true,
    });
    render(<AnnouncementForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText(/タイトル/), { target: { value: "新規お知らせ" } });
    fireEvent.change(screen.getByLabelText(/本文/), { target: { value: "本文テキスト" } });
    fireEvent.change(screen.getByLabelText(/種別/), { target: { value: "maintenance" } });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/helpdesk/announcements/created-id/edit?translationFailed=1"
      );
    });
  });

  it("言語タブ・英語入力欄は表示されない（日本語のみ入力）", () => {
    render(<AnnouncementForm mode="create" {...labels} />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getAllByLabelText(/タイトル/)).toHaveLength(1);
  });
});
