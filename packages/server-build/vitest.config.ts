import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  coverageThresholds: { lines: 55, functions: 55, branches: 45 },
});
