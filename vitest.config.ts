import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
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
