import { existsSync } from "node:fs";
import { getClients, type ClientEntry } from "./clients.js";

/**
 * Auto-detect installed AI coding clients by checking for
 * known config directories/files on the filesystem.
 */
export function detectClients(): ClientEntry[] {
  return getClients().filter((client) => client.detectPaths.some((p) => existsSync(p)));
}
