import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  testTimeout: 300_000,
  globalSetup: ["./__tests__/global-setup.ts"],
  coverageThresholds: {
    lines: 75,
    functions: 75,
    branches: 70,
  },
});
