import { defineConfig, mergeConfig } from "vitest/config";
import { createVitestConfig } from "../shared/vitest.shared.js";

export default mergeConfig(
  createVitestConfig({ hookTimeout: 30_000 }),
  defineConfig({
    test: {
      // Use forks pool to prevent v8 coverage temp file race conditions.
      // The git package has 18 test files including integration tests that
      // spawn child processes, which can conflict with v8's coverage
      // collection when using the default threads pool.
      pool: "forks",
    },
  }),
);
