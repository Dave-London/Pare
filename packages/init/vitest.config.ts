import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  testTimeout: 120_000,
  coverageThresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
  },
});
