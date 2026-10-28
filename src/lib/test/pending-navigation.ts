import { act } from "@testing-library/react";

/**
 * 「router.push が完了しない（遷移中）」状態を作るテスト用ヘルパー。
 *
 * useTransition の非同期トランジションは React 内でテスト間に共有されるため、
 * 解決しないまま残すと後続テストの isPending が戻らなくなる。
 * afterEach で settle() を呼んで必ず終わらせること。
 */
export function createPendingNavigation() {
  const resolvers: Array<() => void> = [];
  return {
    push: () =>
      new Promise<void>((resolve) => {
        resolvers.push(resolve);
      }),
    settle: async () => {
      await act(async () => {
        resolvers.splice(0).forEach((resolve) => resolve());
      });
    },
  };
}
