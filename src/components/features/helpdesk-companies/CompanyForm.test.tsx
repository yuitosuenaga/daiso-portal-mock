import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyForm } from "@/components/features/helpdesk-companies/CompanyForm";

const createCompanyActionMock = vi.fn();
const updateCompanyActionMock = vi.fn();
const checkCompanyCodeAvailabilityActionMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/actions/companies", () => ({
  createCompanyAction: (...args: unknown[]) => createCompanyActionMock(...args),
  updateCompanyAction: (...args: unknown[]) => updateCompanyActionMock(...args),
  checkCompanyCodeAvailabilityAction: (...args: unknown[]) =>
    checkCompanyCodeAvailabilityActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createCompanyActionMock.mockReset();
  updateCompanyActionMock.mockReset();
  checkCompanyCodeAvailabilityActionMock.mockReset();
  checkCompanyCodeAvailabilityActionMock.mockResolvedValue(false);
  pushMock.mockClear();
});

const countryOptions = [
  { value: "JP", label: "日本" },
  { value: "TH", label: "タイ" },
];

const labels = {
  countryOptions,
  nameLabel: "会社名",
  namePlaceholder: "会社名を入力してください",
  countryLabel: "国",
  countryPlaceholder: "国を選択してください",
  companyCodeLabel: "販社コード",
  companyCodePlaceholder: "vn-daiso-vietnam",
  companyCodeHelpText:
    "半角英小文字・数字・ハイフンのみで入力してください（例: vn-daiso-vietnam）",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  companyCodeFormatErrorMessage: "販社コードの形式が正しくありません",
  companyCodeDuplicateMessage: "この販社コードは既に使用されています",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
};

