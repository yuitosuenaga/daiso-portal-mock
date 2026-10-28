import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNavigateAfterSubmit } from "@/lib/hooks/use-navigate-after-submit";

const pushMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// 未完了の非同期トランジションは React 内でテスト間に共有されるため、
// 終わらせないと後続テストの isPending が戻らなくなる。afterEach で必ず解決する。
const pending: Array<() => void> = [];
function pendingNavigation() {
  return new Promise<void>((resolve) => {
    pending.push(resolve);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(async () => {
  await act(async () => {
    pending.splice(0).forEach((resolve) => resolve());
  });
});

describe("useNavigateAfterSubmit", () => {
  it("初期状態では遷移中ではない", () => {
    const { result } = renderHook(() => useNavigateAfterSubmit());
    expect(result.current.isNavigating).toBe(false);
  });

  it("navigate後は遷移が終わるまでisNavigatingがtrueのまま", async () => {
    pushMock.mockReturnValue(pendingNavigation());
    const { result } = renderHook(() => useNavigateAfterSubmit());

    await act(async () => {
      result.current.navigate("/a");
    });

    expect(pushMock).toHaveBeenCalledWith("/a");
    expect(result.current.isNavigating).toBe(true);
  });

  it("遷移中の2回目のnavigateはpushしない", async () => {
    pushMock.mockReturnValue(pendingNavigation());
    const { result } = renderHook(() => useNavigateAfterSubmit());

    await act(async () => {
      result.current.navigate("/a");
      result.current.navigate("/b");
    });
    await act(async () => {
      result.current.navigate("/c");
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("遷移が完了したら元に戻り、再度navigateできる", async () => {
    let resolve!: () => void;
    pushMock.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolve = r;
      })
    );
    const { result } = renderHook(() => useNavigateAfterSubmit());

    await act(async () => {
      result.current.navigate("/a");
    });
    expect(result.current.isNavigating).toBe(true);

    await act(async () => {
      resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    console.log("DBG", result.current.isNavigating);
    expect(result.current.isNavigating).toBe(false);

    pushMock.mockReturnValue(undefined);
    await act(async () => {
      result.current.navigate("/b");
    });
    expect(pushMock).toHaveBeenCalledTimes(2);
  });
});
