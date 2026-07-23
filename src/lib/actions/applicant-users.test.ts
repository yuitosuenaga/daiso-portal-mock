import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
const { MockApplicantUserEmailTakenError } = vi.hoisted(() => {
  class MockApplicantUserEmailTakenError extends Error {
    constructor(email: string) {
      super(`Email already taken: ${email}`);
      this.name = "ApplicantUserEmailTakenError";
    }
  }
  return { MockApplicantUserEmailTakenError };
});

vi.mock("@/lib/server/applicant-user-service", () => ({
  ApplicantUserEmailTakenError: MockApplicantUserEmailTakenError,
  createApplicantUser: vi.fn(),
  updateApplicantUser: vi.fn(),
  setApplicantUserActive: vi.fn(),
  isApplicantUserEmailTaken: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  ApplicantUserEmailTakenError,
  createApplicantUser,
  isApplicantUserEmailTaken,
  setApplicantUserActive,
  updateApplicantUser,
} from "@/lib/server/applicant-user-service";
import {
  createApplicantUserAction,
  setApplicantUserActiveAction,
  updateApplicantUserAction,
} from "@/lib/actions/applicant-users";
import type { ApplicantUserSummary } from "@/types/applicant-user";

function applicantUser(
  overrides: Partial<ApplicantUserSummary> = {}
): ApplicantUserSummary {
  return {
    id: "applicant-1",
    email: "tanaka@example.com",
    displayName: "田中太郎",
    isActive: true,
    companyId: "company-1",
    createdAt: "2026-07-01T00:00:00.000Z",
    preferredLocale: "en",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createApplicantUserAction", () => {
  function buildInput(overrides: Record<string, unknown> = {}) {
    return {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "password123",
      preferredLocale: "en",
      ...overrides,
    };
  }

  it("有効な入力・重複無しでApplicantUserを作成し、ルートを再検証する", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(createApplicantUser).mockResolvedValue(applicantUser());

    const result = await createApplicantUserAction("company-1", buildInput());

    expect(isApplicantUserEmailTaken).toHaveBeenCalledWith("tanaka@example.com");
    expect(createApplicantUser).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ email: "tanaka@example.com", password: "password123" })
    );
    expect(result.id).toBe("applicant-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("preferredLocaleを未指定で送信した場合は既定値'en'として作成する", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(createApplicantUser).mockResolvedValue(applicantUser());

    const inputWithoutPreferredLocale = {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "password123",
    };

    await createApplicantUserAction(
      "company-1",
      inputWithoutPreferredLocale as never
    );

    expect(createApplicantUser).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ preferredLocale: "en" })
    );
  });

  it("preferredLocaleを指定した場合はその値で作成する", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(createApplicantUser).mockResolvedValue(applicantUser());

    await createApplicantUserAction(
      "company-1",
      buildInput({ preferredLocale: "th" })
    );

    expect(createApplicantUser).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ preferredLocale: "th" })
    );
  });

  it("メールアドレスが不正な入力は例外になり、保存されない", async () => {
    await expect(
      createApplicantUserAction("company-1", buildInput({ email: "invalid" }))
    ).rejects.toThrow();

    expect(createApplicantUser).not.toHaveBeenCalled();
  });

  it("パスワードが短すぎる入力は例外になり、保存されない", async () => {
    await expect(
      createApplicantUserAction("company-1", buildInput({ password: "short" }))
    ).rejects.toThrow();

    expect(createApplicantUser).not.toHaveBeenCalled();
  });

  it("メールアドレスが重複するとき例外になり、保存されない", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(true);

    await expect(
      createApplicantUserAction("company-1", buildInput())
    ).rejects.toThrow(ApplicantUserEmailTakenError);
    expect(createApplicantUser).not.toHaveBeenCalled();
  });
});

describe("updateApplicantUserAction", () => {
  it("パスワード入力ありで更新し、ルートを再検証する", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(updateApplicantUser).mockResolvedValue(applicantUser());

    await updateApplicantUserAction("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "newpassword123",
      preferredLocale: "en",
    });

    expect(isApplicantUserEmailTaken).toHaveBeenCalledWith(
      "tanaka@example.com",
      "applicant-1"
    );
    expect(updateApplicantUser).toHaveBeenCalledWith("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "newpassword123",
      preferredLocale: "en",
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("パスワード欄が空文字列のとき、passwordをundefinedとして更新する（既存ハッシュを保持）", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(updateApplicantUser).mockResolvedValue(applicantUser());

    await updateApplicantUserAction("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "",
      preferredLocale: "en",
    });

    expect(updateApplicantUser).toHaveBeenCalledWith("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: undefined,
      preferredLocale: "en",
    });
  });

  it("パスワード欄が空欄でもpreferredLocaleの変更は反映される", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(false);
    vi.mocked(updateApplicantUser).mockResolvedValue(applicantUser());

    await updateApplicantUserAction("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "",
      preferredLocale: "th",
    });

    expect(updateApplicantUser).toHaveBeenCalledWith("applicant-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: undefined,
      preferredLocale: "th",
    });
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(
      updateApplicantUserAction("applicant-1", {
        email: "",
        displayName: "田中太郎",
        preferredLocale: "en",
      })
    ).rejects.toThrow();

    expect(updateApplicantUser).not.toHaveBeenCalled();
  });

  it("自分自身以外とのメールアドレスの重複は例外になり、保存されない", async () => {
    vi.mocked(isApplicantUserEmailTaken).mockResolvedValue(true);

    await expect(
      updateApplicantUserAction("applicant-1", {
        email: "tanaka@example.com",
        displayName: "田中太郎",
        preferredLocale: "en",
      })
    ).rejects.toThrow(ApplicantUserEmailTakenError);
    expect(updateApplicantUser).not.toHaveBeenCalled();
  });
});

describe("setApplicantUserActiveAction", () => {
  it("有効状態を変更し、ルートを再検証する", async () => {
    vi.mocked(setApplicantUserActive).mockResolvedValue(
      applicantUser({ isActive: false })
    );

    const result = await setApplicantUserActiveAction("applicant-1", false);

    expect(setApplicantUserActive).toHaveBeenCalledWith("applicant-1", false);
    expect(result.isActive).toBe(false);
    expect(revalidatePath).toHaveBeenCalled();
  });
});
