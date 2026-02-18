import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  testTimeout: 300_000,
  coverageThresholds: {
    lines: 75,
    functions: 75,
    branches: 70,
  },
});
