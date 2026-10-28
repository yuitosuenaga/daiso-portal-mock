import path from "path";

import { defineConfig } from "vitest/config";

// 日付表示の期待値がTZに依存するため、未指定ならJSTに固定する（ワーカーへ継承される）
process.env.TZ ??= "Asia/Tokyo";

export default defineConfig({
  // vite 8 は esbuild ではなく oxc で変換するため、JSX の自動ランタイムは oxc で指定する
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "jsdom",
    // vi.stubEnv の値を各テスト後に自動で戻す（assert失敗時の汚染防止）
    unstubEnvs: true,
    setupFiles: ["./vitest.setup.ts"],
    // 他エージェントが並行作業中の git worktree（.claude/worktrees/配下）が
    // このリポジトリ内にネストされている場合があるため、それらのテストファイルを
    // 誤って収集しないよう明示的に除外する（`@`エイリアスがこのリポジトリのsrc/を
    // 指すため、除外しないと別worktreeの古いテストがこちらのソースに対して実行されてしまう）。
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      "**/.claude/worktrees/**",
    ],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/lib/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
