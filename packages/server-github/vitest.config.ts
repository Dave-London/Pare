import { createVitestConfig } from "../shared/vitest.shared.js";

export default createVitestConfig({
  coverageThresholds: {
    branches: 60,
  },
});
