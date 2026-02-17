import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    include: ["mocked/**/*.smoke.test.ts", "suite/**/*.smoke.test.ts"],
    testTimeout: 30_000,
  },
});
