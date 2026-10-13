import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureBuilt } from "../../shared/vitest.ensure-built.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

/** Integration tests spawn `dist/index.js`; build it once, up front, if it is missing. */
export default function setup(): void {
  ensureBuilt([resolve(__dirname, "..")]);
}
