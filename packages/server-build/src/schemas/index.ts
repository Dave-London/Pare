import { z } from "zod";

/** Zod schema for a single TypeScript compiler diagnostic with file location, severity, and error code.
 *  In compact mode, only file, line, and severity are returned. */
export const TscDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  code: z.number().optional(),
  severity: z.enum(["error", "warning"]),
  message: z.string().optional(),
});

/** Zod schema for structured tsc output including success status, diagnostics array, and error/warning counts.
 *  In compact mode, total is omitted and diagnostics contain only file:line + severity. */
export const TscResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  total: z.number().optional(),
  errors: z.number(),
  warnings: z.number(),
});

/** Full tsc diagnostic -- always returned by the parser. */
export interface TscDiagnostic {
  [key: string]: unknown;
  file: string;
  line: number;
  column?: number;
  code?: number;
  severity: "error" | "warning";
  message?: string;
}

/** Full tsc result -- always returned by the parser. */
export interface TscResult {
  [key: string]: unknown;
  success: boolean;
  diagnostics: TscDiagnostic[];
  total: number;
  errors: number;
  warnings: number;
}

/** Zod schema for structured build command output with success status, duration, errors, and warnings.
 *  In compact mode, error/warning arrays are omitted. */
export const BuildResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number().optional(),
  duration: z.number(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  outputLines: z.number().optional(),
});

/** Full build result -- always returned by the parser. */
export interface BuildResult {
  [key: string]: unknown;
  success: boolean;
  exitCode?: number;
  duration: number;
  errors?: string[];
  warnings?: string[];
  stdout?: string;
  stderr?: string;
  outputLines?: number;
}

// ---------------------------------------------------------------------------
// esbuild
// ---------------------------------------------------------------------------

/** Zod schema for a single esbuild error diagnostic. */
export const EsbuildErrorSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for a single esbuild warning diagnostic. */
export const EsbuildWarningSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string(),
});

/** Zod schema for a single metafile entry with byte size. */
export const MetafileEntrySchema = z.object({
  bytes: z.number(),
});

/** Zod schema for esbuild metafile output with inputs and outputs maps. */
export const EsbuildMetafileSchema = z.object({
  inputs: z.record(z.string(), MetafileEntrySchema),
  outputs: z.record(z.string(), MetafileEntrySchema),
});

/** Zod schema for structured esbuild output including errors, warnings, output files, and duration.
 *  In compact mode, arrays are omitted; only success and duration are returned. */
export const EsbuildResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(EsbuildErrorSchema).optional(),
  warnings: z.array(EsbuildWarningSchema).optional(),
  outputFiles: z.array(z.string()).optional(),
  duration: z.number(),
  metafile: EsbuildMetafileSchema.optional(),
});

/** Full esbuild error -- always returned by the parser. */
export interface EsbuildError {
  [key: string]: unknown;
  file?: string;
  line?: number;
  column?: number;
  message: string;
}

/** Full esbuild warning -- always returned by the parser. */
export interface EsbuildWarning {
  [key: string]: unknown;
  file?: string;
  line?: number;
  message: string;
}

/** Metafile entry with byte size. */
export interface MetafileEntry {
  bytes: number;
}

/** Esbuild metafile with inputs and outputs. */
export interface EsbuildMetafile {
  inputs: Record<string, MetafileEntry>;
  outputs: Record<string, MetafileEntry>;
}

/** Full esbuild result -- always returned by the parser. */
export interface EsbuildResult {
  [key: string]: unknown;
  success: boolean;
  errors?: EsbuildError[];
  warnings?: EsbuildWarning[];
  outputFiles?: string[];
  duration: number;
  metafile?: EsbuildMetafile;
}

// ---------------------------------------------------------------------------
// vite-build
// ---------------------------------------------------------------------------

/** Zod schema for a single Vite build output file entry with name, size string, and normalized byte size. */
export const ViteOutputFileSchema = z.object({
  file: z.string(),
  size: z.string(),
  sizeBytes: z.number().optional(),
});

/** Zod schema for structured Vite production build output with files, sizes, and duration.
 *  In compact mode, arrays are omitted; only success and duration are returned. */
