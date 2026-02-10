import { z } from "zod";

/** Zod schema for a single TypeScript compiler diagnostic with file location, severity, and error code. */
export const TscDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  code: z.number(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});

/** Zod schema for structured tsc output including success status, diagnostics array, and error/warning counts. */
export const TscResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type TscResult = z.infer<typeof TscResultSchema>;
export type TscDiagnostic = z.infer<typeof TscDiagnosticSchema>;

/** Zod schema for structured build command output with success status, duration, errors, and warnings. */
export const BuildResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;

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

/** Zod schema for structured esbuild output including errors, warnings, output files, and duration. */
export const EsbuildResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(EsbuildErrorSchema),
  warnings: z.array(EsbuildWarningSchema),
  outputFiles: z.array(z.string()).optional(),
  duration: z.number(),
});

export type EsbuildError = z.infer<typeof EsbuildErrorSchema>;
export type EsbuildWarning = z.infer<typeof EsbuildWarningSchema>;
export type EsbuildResult = z.infer<typeof EsbuildResultSchema>;

// ---------------------------------------------------------------------------
// vite-build
// ---------------------------------------------------------------------------

/** Zod schema for a single Vite build output file entry with name and size. */
export const ViteOutputFileSchema = z.object({
  file: z.string(),
  size: z.string(),
});

/** Zod schema for structured Vite production build output with files, sizes, and duration. */
export const ViteBuildResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  outputs: z.array(ViteOutputFileSchema),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ViteOutputFile = z.infer<typeof ViteOutputFileSchema>;
export type ViteBuildResult = z.infer<typeof ViteBuildResultSchema>;

// ---------------------------------------------------------------------------
// webpack
// ---------------------------------------------------------------------------

/** Zod schema for a single webpack asset entry. */
export const WebpackAssetSchema = z.object({
  name: z.string(),
  size: z.number(),
});

/** Zod schema for structured webpack build output with assets, errors, warnings, and module count. */
export const WebpackResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  assets: z.array(WebpackAssetSchema),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  modules: z.number().optional(),
});

export type WebpackAsset = z.infer<typeof WebpackAssetSchema>;
export type WebpackResult = z.infer<typeof WebpackResultSchema>;
