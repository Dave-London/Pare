import { fileURLToPath } from "node:url";
import { createVitestConfig } from "../shared/vitest.shared.js";

// Absolute, so the setup file resolves whatever directory vitest is started from.
const globalSetup = fileURLToPath(new URL("./__tests__/global-setup.ts", import.meta.url));

export default createVitestConfig({
  testTimeout: 300_000,
  globalSetup: [globalSetup],
  coverageThresholds: {
    lines: 75,
    functions: 75,
    branches: 70,
  },
});
