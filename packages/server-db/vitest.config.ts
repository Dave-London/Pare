import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  coverageThresholds: { lines: 45, functions: 45, branches: 35 },
});
