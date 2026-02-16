import { defineConfig, type UserConfig } from "vitest/config";

/**
 * Base Vitest configuration shared across all packages.
 *
 * Usage in each package's vitest.config.ts:
 * ```ts
 * import { createVitestConfig } from "../shared/vitest.shared.js";
 * export default createVitestConfig();
 * ```
 *
 * Override specific settings:
 * ```ts
 * export default createVitestConfig({
 *   testTimeout: 180_000,
 *   coverageThresholds: { lines: 75, functions: 75, branches: 70 },
 * });
 * ```
 */

interface VitestConfigOptions {
  testTimeout?: number;
  hookTimeout?: number;
  coverageThresholds?: {
    lines?: number;
    functions?: number;
    branches?: number;
  };
}

const defaults = {
  testTimeout: 180_000,
  coverageThresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
  },
} as const;

export function createVitestConfig(options?: VitestConfigOptions): UserConfig {
  const testTimeout = options?.testTimeout ?? defaults.testTimeout;
  const thresholds = {
    ...defaults.coverageThresholds,
    ...options?.coverageThresholds,
  };

  return defineConfig({
    test: {
      globals: true,
      testTimeout,
      ...(options?.hookTimeout ? { hookTimeout: options.hookTimeout } : {}),
      coverage: {
        provider: "v8",
        thresholds,
      },
    },
  });
}
