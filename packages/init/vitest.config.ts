import { createVitestConfig } from "../shared/vitest.shared.js";
import { defineConfig, mergeConfig } from "vitest/config";

const base = createVitestConfig({
  testTimeout: 120_000,
  coverageThresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
  },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts", // CLI entry point — tested via integration (child process)
          "src/doctor.ts", // CLI entry point — tested via integration (child process)
          "src/lib/prompts.ts", // Interactive inquirer prompts — not unit-testable
        ],
      },
    },
  }),
);
