import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 180_000,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
      },
    },
  },
});