export const ViteBuildResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  outputs: z.array(ViteOutputFileSchema).optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

/** Full Vite output file entry. */
export interface ViteOutputFile {
  [key: string]: unknown;
  file: string;
  size: string;
  sizeBytes?: number;
}

/** Full Vite build result -- always returned by the parser. */
export interface ViteBuildResult {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  outputs?: ViteOutputFile[];
  errors?: string[];
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// webpack
// ---------------------------------------------------------------------------

/** Zod schema for a single webpack asset entry. */
export const WebpackAssetSchema = z.object({
  name: z.string(),
  size: z.number(),
});

/** Zod schema for a webpack profile module entry with name and timing. */
export const WebpackProfileModuleSchema = z.object({
  name: z.string(),
  time: z.number(),
});

/** Zod schema for webpack profile data. */
export const WebpackProfileSchema = z.object({
  modules: z.array(WebpackProfileModuleSchema),
});

/** Zod schema for structured webpack build output with assets, errors, warnings, and module count.
 *  In compact mode, arrays are omitted; only success, duration, and modules are returned. */
export const WebpackResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  assets: z.array(WebpackAssetSchema).optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  modules: z.number().optional(),
  profile: WebpackProfileSchema.optional(),
});

/** Full webpack asset entry. */
export interface WebpackAsset {
  [key: string]: unknown;
  name: string;
  size: number;
}

/** Webpack profile module entry. */
export interface WebpackProfileModule {
  name: string;
  time: number;
}

/** Webpack profile data. */
export interface WebpackProfile {
  modules: WebpackProfileModule[];
}

/** Full webpack result -- always returned by the parser. */
export interface WebpackResult {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  assets?: WebpackAsset[];
  errors?: string[];
  warnings?: string[];
  modules?: number;
  profile?: WebpackProfile;
}

// ---------------------------------------------------------------------------
// turbo
// ---------------------------------------------------------------------------

/** Zod schema for a single Turbo task result entry with package name, task, status, duration, and cache info. */
export const TurboTaskSchema = z.object({
  package: z.string(),
  task: z.string(),
  status: z.enum(["pass", "fail"]),
  duration: z.string().optional(),
  durationMs: z.number().optional(),
  cache: z.enum(["hit", "miss"]).optional(),
});

/** Zod schema for structured Turbo run output with per-package task results and summary counts.
 *  In compact mode, the tasks array is omitted; only summary counts are returned. */
export const TurboResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  tasks: z.array(TurboTaskSchema).optional(),
  totalTasks: z.number(),
  passed: z.number(),
  failed: z.number(),
  cached: z.number(),
});

/** Full turbo task entry. */
export interface TurboTask {
  [key: string]: unknown;
  package: string;
  task: string;
  status: "pass" | "fail";
  duration?: string;
  durationMs?: number;
  cache?: "hit" | "miss";
}

/** Full turbo result -- always returned by the parser. */
export interface TurboResult {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  tasks?: TurboTask[];
  totalTasks: number;
  passed: number;
  failed: number;
  cached: number;
}

// ---------------------------------------------------------------------------
// nx
// ---------------------------------------------------------------------------

/** Zod schema for a single Nx task result entry. */
export const NxTaskSchema = z.object({
  project: z.string(),
  target: z.string(),
  status: z.enum(["success", "failure", "skipped"]),
  duration: z.number().optional(),
  cache: z
    .enum(["local", "remote", "miss"])
    .optional()
    .describe("Cache state: local hit, remote hit, or miss (no cache)"),
});

/** Zod schema for structured Nx output with per-project task results and summary.
 *  In compact mode, tasks array is omitted; only summary counts are returned. */
export const NxResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  tasks: z.array(NxTaskSchema).optional(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  cached: z.number(),
});

/** Full Nx task entry. */
export interface NxTask {
  [key: string]: unknown;
  project: string;
  target: string;
  status: "success" | "failure" | "skipped";
  duration?: number;
  cache?: "local" | "remote" | "miss";
}

/** Full Nx result -- always returned by the parser. */
export interface NxResult {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  tasks?: NxTask[];
  total: number;
  passed: number;
  failed: number;
  cached: number;
}
