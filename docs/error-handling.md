# Error Handling

Pare tools use two distinct error patterns depending on the nature of the failure. Understanding which pattern applies helps agents handle errors correctly.

## Pattern 1: Thrown Errors (MCP-Level Errors)

When a tool cannot execute at all — the CLI binary is missing, the path is invalid, permissions are denied, or input validation fails — Pare **throws an error**. This becomes an MCP error response with `isError: true`. No `structuredContent` is returned.

**When this happens:**

- Command not found (e.g., `git` not installed)
- Invalid repository or project path (e.g., not a git repo)
- Permission denied
- Input validation failures (e.g., missing required parameters, flag injection blocked)
- Network/authentication failures that prevent the command from running

**Example — not a git repository:**

The MCP response has `isError: true` and the error message in `content`:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "git status failed: fatal: not a git repository (or any of the parent directories): .git"
    }
  ]
}
```

**Example — validation error:**

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "The 'key' parameter is required for config set"
    }
  ]
}
```

**How agents should handle this:** These errors mean the operation was not attempted or could not complete. The agent should check preconditions (is the tool installed? is the path correct?) and retry or report the failure.

## Pattern 2: Structured Error Payloads (Tool-Level Failures)

When the CLI command runs but reports a failure — tests fail, a build has errors, a lint check finds violations — Pare returns a **normal MCP response** (`isError: false`) with structured data that includes `success: false` and the relevant failure details. The tool "succeeded" at executing the command; the command itself reported problems.

**When this happens:**

- Tests run but some fail (`cargo test`, `go test`, `vitest`, `pytest`)
- Build completes with compilation errors (`tsc`, `cargo build`, `docker build`)
- Lint/format checks find violations (`eslint`, `biome`, `prettier`)
- Scripts exit with non-zero codes (`npm run`, `make run`)
- Push rejected by remote (`git push` non-fast-forward)

**Example — tests with failures:**

```json
{
  "success": false,
  "tests": [
    { "name": "tests::test_add", "status": "ok" },
    { "name": "tests::test_multiply", "status": "FAILED" }
  ],
  "total": 2,
  "passed": 1,
  "failed": 1,
  "ignored": 0
}
```

**Example — build with type errors:**

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 12,
      "column": 5,
      "code": 2322,
      "severity": "error",
      "message": "Type 'string' is not assignable to type 'number'."
    }
  ],
  "total": 1,
  "errors": 1,
  "warnings": 0
}
```

**How agents should handle this:** The structured data contains everything needed to act on the failure — which tests failed, which files have errors, what the exit code was. Agents can iterate on fixes using this data directly.

## Quick Reference

| Failure Type | Error Pattern | `isError` | Has `structuredContent` | Key Fields |
| --- | --- | --- | --- | --- |
| Command not found | Thrown | `true` | No | Error message in `content` |
| Not a git repo / bad path | Thrown | `true` | No | Error message in `content` |
| Validation (missing param) | Thrown | `true` | No | Error message in `content` |
| Permission denied | Thrown | `true` | No | Error message in `content` |
| Tests fail | Structured | `false` | Yes | `success`, `failed`, `tests` |
| Build errors | Structured | `false` | Yes | `success`, `errors`, `diagnostics` |
| Lint violations | Structured | `false` | Yes | `errors`, `warnings`, `diagnostics` |
| Script non-zero exit | Structured | `false` | Yes | `success`, `exitCode`, `stderr` |
| Push rejected | Thrown | `true` | No | Error message in `content` |

## How Individual Tool Pages Document Errors

In the [tool schema docs](tool-schemas/), error scenarios appear in two forms matching the patterns above:

- **"Error" rows** showing `{ "error": "..." }` represent **thrown errors** (Pattern 1). These are MCP-level failures where the tool could not produce structured output.
- **"Success — With Failures"** sections showing `{ "success": false, ... }` represent **structured error payloads** (Pattern 2). The tool executed successfully and returned detailed failure information in its schema.

Some tools use only one pattern (e.g., `git status` only throws on errors), while others use both (e.g., `npm run` returns structured failure data for script errors but throws if npm itself is not found).
