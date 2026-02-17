import { z } from "zod";

/** Zod schema for a single test failure with name, location, message, and optional expected/actual values. */
export const TestFailureSchema = z.object({
  name: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string().optional(),
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
  tests: z
    .array(
      z.object({
        name: z.string(),
        file: z.string().optional(),
        status: z.enum(["passed", "failed", "skipped"]),
        duration: z.number().optional(),
        retry: z.number().optional(),
      }),
    )
    .optional(),
});

export type TestRun = z.infer<typeof TestRunSchema>;

/** Zod schema for per-file coverage data including line, branch, and function coverage percentages. */
export const CoverageFileSchema = z.object({
  file: z.string(),
  statements: z.number().optional(),
  lines: z.number(),
  branches: z.number().optional(),
  functions: z.number().optional(),
  uncoveredLines: z.array(z.number()).optional(),
});

/** Zod schema for structured coverage output including framework, summary totals, and per-file details. */
export const CoverageSchema = z.object({
  framework: z.enum(["pytest", "jest", "vitest", "mocha"]),
  summary: z.object({
    statements: z.number().optional(),
    lines: z.number(),
    branches: z.number().optional(),
    functions: z.number().optional(),
  }),
  files: z.array(CoverageFileSchema).optional(),
  totalFiles: z.number().optional(),
  meetsThreshold: z.boolean().optional(),
});

export type Coverage = z.infer<typeof CoverageSchema>;

/** Zod schema for a single Playwright test result with title, status, duration, and optional error. */
export const PlaywrightTestResultSchema = z.object({
  title: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  projectName: z.string().optional(),
  status: z.enum(["passed", "failed", "timedOut", "skipped", "interrupted"]),
  duration: z.number(),
  error: z.string().optional(),
  retry: z.number().optional(),
});

/** Zod schema for a Playwright suite containing specs. */
export const PlaywrightSuiteSchema = z.object({
  title: z.string(),
  file: z.string().optional(),
  tests: z.array(PlaywrightTestResultSchema),
});

/** Zod schema for structured Playwright test run output. */
export const PlaywrightResultSchema = z.object({
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    timedOut: z.number(),
    interrupted: z.number(),
    flaky: z.number(),
    duration: z.number(),
  }),
  suites: z.array(PlaywrightSuiteSchema).optional(),
  failures: z.array(
    z.object({
      title: z.string(),
      file: z.string().optional(),
      line: z.number().optional(),
      error: z.string().optional(),
    }),
  ),
});

export type PlaywrightTestResult = z.infer<typeof PlaywrightTestResultSchema>;
export type PlaywrightSuite = z.infer<typeof PlaywrightSuiteSchema>;
export type PlaywrightResult = z.infer<typeof PlaywrightResultSchema>;
