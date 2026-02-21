import { createVitestConfig } from "../shared/vitest.shared.js";
export default createVitestConfig({
  coverageThresholds: { lines: 40, functions: 40, branches: 30 },
});
