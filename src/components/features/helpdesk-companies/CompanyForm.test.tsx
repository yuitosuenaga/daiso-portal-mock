import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyForm } from "@/components/features/helpdesk-companies/CompanyForm";

const createCompanyActionMock = vi.fn();
const updateCompanyActionMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/actions/companies", () => ({
  createCompanyAction: (...args: unknown[]) => createCompanyActionMock(...args),
  updateCompanyAction: (...args: unknown[]) => updateCompanyActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createCompanyActionMock.mockReset();
  updateCompanyActionMock.mockReset();
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
  companyCodePlaceholder: "販社コードを入力してください",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
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
      target: { value: "TH-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createCompanyActionMock).toHaveBeenCalledWith({
        name: "Daiso Thailand",
        country: "TH",
        companyCode: "TH-001",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/companies/company-1");
  });

  it("販社コード重複エラーはcompanyCodeフィールドに表示される", async () => {
    createCompanyActionMock.mockRejectedValue(
      new Error("Company code already taken: TH-001")
    );
    render(<CompanyForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("会社名"), {
      target: { value: "Daiso Thailand" },
    });
    fireEvent.change(screen.getByLabelText("国"), {
      target: { value: "TH" },
    });
    fireEvent.change(screen.getByLabelText("販社コード"), {
      target: { value: "TH-001" },
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
      target: { value: "TH-001" },
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
          companyCode: "JP-001",
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
        companyCode: "JP-001",
      });
    });
  });
});