describe("CompanyForm", () => {
  it("必須項目が未入力のまま送信するとcreateCompanyActionが呼ばれない", async () => {
    render(<CompanyForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getAllByText("この項目は必須です").length).toBeGreaterThan(0);
    });
    expect(createCompanyActionMock).not.toHaveBeenCalled();
  });

  it("入力済みで送信するとcreateCompanyActionが呼ばれ詳細画面へ遷移する", async () => {
    createCompanyActionMock.mockResolvedValue({ id: "company-1" });
    render(<CompanyForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("会社名"), {
      target: { value: "Daiso Thailand" },
    });
    fireEvent.change(screen.getByLabelText("国"), {
      target: { value: "TH" },
    });
    fireEvent.change(screen.getByLabelText("販社コード"), {
      target: { value: "th-daiso-thailand" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createCompanyActionMock).toHaveBeenCalledWith({
        name: "Daiso Thailand",
        country: "TH",
        companyCode: "th-daiso-thailand",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/companies/company-1");
  });

  it("販社コード重複エラーはcompanyCodeフィールドに表示される", async () => {
    createCompanyActionMock.mockRejectedValue(
      new Error("Company code already taken: th-daiso-thailand")
    );
    render(<CompanyForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("会社名"), {
      target: { value: "Daiso Thailand" },
    });
    fireEvent.change(screen.getByLabelText("国"), {
      target: { value: "TH" },
    });
    fireEvent.change(screen.getByLabelText("販社コード"), {
      target: { value: "th-daiso-thailand" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("この販社コードは既に使用されています")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("その他の保存エラーは汎用の送信エラーメッセージを表示し、入力内容を保持する", async () => {
    createCompanyActionMock.mockRejectedValue(new Error("network error"));
    render(<CompanyForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("会社名"), {
      target: { value: "Daiso Thailand" },
    });
    fireEvent.change(screen.getByLabelText("国"), {
      target: { value: "TH" },
    });
    fireEvent.change(screen.getByLabelText("販社コード"), {
      target: { value: "th-daiso-thailand" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("保存に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(
      (screen.getByLabelText("会社名") as HTMLInputElement).value
    ).toBe("Daiso Thailand");
  });

  it("編集モードでは既存の値が初期表示され、更新時にupdateCompanyActionが呼ばれる", async () => {
    updateCompanyActionMock.mockResolvedValue({ id: "company-1" });
    render(
      <CompanyForm
        mode="edit"
        companyId="company-1"
        defaultValues={{
          name: "編集前の会社名",
          country: "JP",
          companyCode: "jp-daiso-japan",
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("会社名") as HTMLInputElement).value
    ).toBe("編集前の会社名");

    fireEvent.change(screen.getByLabelText("会社名"), {
      target: { value: "編集後の会社名" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateCompanyActionMock).toHaveBeenCalledWith("company-1", {
        name: "編集後の会社名",
        country: "JP",
        companyCode: "jp-daiso-japan",
      });
    });
  });

  describe("販社コード入力ガイドと重複チェック（要件18）", () => {
    it("販社コード欄付近にヘルプテキストを表示する", () => {
      render(<CompanyForm mode="create" {...labels} />);

      expect(
        screen.getByText(
          "半角英小文字・数字・ハイフンのみで入力してください（例: vn-daiso-vietnam）"
        )
      ).toBeTruthy();
    });

    it("販社コードの形式が不正な場合、フォーマットエラーメッセージを表示し送信しない", async () => {
      render(<CompanyForm mode="create" {...labels} />);

      fireEvent.change(screen.getByLabelText("会社名"), {
        target: { value: "Daiso Thailand" },
      });
      fireEvent.change(screen.getByLabelText("国"), {
        target: { value: "TH" },
      });
      fireEvent.change(screen.getByLabelText("販社コード"), {
        target: { value: "TH_001" },
      });
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));

      await waitFor(() => {
        expect(screen.getByText("販社コードの形式が正しくありません")).toBeTruthy();
      });
      expect(createCompanyActionMock).not.toHaveBeenCalled();
    });

    it("blur時に販社コードの重複が検知された場合、送信前に警告を表示する", async () => {
      checkCompanyCodeAvailabilityActionMock.mockResolvedValue(true);
      render(<CompanyForm mode="create" {...labels} />);

      const companyCodeInput = screen.getByLabelText("販社コード");
      fireEvent.change(companyCodeInput, {
        target: { value: "th-daiso-thailand" },
      });
      fireEvent.blur(companyCodeInput);

      await waitFor(() => {
        expect(
          screen.getByText("この販社コードは既に使用されています")
        ).toBeTruthy();
      });
      expect(checkCompanyCodeAvailabilityActionMock).toHaveBeenCalledWith(
        "th-daiso-thailand",
        undefined
      );
    });

    it("blur時に未入力・フォーマット不正な値では重複照会を行わない", async () => {
      render(<CompanyForm mode="create" {...labels} />);

      const input = screen.getByLabelText("販社コード");
      fireEvent.change(input, { target: { value: "TH_001" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(checkCompanyCodeAvailabilityActionMock).not.toHaveBeenCalled();
      });
    });

    it("blur時の重複照会が競合した場合、後から届いた古い応答ではなく最新入力の結果を反映する", async () => {
      let resolveStaleCheck: (isTaken: boolean) => void = () => {};
      const staleCheck = new Promise<boolean>((resolve) => {
        resolveStaleCheck = resolve;
      });
      checkCompanyCodeAvailabilityActionMock
        .mockImplementationOnce(() => staleCheck)
        .mockImplementationOnce(async () => false);

      render(<CompanyForm mode="create" {...labels} />);
      const input = screen.getByLabelText("販社コード");

      // 1回目のblur（応答が遅れる、後から重複ありと判定される想定）
      fireEvent.change(input, { target: { value: "th-daiso-thailand" } });
      fireEvent.blur(input);

      // ユーザーがすぐに値を変更し、2回目のblur（応答は即座に重複なしと判定）
      fireEvent.change(input, { target: { value: "vn-daiso-vietnam" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(checkCompanyCodeAvailabilityActionMock).toHaveBeenCalledTimes(2);
      });

      // 2回目（最新）の応答時点ではエラーは表示されない
      expect(
        screen.queryByText("この販社コードは既に使用されています")
      ).toBeNull();

      // 1回目（古い）の応答が今頃届いても、最新の判定結果を上書きしない
      await act(async () => {
        resolveStaleCheck(true);
        await Promise.resolve();
      });

      expect(
        screen.queryByText("この販社コードは既に使用されています")
      ).toBeNull();
    });

    it("編集モードではblur時の重複照会に自社のcompanyIdを除外対象として渡す", async () => {
      render(
        <CompanyForm
          mode="edit"
          companyId="company-1"
          defaultValues={{
            name: "編集前の会社名",
            country: "JP",
            companyCode: "jp-daiso-japan",
          }}
          {...labels}
        />
      );

      const input = screen.getByLabelText("販社コード");
      fireEvent.blur(input);

      await waitFor(() => {
        expect(checkCompanyCodeAvailabilityActionMock).toHaveBeenCalledWith(
          "jp-daiso-japan",
          "company-1"
        );
      });
    });
  });
});
