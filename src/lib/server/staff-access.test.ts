import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { helpdeskStaff: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/db/prisma";
import { getStaffAccess } from "@/lib/server/staff-access";

describe("getStaffAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isActiveとroleのみを照会して返す", async () => {
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({
      isActive: true,
      role: "admin",
    } as never);

    expect(await getStaffAccess("staff-1")).toEqual({ isActive: true, role: "admin" });
    expect(prisma.helpdeskStaff.findUnique).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      select: { isActive: true, role: true },
    });
  });

  it("行が存在しないときnullを返す", async () => {
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue(null);

    expect(await getStaffAccess("missing")).toBeNull();
  });
});
