import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyManagementListClient } from "@/components/features/helpdesk-companies/CompanyManagementListClient";
import type { CompanyWithStats } from "@/types/company";

const deactivateCompaniesApplicantUsersActionMock = vi.fn();

vi.mock("@/lib/actions/companies", () => ({
  deactivateCompaniesApplicantUsersAction: (...args: unknown[]) =>
    deactivateCompaniesApplicantUsersActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function company(overrides: Partial<CompanyWithStats> = {}): CompanyWithStats {
  return {
    id: "company-1",
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "th-daiso-thailand",
    createdAt: "2026-07-01T00:00:00.000Z",
    applicantUserCount: 3,
    activeApplicantUserCount: 2,
    ...overrides,
  };
}

const baseProps = {
  countryLabels: { TH: "タイ", VN: "ベトナム" },
  locale: "ja",
  searchLabel: "会社名・販社コードで検索",
  searchPlaceholder: "会社名または販社コードを入力してください",
  nameHeader: "会社名",
  countryHeader: "国",
  companyCodeHeader: "販社コード",
  applicantUserCountHeader: "申請者アカウント数",
  detailLink: "詳細",
  noResultsMessage: "該当する販社がありません",
  selectAllLabel: "全て選択",
  selectRowLabelTemplate: "{name}を選択",
  selectedCountTemplate: "{count}社を選択中",
  bulkDeactivateButtonLabel: "選択した販社を一括無効化",
  confirmTitle: "販社の一括無効化",
  confirmMessageTemplate:
    "選択した{companyCount}社に所属する、有効な申請者アカウント合計{userCount}件を無効化します。よろしいですか？",
  confirmButtonLabel: "一括無効化を実行",
  cancelButtonLabel: "キャンセル",
  successMessageTemplate: "{count}件の申請者アカウントを無効化しました",
  errorMessage: "一括無効化に失敗しました。時間を置いて再度お試しください。",
};

beforeEach(() => {
  deactivateCompaniesApplicantUsersActionMock.mockReset();
});

describe("CompanyManagementListClient", () => {
  it("初期表示では選択件数が0件で、一括無効化ボタンが無効化されている", () => {
    render(
      <CompanyManagementListClient
        companies={[company({ id: "1" }), company({ id: "2" })]}
        {...baseProps}
      />
    );

    expect(screen.getByText("0社を選択中")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "選択した販社を一括無効化",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("行のチェックボックスを選択すると選択件数が更新され、一括無効化ボタンが活性化する", () => {
    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand" }),
          company({ id: "2", name: "Daiso Vietnam" }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));

    expect(screen.getByText("1社を選択中")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "選択した販社を一括無効化",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it("全選択チェックボックスで全行が選択・解除される", () => {
    render(
      <CompanyManagementListClient
        companies={[company({ id: "1" }), company({ id: "2" })]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "全て選択" }));
    expect(screen.getByText("2社を選択中")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: "全て選択" }));
    expect(screen.getByText("0社を選択中")).toBeTruthy();
  });

  it("確認モーダルに選択会社数と有効な申請者アカウント合計件数を表示する（要件20.3, 20.4）", () => {
    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand", activeApplicantUserCount: 2 }),
          company({ id: "2", name: "Daiso Vietnam", activeApplicantUserCount: 3 }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Vietnamを選択" }));
    fireEvent.click(
      screen.getByRole("button", { name: "選択した販社を一括無効化" })
    );

    expect(
      screen.getByText(
        "選択した2社に所属する、有効な申請者アカウント合計5件を無効化します。よろしいですか？"
      )
    ).toBeTruthy();
  });

  it("選択後に検索絞り込みで対象会社が一覧から外れても、確認モーダルは選択件数を正しく維持する（誤操作防止・要件20.3, 20.4）", () => {
    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand", activeApplicantUserCount: 2 }),
          company({ id: "2", name: "Daiso Vietnam", activeApplicantUserCount: 3 }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));

    // 選択後に検索キーワードを入力し、選択済みの会社（Daiso Thailand）を一覧から除外する。
    fireEvent.change(screen.getByLabelText("会社名・販社コードで検索"), {
      target: { value: "Vietnam" },
    });

    // 表示上は絞り込まれていても、選択件数・一括無効化ボタンの活性状態は
    // 実際に無効化される対象（Daiso Thailand 1社）を正しく反映し続ける。
    expect(screen.getByText("1社を選択中")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "選択した販社を一括無効化",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "選択した販社を一括無効化" })
    );

    // 確認モーダルの本文も、一覧に表示されていない選択会社を含めて正しい件数を示す。
    expect(
      screen.getByText(
        "選択した1社に所属する、有効な申請者アカウント合計2件を無効化します。よろしいですか？"
      )
    ).toBeTruthy();
  });

  it("確認モーダルで確定すると、選択会社IDでactionを呼び出し、成功件数を表示して選択をクリアする（要件20.5, 20.7）", async () => {
    deactivateCompaniesApplicantUsersActionMock.mockResolvedValue({
      deactivatedCount: 5,
    });

    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand" }),
          company({ id: "2", name: "Daiso Vietnam" }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));
    fireEvent.click(
      screen.getByRole("button", { name: "選択した販社を一括無効化" })
    );
    fireEvent.click(screen.getByRole("button", { name: "一括無効化を実行" }));

    await waitFor(() => {
      expect(deactivateCompaniesApplicantUsersActionMock).toHaveBeenCalledWith(["1"]);
    });
    await waitFor(() => {
      expect(
        screen.getByText("5件の申請者アカウントを無効化しました")
      ).toBeTruthy();
    });
    expect(screen.getByText("0社を選択中")).toBeTruthy();
  });

  it("確認モーダルをキャンセルするとactionが呼ばれず、選択は維持される", () => {
    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand" }),
          company({ id: "2", name: "Daiso Vietnam" }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));
    fireEvent.click(
      screen.getByRole("button", { name: "選択した販社を一括無効化" })
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deactivateCompaniesApplicantUsersActionMock).not.toHaveBeenCalled();
    expect(screen.getByText("1社を選択中")).toBeTruthy();
  });

  it("action失敗時はエラーメッセージを表示し、選択を維持する", async () => {
    deactivateCompaniesApplicantUsersActionMock.mockRejectedValue(
      new Error("failed")
    );

    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand" }),
          company({ id: "2", name: "Daiso Vietnam" }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Daiso Thailandを選択" }));
    fireEvent.click(
      screen.getByRole("button", { name: "選択した販社を一括無効化" })
    );
    fireEvent.click(screen.getByRole("button", { name: "一括無効化を実行" }));

    await waitFor(() => {
      expect(
        screen.getByText("一括無効化に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(screen.getByText("1社を選択中")).toBeTruthy();
  });

  it("既存の検索絞り込みの挙動を損なわない（要件1.3・20.13）", () => {
    render(
      <CompanyManagementListClient
        companies={[
          company({ id: "1", name: "Daiso Thailand", companyCode: "th-daiso-thailand" }),
          company({ id: "2", name: "Daiso Vietnam", companyCode: "vn-daiso-vietnam" }),
        ]}
        {...baseProps}
      />
    );

    fireEvent.change(screen.getByLabelText("会社名・販社コードで検索"), {
      target: { value: "Vietnam" },
    });

    expect(screen.queryByText("Daiso Thailand")).toBeNull();
    expect(screen.getByText("Daiso Vietnam")).toBeTruthy();
  });
});
