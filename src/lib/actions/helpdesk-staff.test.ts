import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const loggerInfoMock = vi.fn();
vi.mock("@/lib/server/logger", () => ({
  logger: { info: (...a: unknown[]) => loggerInfoMock(...a) },
}));

const requireAdminMock = vi.fn();
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: (...a: unknown[]) => requireAdminMock(...a),
}));

vi.mock("@/lib/server/helpdesk-staff-service", () => {
  class StaffSelfOperationError extends Error {}
  class LastAdminError extends Error {}
  class HelpdeskStaffNotFoundError extends Error {}
  class StaffEmailTakenError extends Error {}
  return {
    StaffSelfOperationError,
    LastAdminError,
    HelpdeskStaffNotFoundError,
    StaffEmailTakenError,
    createHelpdeskStaff: vi.fn(),
    isStaffEmailTaken: vi.fn(),
    setHelpdeskStaffRole: vi.fn(),
    setHelpdeskStaffActive: vi.fn(),
  };
});

import { revalidatePath } from "next/cache";
import {
  HelpdeskStaffNotFoundError,
  LastAdminError,
  StaffEmailTakenError,
  StaffSelfOperationError,
  createHelpdeskStaff,
  isStaffEmailTaken,
  setHelpdeskStaffActive,
  setHelpdeskStaffRole,
} from "@/lib/server/helpdesk-staff-service";
import {
  createHelpdeskStaffAction,
  setHelpdeskStaffActiveAction,
  setHelpdeskStaffRoleAction,
} from "@/lib/actions/helpdesk-staff";
import type { HelpdeskStaffSummary } from "@/types/helpdesk-staff";

function summary(overrides: Partial<HelpdeskStaffSummary> = {}): HelpdeskStaffSummary {
  return {
    id: "t1",
    email: "t@example.com",
    displayName: "対象",
    role: "member",
    registrationSource: "manual",
    isActive: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const validInput = { email: "New@Example.com", displayName: "新規", password: "", role: "member" as const };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({ claims: { id: "op", role: "helpdesk", staffId: "op" } });
});

describe("admin ガード", () => {
  it("adminでなければzod parse・サービス呼び出しより前に例外で止まる", async () => {
    requireAdminMock.mockRejectedValue(new Error("Forbidden"));
    await expect(createHelpdeskStaffAction({ email: "bad" } as never)).rejects.toThrow("Forbidden");
    await expect(setHelpdeskStaffRoleAction("t1", "admin")).rejects.toThrow("Forbidden");
    await expect(setHelpdeskStaffActiveAction("t1", false)).rejects.toThrow("Forbidden");
    expect(isStaffEmailTaken).not.toHaveBeenCalled();
    expect(createHelpdeskStaff).not.toHaveBeenCalled();
    expect(setHelpdeskStaffRole).not.toHaveBeenCalled();
    expect(setHelpdeskStaffActive).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("createHelpdeskStaffAction", () => {
  it("メールを小文字化して重複検査し、作成後に一覧を再検証する", async () => {
    vi.mocked(isStaffEmailTaken).mockResolvedValue(false);
    vi.mocked(createHelpdeskStaff).mockResolvedValue(summary());
    const result = await createHelpdeskStaffAction(validInput);
    expect(isStaffEmailTaken).toHaveBeenCalledWith("new@example.com");
    expect(createHelpdeskStaff).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", role: "member" })
    );
    expect(result).toEqual({ ok: true, staff: summary() });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/helpdesk/staff", "page");
  });

  it("重複ならemailTakenを返し作成しない", async () => {
    vi.mocked(isStaffEmailTaken).mockResolvedValue(true);
    await expect(createHelpdeskStaffAction(validInput)).resolves.toEqual({
      ok: false,
      reason: "emailTaken",
    });
    expect(createHelpdeskStaff).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("作成時の一意制約違反(競合)もemailTakenに変換する", async () => {
    vi.mocked(isStaffEmailTaken).mockResolvedValue(false);
    vi.mocked(createHelpdeskStaff).mockRejectedValue(new StaffEmailTakenError());
    await expect(createHelpdeskStaffAction(validInput)).resolves.toEqual({
      ok: false,
      reason: "emailTaken",
    });
  });

  it("不正な入力は例外にする", async () => {
    await expect(createHelpdeskStaffAction({ ...validInput, email: "bad" })).rejects.toThrow();
    expect(createHelpdeskStaff).not.toHaveBeenCalled();
  });

  it("構造化ログにはstaffIdのみを出し、メールは出さない", async () => {
    vi.mocked(isStaffEmailTaken).mockResolvedValue(false);
    vi.mocked(createHelpdeskStaff).mockResolvedValue(summary());
    await createHelpdeskStaffAction(validInput);
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(loggerInfoMock.mock.calls[0]);
    expect(serialized).toContain("t1");
    expect(serialized).toContain("op");
    expect(serialized).not.toContain("example.com");
  });
});

describe.each([
  ["setHelpdeskStaffRoleAction", () => setHelpdeskStaffRoleAction("t1", "member"), setHelpdeskStaffRole],
  ["setHelpdeskStaffActiveAction", () => setHelpdeskStaffActiveAction("t1", false), setHelpdeskStaffActive],
] as const)("%s", (_name, run, service) => {
  it("成功時は更新結果を返して再検証し、ログを出す", async () => {
    vi.mocked(service as never as typeof setHelpdeskStaffRole).mockResolvedValue(summary());
    await expect(run()).resolves.toEqual({ ok: true, staff: summary() });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/helpdesk/staff", "page");
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new StaffSelfOperationError(), "self"],
    [new LastAdminError(), "lastAdmin"],
    [new HelpdeskStaffNotFoundError(), "notFound"],
  ])("%o は reason=%s に変換する", async (error, reason) => {
    vi.mocked(service as never as typeof setHelpdeskStaffRole).mockRejectedValue(error);
    await expect(run()).resolves.toEqual({ ok: false, reason });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("想定外の例外はそのまま送出する", async () => {
    vi.mocked(service as never as typeof setHelpdeskStaffRole).mockRejectedValue(new Error("db down"));
    await expect(run()).rejects.toThrow("db down");
  });
});
