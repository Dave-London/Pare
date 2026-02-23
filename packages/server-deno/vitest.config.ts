import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  coverageThresholds: { lines: 48, functions: 48, branches: 38 },
});
