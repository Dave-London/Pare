import { z } from "zod";

/** Zod schema for a single go build error with file location and message. */
export const GoBuildErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured go build output with success status and error list. */
export const GoBuildResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(GoBuildErrorSchema),
  total: z.number(),
});

export type GoBuildResult = z.infer<typeof GoBuildResultSchema>;

/** Zod schema for a single go test case with package, name, status, and optional elapsed time. */
export const GoTestCaseSchema = z.object({
  package: z.string(),
  name: z.string(),
  status: z.enum(["pass", "fail", "skip"]),
  elapsed: z.number().optional(),
  output: z.string().optional(),
});

/** Zod schema for structured go test output with test list and pass/fail/skip counts. */
export const GoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(GoTestCaseSchema),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
});

export type GoTestResult = z.infer<typeof GoTestResultSchema>;

/** Zod schema for a single go vet diagnostic with file location and message. */
export const GoVetDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured go vet output with diagnostic list and total count. */
export const GoVetResultSchema = z.object({
  diagnostics: z.array(GoVetDiagnosticSchema),
  total: z.number(),
});

export type GoVetResult = z.infer<typeof GoVetResultSchema>;
