import { describe, expect, it } from "vitest";

import { getGlobalMockStore } from "@/lib/mock-store";

describe("getGlobalMockStore", () => {
  it("同一keyで呼び出すと同一のインスタンスを返す", () => {
    const first = getGlobalMockStore("test-key-a", () => [] as number[]);
    first.push(1);

    const second = getGlobalMockStore("test-key-a", () => [] as number[]);

    expect(second).toBe(first);
    expect(second).toEqual([1]);
  });

  it("異なるkeyでは独立したインスタンスを返す", () => {
    const a = getGlobalMockStore("test-key-b", () => [] as number[]);
    const b = getGlobalMockStore("test-key-c", () => [] as number[]);

    a.push(1);

    expect(b).toEqual([]);
  });

  it("初期化関数は初回のみ呼び出される", () => {
    let callCount = 0;
    const createInitial = () => {
      callCount += 1;
      return [] as number[];
    };

    getGlobalMockStore("test-key-d", createInitial);
    getGlobalMockStore("test-key-d", createInitial);

    expect(callCount).toBe(1);
  });
});
