import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // cargo operations (clippy, build, test) can be very slow on Windows CI
    // with cold toolchain caches — 60s is not enough for real cargo invocations.
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
