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
 *  In compact mode, diagnostics contain only file:line + severity. */
export const TscResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  totalFiles: z.number().optional(),
  emittedFiles: z.array(z.string()).optional(),
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
  totalFiles?: number;
  emittedFiles?: string[];
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
  gzipSize: z.string().optional(),
  gzipBytes: z.number().optional(),
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
  gzipSize?: string;
  gzipBytes?: number;
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

/** Zod schema for a single webpack chunk entry. */
export const WebpackChunkSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  names: z.array(z.string()).optional(),
  entry: z.boolean().optional(),
  files: z.array(z.string()).optional(),
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
  chunks: z.array(WebpackChunkSchema).optional(),
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
  chunks?: Array<{
    id?: string | number;
    names?: string[];
    entry?: boolean;
    files?: string[];
  }>;
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
  summary: z.record(z.string(), z.unknown()).optional(),
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
  summary?: Record<string, unknown>;
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
  passed: z.number(),
  failed: z.number(),
  cached: z.number(),
  affectedProjects: z.array(z.string()).optional(),
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
  passed: number;
  failed: number;
  cached: number;
  affectedProjects?: string[];
}

// ---------------------------------------------------------------------------
// lerna
// ---------------------------------------------------------------------------

/** Zod schema for a single Lerna package entry. */
export const LernaPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  location: z.string().optional(),
  private: z.boolean().optional(),
});

/** Zod schema for structured Lerna output with action, packages, and optional script output.
 *  In compact mode, location is omitted from packages; only name and version are returned. */
export const LernaResultSchema = z.object({
  success: z.boolean(),
  action: z.enum(["list", "run", "changed", "version"]),
  packages: z.array(LernaPackageSchema).optional(),
  output: z.string().optional(),
  errors: z.array(z.string()).optional(),
  duration: z.number(),
});

/** Full Lerna package entry. */
export interface LernaPackage {
  [key: string]: unknown;
  name: string;
  version: string;
  location?: string;
  private?: boolean;
}

/** Full Lerna result -- always returned by the parser. */
export interface LernaResult {
  [key: string]: unknown;
  success: boolean;
  action: "list" | "run" | "changed" | "version";
  packages?: LernaPackage[];
  output?: string;
  errors?: string[];
  duration: number;
}

// ---------------------------------------------------------------------------
// rollup
// ---------------------------------------------------------------------------

/** Zod schema for a single Rollup bundle entry. */
export const RollupBundleSchema = z.object({
  input: z.string(),
  output: z.string(),
  format: z.string().optional(),
  size: z.number().optional(),
});

/** Zod schema for a single Rollup error diagnostic. */
export const RollupErrorSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured Rollup output with bundles, errors, warnings, and duration.
 *  In compact mode, arrays are omitted; only success and duration are returned. */
export const RollupResultSchema = z.object({
  success: z.boolean(),
  bundles: z.array(RollupBundleSchema).optional(),
  errors: z.array(RollupErrorSchema).optional(),
  warnings: z.array(z.string()).optional(),
  duration: z.number(),
});

/** Full Rollup bundle entry. */
export interface RollupBundle {
  [key: string]: unknown;
  input: string;
  output: string;
  format?: string;
  size?: number;
}

/** Full Rollup error entry. */
export interface RollupError {
  [key: string]: unknown;
  file?: string;
  line?: number;
  column?: number;
  message: string;
}

/** Full Rollup result -- always returned by the parser. */
export interface RollupResult {
  [key: string]: unknown;
  success: boolean;
  bundles?: RollupBundle[];
  errors?: RollupError[];
  warnings?: string[];
  duration: number;
}
