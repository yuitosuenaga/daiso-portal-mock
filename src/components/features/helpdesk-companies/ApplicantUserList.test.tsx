import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/applicant-users", () => ({
  setApplicantUserActiveAction: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

import {
  ApplicantUserList,
  type ApplicantUserRowSummary,
} from "@/components/features/helpdesk-companies/ApplicantUserList";

const labels = {
  emptyMessage: "申請者アカウントが登録されていません",
  emailHeader: "メールアドレス",
  displayNameHeader: "表示名",
  statusHeader: "有効状態",
  activeStatusLabel: "有効",
  inactiveStatusLabel: "無効",
  editLinkLabel: "編集",
  deactivateButtonLabel: "無効化する",
  activateButtonLabel: "再有効化する",
  deactivateConfirmTitle: "アカウントの無効化",
  activateConfirmTitle: "アカウントの再有効化",
  deactivateConfirmButtonLabel: "無効化を実行",
  activateConfirmButtonLabel: "再有効化を実行",
  cancelButtonLabel: "キャンセル",
  toggleErrorMessage: "更新に失敗しました。時間を置いて再度お試しください。",
};

function applicantUser(
  overrides: Partial<ApplicantUserRowSummary> = {}
): ApplicantUserRowSummary {
  return {
    id: "applicant-1",
    email: "tanaka@example.com",
    displayName: "田中太郎",
    isActive: true,
    companyId: "company-1",
    createdAt: "2026-07-01T00:00:00.000Z",
    preferredLocale: "en",
    deactivateConfirmMessage: "『田中太郎』を無効化しますか？",
    activateConfirmMessage: "『田中太郎』を再有効化しますか？",
    ...overrides,
  };
}

describe("ApplicantUserList", () => {
  it("0件のとき空状態メッセージを表示する", () => {
    render(
      <ApplicantUserList companyId="company-1" applicantUsers={[]} {...labels} />
    );

    expect(
      screen.getByText("申請者アカウントが登録されていません")
    ).toBeTruthy();
  });

  it("各行にメールアドレス・表示名・有効状態・編集リンクを表示する", () => {
    render(
      <ApplicantUserList
        companyId="company-1"
        applicantUsers={[
          applicantUser({ id: "1", email: "a@example.com", isActive: true }),
          applicantUser({ id: "2", email: "b@example.com", isActive: false }),
        ]}
        {...labels}
      />
    );

    expect(screen.getByText("a@example.com")).toBeTruthy();
    expect(screen.getByText("b@example.com")).toBeTruthy();
    expect(screen.getAllByText("有効").length).toBeGreaterThan(0);
    expect(screen.getAllByText("無効").length).toBeGreaterThan(0);
    const editLinks = screen.getAllByRole("link", { name: "編集" });
    expect(editLinks[0].getAttribute("href")).toBe(
      "/helpdesk/companies/company-1/applicant-users/1/edit"
    );
  });
});
