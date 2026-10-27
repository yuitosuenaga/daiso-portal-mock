import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffManagementListClient } from "@/components/features/helpdesk-staff/StaffManagementListClient";
import type { HelpdeskStaffSummary } from "@/types/helpdesk-staff";

vi.mock("@/lib/actions/helpdesk-staff", () => ({
  setHelpdeskStaffRoleAction: vi.fn(),
  setHelpdeskStaffActiveAction: vi.fn(),
}));

const toggleRole = {
  promoteButton: "管理者にする",
  demoteButton: "メンバーにする",
  promoteConfirmTitle: "t1",
  demoteConfirmTitle: "t2",
  promoteConfirm: "c1",
  demoteConfirm: "c2",
  promoteConfirmButton: "e1",
  demoteConfirmButton: "e2",
  cancelButton: "キャンセル",
};
const toggleActive = {
  deactivateButton: "無効化する",
  activateButton: "再有効化する",
  deactivateConfirmTitle: "t3",
  activateConfirmTitle: "t4",
  deactivateConfirm: "c3",
  activateConfirm: "c4",
  deactivateConfirmButton: "e3",
  activateConfirmButton: "e4",
  cancelButton: "キャンセル",
};

const props = {
  currentStaffId: "me",
  locale: "ja",
  headers: {
    email: "メールアドレス",
    displayName: "表示名",
    role: "ロール",
    source: "登録経路",
    status: "状態",
    created: "作成日",
    actions: "操作",
  },
  youBadge: "あなた",
  roleLabels: { admin: "管理者", member: "メンバー" },
  sourceLabels: { seed: "初期登録", manual: "手動登録", google_auto: "Google自動作成" },
  statusLabels: { active: "有効", inactive: "無効" },
  toggleRoleLabels: toggleRole,
  toggleActiveLabels: toggleActive,
  errors: { self: "s", lastAdmin: "l", notFound: "n", generic: "g" },
};

function staff(overrides: Partial<HelpdeskStaffSummary>): HelpdeskStaffSummary {
  return {
    id: "x",
    email: "x@example.com",
    displayName: "X",
    role: "member",
    registrationSource: "manual",
    isActive: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("StaffManagementListClient", () => {
  it("列見出しと各行のロール・登録経路・状態を表示する", () => {
    render(
      <StaffManagementListClient
        {...props}
        staff={[
          staff({ id: "a", email: "a@example.com", displayName: "A", role: "admin", registrationSource: "seed" }),
          staff({ id: "b", email: "b@example.com", displayName: "B", isActive: false, registrationSource: "google_auto" }),
        ]}
      />
    );
    for (const header of ["メールアドレス", "表示名", "ロール", "登録経路", "状態", "作成日"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    const rowA = screen.getByText("a@example.com").closest("tr")!;
    expect(within(rowA).getByText("管理者")).toBeTruthy();
    expect(within(rowA).getByText("初期登録")).toBeTruthy();
    expect(within(rowA).getByText("有効")).toBeTruthy();
    const rowB = screen.getByText("b@example.com").closest("tr")!;
    expect(within(rowB).getByText("Google自動作成")).toBeTruthy();
    expect(within(rowB).getByText("無効")).toBeTruthy();
    expect(within(rowB).getByRole("button", { name: "再有効化する" })).toBeTruthy();
  });

  it("自分の行は「あなた」を表示し、操作ボタンを無効にする", () => {
    render(
      <StaffManagementListClient
        {...props}
        staff={[
          staff({ id: "me", email: "me@example.com", displayName: "自分", role: "admin" }),
          staff({ id: "other", email: "o@example.com", displayName: "他人" }),
        ]}
      />
    );
    const mine = screen.getByText("me@example.com").closest("tr")!;
    expect(within(mine).getByText("あなた")).toBeTruthy();
    for (const name of ["メンバーにする", "無効化する"]) {
      expect((within(mine).getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    const other = screen.getByText("o@example.com").closest("tr")!;
    expect(within(other).queryByText("あなた")).toBeNull();
    for (const name of ["管理者にする", "無効化する"]) {
      expect((within(other).getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false);
    }
  });
});
