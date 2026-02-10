import { z } from "zod";

/** Zod schema for a single test failure with name, location, message, and optional expected/actual values. */
export const TestFailureSchema = z.object({
  name: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  stack: z.string().optional(),
});

export type TestFailure = z.infer<typeof TestFailureSchema>;

/** Zod schema for structured test run output including framework, summary counts, and failure details. */
export const TestRunSchema = z.object({
  framework: z.enum(["pytest", "jest", "vitest", "mocha"]),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    duration: z.number(),
  }),
  failures: z.array(TestFailureSchema),
});

export type TestRun = z.infer<typeof TestRunSchema>;

/** Zod schema for per-file coverage data including line, branch, and function coverage percentages. */
export const CoverageFileSchema = z.object({
  file: z.string(),
  lines: z.number(),
  branches: z.number().optional(),
  functions: z.number().optional(),
  uncoveredLines: z.array(z.number()).optional(),
});

/** Zod schema for structured coverage output including framework, summary totals, and per-file details. */
export const CoverageSchema = z.object({
  framework: z.enum(["pytest", "jest", "vitest", "mocha"]),
  summary: z.object({
    lines: z.number(),
    branches: z.number().optional(),
    functions: z.number().optional(),
  }),
  files: z.array(CoverageFileSchema),
});

export type Coverage = z.infer<typeof CoverageSchema>;
