import { z } from "zod";

// pip install
export const PipInstallSchema = z.object({
  success: z.boolean(),
  installed: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  alreadySatisfied: z.boolean(),
  total: z.number(),
});

export type PipInstall = z.infer<typeof PipInstallSchema>;

// mypy
export const MypyDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  severity: z.enum(["error", "warning", "note"]),
  message: z.string(),
  code: z.string().optional(),
});

export const MypyResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(MypyDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type MypyResult = z.infer<typeof MypyResultSchema>;

// ruff check
export const RuffDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  endLine: z.number().optional(),
  endColumn: z.number().optional(),
  code: z.string(),
  message: z.string(),
  fixable: z.boolean(),
});

export const RuffResultSchema = z.object({
  diagnostics: z.array(RuffDiagnosticSchema),
  total: z.number(),
  fixable: z.number(),
});

export type RuffResult = z.infer<typeof RuffResultSchema>;

// pip audit
export const PipAuditVulnSchema = z.object({
  name: z.string(),
  version: z.string(),
  id: z.string(),
  description: z.string(),
  fixVersions: z.array(z.string()),
});

export const PipAuditResultSchema = z.object({
  vulnerabilities: z.array(PipAuditVulnSchema),
  total: z.number(),
});

export type PipAuditResult = z.infer<typeof PipAuditResultSchema>;
