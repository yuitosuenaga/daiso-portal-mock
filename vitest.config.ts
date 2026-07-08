import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/lib/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
