/**
 * Shared Zod input schemas for common tool parameters.
 *
 * These schemas centralize definitions that were previously duplicated
 * across every server package (e.g. `compact`, `path`, `fix`).
 *
 * - **Constants** are used when the schema is identical everywhere.
 * - **Factories** are used when only the `.describe()` text varies.
 */
import { z } from "zod";
import { INPUT_LIMITS } from "./limits.js";

// ---------------------------------------------------------------------------
// Constants (zero variation across servers)
// ---------------------------------------------------------------------------

/** `compact: z.boolean().optional().default(true).describe("Prefer compact output")` */
export const compactInput = z.boolean().optional().default(true).describe("Prefer compact output");

/** `path` for servers whose root concept is a project (go, lint, build, make, cargo, python, test, npm). */
export const projectPathInput = z
  .string()
  .max(INPUT_LIMITS.PATH_MAX)
  .optional()
  .describe("Project root path");

/** `path` for servers whose root concept is a repository (git, github, security). */
export const repoPathInput = z
  .string()
  .max(INPUT_LIMITS.PATH_MAX)
  .optional()
  .describe("Repository path");

/** `path` for servers whose root concept is a working directory (docker, http, process, search). */
export const cwdPathInput = z
  .string()
  .max(INPUT_LIMITS.PATH_MAX)
  .optional()
  .describe("Working directory");

/** `fix: z.boolean().optional().default(false).describe("Auto-fix problems")` */
export const fixInput = z.boolean().optional().default(false).describe("Auto-fix problems");

// ---------------------------------------------------------------------------
// Factories (same shape, varied descriptions)
// ---------------------------------------------------------------------------

/** Generic optional path string — use when none of the constants above fit. */
export const pathInput = (desc: string) =>
  z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe(desc);

/** Optional config-file path. */
export const configInput = (desc: string) =>
  z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe(desc);

/** Optional array of file-path patterns with INPUT_LIMITS applied. */
export const filePatternsInput = (desc: string, defaultValue?: string[]) => {
  const base = z
    .array(z.string().max(INPUT_LIMITS.PATH_MAX))
    .max(INPUT_LIMITS.ARRAY_MAX)
    .optional();
  return defaultValue ? base.default(defaultValue).describe(desc) : base.describe(desc);
};
