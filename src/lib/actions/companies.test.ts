import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/company-service", () => ({
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  isCompanyCodeTaken: vi.fn(),
  createCompaniesBulk: vi.fn(),
  findExistingCompanyCodes: vi.fn(),
  deactivateApplicantUsersByCompanies: vi.fn(),
}));

const requireHelpdeskAdminSessionMock = vi.fn();
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: (...args: unknown[]) =>
    requireHelpdeskAdminSessionMock(...args),
}));

import { revalidatePath } from "next/cache";
import {
  createCompaniesBulk,
  createCompany,
  deactivateApplicantUsersByCompanies,
  findExistingCompanyCodes,
  isCompanyCodeTaken,
  updateCompany,
} from "@/lib/server/company-service";
import {
  checkCompanyCodeAvailabilityAction,
  createCompanyAction,
  deactivateCompaniesApplicantUsersAction,
  importCompaniesAction,
  updateCompanyAction,
} from "@/lib/actions/companies";
import type { Company, CreateCompanyInput } from "@/types/company";

function buildInput(overrides: Partial<CreateCompanyInput> = {}): CreateCompanyInput {
  return {
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "th-daiso-thailand",
    ...overrides,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "th-daiso-thailand",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireHelpdeskAdminSessionMock.mockResolvedValue({
    claims: { id: "staff-1", role: "helpdesk", staffId: "staff-1" },
  });
});

describe("createCompanyAction", () => {
  it("有効な入力・重複無しで会社を作成し、ルートを再検証する", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(false);
    vi.mocked(createCompany).mockResolvedValue(company());

    const result = await createCompanyAction(buildInput());

    expect(isCompanyCodeTaken).toHaveBeenCalledWith("th-daiso-thailand");
    expect(createCompany).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, company: { id: "company-1" } });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("会社名が空の不正な入力は例外になり、保存されない", async () => {
    await expect(createCompanyAction(buildInput({ name: "" }))).rejects.toThrow();

    expect(createCompany).not.toHaveBeenCalled();
  });

  it("販社コードが重複するとき例外ではなくreason:companyCodeTakenを返し、保存されない", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(true);

    await expect(createCompanyAction(buildInput())).resolves.toEqual({
      ok: false,
      reason: "companyCodeTaken",
    });
    expect(createCompany).not.toHaveBeenCalled();
  });
});

describe("updateCompanyAction", () => {
  it("既存会社を更新し、ルートを再検証する", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(false);
    vi.mocked(updateCompany).mockResolvedValue(company({ name: "更新後" }));

    const result = await updateCompanyAction(
      "company-1",
      buildInput({ name: "更新後" })
    );

    expect(isCompanyCodeTaken).toHaveBeenCalledWith("th-daiso-thailand", "company-1");
    expect(updateCompany).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ name: "更新後" })
    );
    expect(result).toMatchObject({ ok: true, company: { name: "更新後" } });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(
      updateCompanyAction("company-1", buildInput({ country: "" }))
    ).rejects.toThrow();

    expect(updateCompany).not.toHaveBeenCalled();
  });

  it("自分自身以外との販社コードの重複は例外ではなくreason:companyCodeTakenを返し、保存されない", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(true);

    await expect(
      updateCompanyAction("company-1", buildInput())
    ).resolves.toEqual({ ok: false, reason: "companyCodeTaken" });
    expect(updateCompany).not.toHaveBeenCalled();
  });
});

