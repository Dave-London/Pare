import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  coverageThresholds: { lines: 50, functions: 50, branches: 40 },
});
