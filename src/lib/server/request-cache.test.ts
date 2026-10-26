import { describe, expect, it, vi } from "vitest";

import { requestCache } from "@/lib/server/request-cache";

describe("requestCache", () => {
  it("React の cache() が無い環境（Vitest）でも、元の関数と同じ結果を返す", async () => {
    const fn = vi.fn(async (value: number) => value * 2);
    const cached = requestCache(fn);

    await expect(cached(2)).resolves.toBe(4);
    expect(fn).toHaveBeenCalledWith(2);
  });
});