describe("checkCompanyCodeAvailabilityAction", () => {
  it("既存の販社コードに対してisCompanyCodeTakenをそのまま呼び出す", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(true);

    const result = await checkCompanyCodeAvailabilityAction(
      "th-daiso-thailand"
    );

    expect(isCompanyCodeTaken).toHaveBeenCalledWith(
      "th-daiso-thailand",
      undefined
    );
    expect(result).toBe(true);
  });

  it("excludeCompanyIdを指定した場合、そのIDを除外して重複確認する（編集時の自コード除外）", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(false);

    const result = await checkCompanyCodeAvailabilityAction(
      "th-daiso-thailand",
      "company-1"
    );

    expect(isCompanyCodeTaken).toHaveBeenCalledWith(
      "th-daiso-thailand",
      "company-1"
    );
    expect(result).toBe(false);
  });

  it("前後の空白を除去して照会する", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(false);

    await checkCompanyCodeAvailabilityAction("  th-daiso-thailand  ");

    expect(isCompanyCodeTaken).toHaveBeenCalledWith(
      "th-daiso-thailand",
      undefined
    );
  });

  it("空文字列の場合はisCompanyCodeTakenを呼び出さずfalseを返す", async () => {
    const result = await checkCompanyCodeAvailabilityAction("   ");

    expect(isCompanyCodeTaken).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe("importCompaniesAction", () => {
  it("ファイル全体エラー（空ファイル等）で以降のサービス関数が呼ばれない場合でも、adminセッションを検証する（多層防御・要件19.13）", async () => {
    await importCompaniesAction("");

    expect(requireHelpdeskAdminSessionMock).toHaveBeenCalledTimes(1);
  });

  it("adminセッションが無い（memberを含む）場合は例外を送出し、CSVを処理しない（多層防御・要件19.13）", async () => {
    requireHelpdeskAdminSessionMock.mockRejectedValue(
      new Error("Helpdesk admin role required")
    );

    await expect(importCompaniesAction("")).rejects.toThrow(
      "Helpdesk admin role required"
    );
    expect(findExistingCompanyCodes).not.toHaveBeenCalled();
  });

  it("全行が検証を通過したとき、全件登録してcommitted:trueを返す（要件19.8, 19.9, 19.11）", async () => {
    vi.mocked(findExistingCompanyCodes).mockResolvedValue([]);
    vi.mocked(createCompaniesBulk).mockResolvedValue([
      company({ id: "1", name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" }),
      company({ id: "2", name: "Daiso Vietnam", country: "VN", companyCode: "vn-daiso-vietnam" }),
    ]);

    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
      "Daiso Vietnam,VN,vn-daiso-vietnam",
    ].join("\n");

    const result = await importCompaniesAction(csv);

    expect(createCompaniesBulk).toHaveBeenCalledWith([
      { name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" },
      { name: "Daiso Vietnam", country: "VN", companyCode: "vn-daiso-vietnam" },
    ]);
    expect(result.committed).toBe(true);
    expect(result.createdCount).toBe(2);
    expect(result.rows.every((row) => row.status === "ok")).toBe(true);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("1行でも検証エラーがあるとき、登録を行わずcommitted:falseで行別結果を返す（要件19.9）", async () => {
    vi.mocked(findExistingCompanyCodes).mockResolvedValue([]);

    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
      "Daiso Bad,XX,bad_code",
    ].join("\n");

    const result = await importCompaniesAction(csv);

    expect(createCompaniesBulk).not.toHaveBeenCalled();
    expect(result.committed).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].status).toBe("error");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("既存Companyと販社コードが重複する行があるとき、companyCodeDuplicateエラーで登録を行わない（要件19.7）", async () => {
    vi.mocked(findExistingCompanyCodes).mockResolvedValue(["th-daiso-thailand"]);

    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
    ].join("\n");

    const result = await importCompaniesAction(csv);

    expect(createCompaniesBulk).not.toHaveBeenCalled();
    expect(result.committed).toBe(false);
    expect(result.rows[0].errors).toContain("companyCodeDuplicate");
  });

  it("ヘッダー不一致・空ファイル等はfileErrorを返し登録を行わない（要件19.12）", async () => {
    const result = await importCompaniesAction("");

    expect(findExistingCompanyCodes).not.toHaveBeenCalled();
    expect(createCompaniesBulk).not.toHaveBeenCalled();
    expect(result.committed).toBe(false);
    expect(result.fileError).toBe("empty");
  });
});

describe("deactivateCompaniesApplicantUsersAction", () => {
  it("選択会社の一括無効化を実行し、ルートを再検証する（要件20.5, 20.7）", async () => {
    vi.mocked(deactivateApplicantUsersByCompanies).mockResolvedValue({
      deactivatedCount: 4,
    });

    const result = await deactivateCompaniesApplicantUsersAction([
      "company-1",
      "company-2",
    ]);

    expect(deactivateApplicantUsersByCompanies).toHaveBeenCalledWith([
      "company-1",
      "company-2",
    ]);
    expect(result).toEqual({ deactivatedCount: 4 });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("対象0件でもエラーとせず正常終了する（要件20.6）", async () => {
    vi.mocked(deactivateApplicantUsersByCompanies).mockResolvedValue({
      deactivatedCount: 0,
    });

    const result = await deactivateCompaniesApplicantUsersAction([]);

    expect(result).toEqual({ deactivatedCount: 0 });
  });
});
