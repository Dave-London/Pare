import { z } from "zod";

// go build
export const GoBuildErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

export const GoBuildResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(GoBuildErrorSchema),
  total: z.number(),
});

export type GoBuildResult = z.infer<typeof GoBuildResultSchema>;

// go test -json
export const GoTestCaseSchema = z.object({
  package: z.string(),
  name: z.string(),
  status: z.enum(["pass", "fail", "skip"]),
  elapsed: z.number().optional(),
  output: z.string().optional(),
});

export const GoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(GoTestCaseSchema),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
});

export type GoTestResult = z.infer<typeof GoTestResultSchema>;

// go vet
export const GoVetDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

export const GoVetResultSchema = z.object({
  diagnostics: z.array(GoVetDiagnosticSchema),
  total: z.number(),
});

export type GoVetResult = z.infer<typeof GoVetResultSchema>;
