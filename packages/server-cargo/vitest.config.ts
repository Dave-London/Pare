import { createVitestConfig } from "../shared/vitest.shared.js";

// cargo operations (clippy, build, test) can be very slow on Windows CI
// with cold toolchain caches — 60s is not enough for real cargo invocations.
export default createVitestConfig();
