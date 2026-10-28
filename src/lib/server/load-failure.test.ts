import { afterEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { ForbiddenSessionError, UnauthorizedSessionError } from "@/lib/server/auth-session";
import { logLoadFailure } from "@/lib/server/load-failure";
import { logger } from "@/lib/server/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logLoadFailure", () => {
  it("通常のErrorはlogger.errorに1回、component付きで記録する", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    logLoadFailure("FaqList", new Error("db down"));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, fields] = errorSpy.mock.calls[0];
    expect(message).toBe("[FaqList] load failed");
    expect(fields).toMatchObject({ component: "FaqList", errorName: "Error", errorMessage: "db down" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("接続文字列の資格情報は実際のロガー出力で伏字になりERRORで出る", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    logLoadFailure("FaqList", new Error("connect failed postgres://u:secretpw@h/db"));

    const output = write.mock.calls.map((c) => String(c[0])).join("");
    expect(output).not.toContain("secretpw");
    expect(output).toContain("[redacted]");
    expect(JSON.parse(output.trim().split("\n")[0]).severity).toBe("ERROR");
  });

  it.each([
    ["UnauthorizedSessionError", new UnauthorizedSessionError("no session")],
    ["ForbiddenSessionError", new ForbiddenSessionError("admin required")],
  ])("%sはwarnでスタックなし、errorは呼ばない", (_name, error) => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    logLoadFailure("FaqList", error);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe("[FaqList] load failed (unauthorized)");
    expect(warnSpy.mock.calls[0][1]).not.toHaveProperty("stack_trace");
    expect(warnSpy.mock.calls[0][1]).toMatchObject({ component: "FaqList" });
  });

  it("optional: true はwarnで記録する", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    logLoadFailure("X", new Error("boom"), { optional: true });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe("[X] optional load failed");
  });

  it.each([
    ["notFound", () => notFound()],
    ["redirect", () => redirect("/login")],
  ])("Nextの制御例外(%s)は再throwしログを出さない", (_name, trigger) => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    let caught: unknown;
    try {
      trigger();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();

    expect(() => logLoadFailure("FaqList", caught)).toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
