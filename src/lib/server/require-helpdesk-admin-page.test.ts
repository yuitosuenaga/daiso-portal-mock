import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

const isHelpdeskAdminMock = vi.fn();
vi.mock("@/lib/server/auth-session", () => ({
  isHelpdeskAdmin: () => isHelpdeskAdminMock(),
}));

import { requireHelpdeskAdminPage } from "@/lib/server/require-helpdesk-admin-page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireHelpdeskAdminPage", () => {
  it("adminのときは何もしない", async () => {
    isHelpdeskAdminMock.mockResolvedValue(true);

    await expect(requireHelpdeskAdminPage()).resolves.toBeUndefined();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("admin以外のときはnotFound()を呼ぶ", async () => {
    isHelpdeskAdminMock.mockResolvedValue(false);

    await expect(requireHelpdeskAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
