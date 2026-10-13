import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureBuilt } from "../../shared/vitest.ensure-built.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

/**
 * Integration tests spawn this package's `dist/index.js` and run vitest inside
 * server-git; build either once, up front, if it is missing.
 */
export default function setup(): void {
  ensureBuilt([resolve(__dirname, "../../server-git"), resolve(__dirname, "..")]);
}
