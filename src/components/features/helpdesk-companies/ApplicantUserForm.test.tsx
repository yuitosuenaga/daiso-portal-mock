import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicantUserForm } from "@/components/features/helpdesk-companies/ApplicantUserForm";

const createApplicantUserActionMock = vi.fn();
const updateApplicantUserActionMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/actions/applicant-users", () => ({
  createApplicantUserAction: (...args: unknown[]) =>
    createApplicantUserActionMock(...args),
  updateApplicantUserAction: (...args: unknown[]) =>
    updateApplicantUserActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createApplicantUserActionMock.mockReset();
  updateApplicantUserActionMock.mockReset();
  pushMock.mockClear();
});

const preferredLocaleOptions = [
  { value: "en", label: "英語" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中国語" },
  { value: "ko", label: "韓国語" },
  { value: "th", label: "タイ語" },
  { value: "vi", label: "ベトナム語" },
  { value: "id", label: "インドネシア語" },
  { value: "ms", label: "マレー語" },
  { value: "tl", label: "タガログ語" },
];

const labels = {
  companyId: "company-1",
  emailLabel: "メールアドレス",
  emailPlaceholder: "メールアドレスを入力してください",
  displayNameLabel: "表示名",
  displayNamePlaceholder: "表示名を入力してください",
  passwordLabel: "パスワード",
  passwordPlaceholder: "パスワードを入力してください",
  passwordHint: "空欄のまま保存すると、既存のパスワードは変更されません。",
  preferredLocaleLabel: "通知言語",
  preferredLocaleOptions,
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  emailInvalidMessage: "有効なメールアドレスを入力してください",
  emailDuplicateMessage: "このメールアドレスは既に使用されています",
  passwordTooShortMessage: "パスワードは8文字以上で入力してください",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
};

describe("ApplicantUserForm（新規作成モード）", () => {
  it("必須項目が未入力のまま送信するとcreateApplicantUserActionが呼ばれない", async () => {
    render(<ApplicantUserForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("有効なメールアドレスを入力してください")
      ).toBeTruthy();
    });
    expect(createApplicantUserActionMock).not.toHaveBeenCalled();
  });

  it("パスワードが短すぎる場合はエラーになり送信されない", async () => {
    render(<ApplicantUserForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "tanaka@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "田中太郎" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("パスワードは8文字以上で入力してください")
      ).toBeTruthy();
    });
    expect(createApplicantUserActionMock).not.toHaveBeenCalled();
  });

  it("入力済みで送信するとcreateApplicantUserActionが呼ばれ会社詳細へ遷移する", async () => {
    createApplicantUserActionMock.mockResolvedValue({ id: "applicant-1" });
    render(<ApplicantUserForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "tanaka@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "田中太郎" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createApplicantUserActionMock).toHaveBeenCalledWith("company-1", {
        email: "tanaka@example.com",
        displayName: "田中太郎",
        password: "password123",
        preferredLocale: "en",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/companies/company-1");
  });

  it("通知言語プルダウンが定数から生成した選択肢とともに表示される", () => {
    render(<ApplicantUserForm mode="create" {...labels} />);

    const select = screen.getByLabelText("通知言語") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((option) => option.value);

    expect(optionValues).toEqual([
      "en",
      "ja",
      "zh",
      "ko",
      "th",
      "vi",
      "id",
      "ms",
      "tl",
    ]);
    expect(select.value).toBe("en");
  });

  it("通知言語を選択して送信するとcreateApplicantUserActionに選択値が渡される", async () => {
    createApplicantUserActionMock.mockResolvedValue({ id: "applicant-1" });
    render(<ApplicantUserForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "tanaka@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "田中太郎" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("通知言語"), {
      target: { value: "th" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createApplicantUserActionMock).toHaveBeenCalledWith("company-1", {
        email: "tanaka@example.com",
        displayName: "田中太郎",
        password: "password123",
        preferredLocale: "th",
      });
    });
  });

  it("メールアドレス重複エラーはemailフィールドに表示される", async () => {
    createApplicantUserActionMock.mockRejectedValue(
      new Error("Email already taken: tanaka@example.com")
    );
    render(<ApplicantUserForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "tanaka@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "田中太郎" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("このメールアドレスは既に使用されています")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
    // 保存失敗時もメールアドレス・表示名は保持するが、パスワードの平文は
    // フォーム上に残さない（要件5.9・タスク17）。
    expect(
      (screen.getByLabelText("メールアドレス") as HTMLInputElement).value
    ).toBe("tanaka@example.com");
    expect(
      (screen.getByLabelText("表示名") as HTMLInputElement).value
    ).toBe("田中太郎");
    expect(
      (screen.getByLabelText("パスワード") as HTMLInputElement).value
    ).toBe("");
  });
});

describe("ApplicantUserForm（編集モード）", () => {
  it("既存の値が初期表示され、パスワード空欄での更新時にpasswordが送信されない", async () => {
    updateApplicantUserActionMock.mockResolvedValue({ id: "applicant-1" });
    render(
      <ApplicantUserForm
        mode="edit"
        applicantUserId="applicant-1"
        defaultValues={{ email: "tanaka@example.com", displayName: "田中太郎" }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("メールアドレス") as HTMLInputElement).value
    ).toBe("tanaka@example.com");
    expect(
      (screen.getByLabelText("パスワード") as HTMLInputElement).value
    ).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateApplicantUserActionMock).toHaveBeenCalledWith(
        "applicant-1",
        {
          email: "tanaka@example.com",
          displayName: "田中太郎",
          password: "",
          preferredLocale: "en",
        }
      );
    });
  });

  it("パスワードに入力がある場合は更新データに含まれる", async () => {
    updateApplicantUserActionMock.mockResolvedValue({ id: "applicant-1" });
    render(
      <ApplicantUserForm
        mode="edit"
        applicantUserId="applicant-1"
        defaultValues={{ email: "tanaka@example.com", displayName: "田中太郎" }}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateApplicantUserActionMock).toHaveBeenCalledWith(
        "applicant-1",
        {
          email: "tanaka@example.com",
          displayName: "田中太郎",
          password: "newpassword123",
          preferredLocale: "en",
        }
      );
    });
  });

  it("編集モードでは対象アカウントの現在のpreferredLocaleが初期選択される", () => {
    render(
      <ApplicantUserForm
        mode="edit"
        applicantUserId="applicant-1"
        defaultValues={{
          email: "tanaka@example.com",
          displayName: "田中太郎",
          preferredLocale: "th",
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("通知言語") as HTMLSelectElement).value
    ).toBe("th");
  });

  it("編集モードで通知言語を変更して保存すると更新データに新しい値が含まれる", async () => {
    updateApplicantUserActionMock.mockResolvedValue({ id: "applicant-1" });
    render(
      <ApplicantUserForm
        mode="edit"
        applicantUserId="applicant-1"
        defaultValues={{
          email: "tanaka@example.com",
          displayName: "田中太郎",
          preferredLocale: "en",
        }}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("通知言語"), {
      target: { value: "vi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateApplicantUserActionMock).toHaveBeenCalledWith(
        "applicant-1",
        {
          email: "tanaka@example.com",
          displayName: "田中太郎",
          password: "",
          preferredLocale: "vi",
        }
      );
    });
  });
});
