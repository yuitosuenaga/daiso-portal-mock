import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
const { MockCompanyCodeTakenError } = vi.hoisted(() => {
  class MockCompanyCodeTakenError extends Error {
    constructor(companyCode: string) {
      super(`Company code already taken: ${companyCode}`);
      this.name = "CompanyCodeTakenError";
    }
  }
  return { MockCompanyCodeTakenError };
});

vi.mock("@/lib/server/company-service", () => ({
  CompanyCodeTakenError: MockCompanyCodeTakenError,
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  isCompanyCodeTaken: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  CompanyCodeTakenError,
  createCompany,
  isCompanyCodeTaken,
  updateCompany,
} from "@/lib/server/company-service";
import { createCompanyAction, updateCompanyAction } from "@/lib/actions/companies";
import type { Company, CreateCompanyInput } from "@/types/company";

function buildInput(overrides: Partial<CreateCompanyInput> = {}): CreateCompanyInput {
  return {
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "TH-001",
    ...overrides,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "TH-001",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCompanyAction", () => {
  it("有効な入力・重複無しで会社を作成し、ルートを再検証する", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(false);
    vi.mocked(createCompany).mockResolvedValue(company());

    const result = await createCompanyAction(buildInput());

    expect(isCompanyCodeTaken).toHaveBeenCalledWith("TH-001");
    expect(createCompany).toHaveBeenCalled();
    expect(result.id).toBe("company-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("会社名が空の不正な入力は例外になり、保存されない", async () => {
    await expect(createCompanyAction(buildInput({ name: "" }))).rejects.toThrow();

    expect(createCompany).not.toHaveBeenCalled();
  });

  it("販社コードが重複するとき例外になり、保存されない", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(true);

    await expect(createCompanyAction(buildInput())).rejects.toThrow(
      CompanyCodeTakenError
    );
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

    expect(isCompanyCodeTaken).toHaveBeenCalledWith("TH-001", "company-1");
    expect(updateCompany).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ name: "更新後" })
    );
    expect(result.name).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(
      updateCompanyAction("company-1", buildInput({ country: "" }))
    ).rejects.toThrow();

    expect(updateCompany).not.toHaveBeenCalled();
  });

  it("自分自身以外との販社コードの重複は例外になり、保存されない", async () => {
    vi.mocked(isCompanyCodeTaken).mockResolvedValue(true);

    await expect(
      updateCompanyAction("company-1", buildInput())
    ).rejects.toThrow(CompanyCodeTakenError);
    expect(updateCompany).not.toHaveBeenCalled();
  });
});
