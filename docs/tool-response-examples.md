# Tool Response Examples

Quick reference showing the structured JSON that Pare's most commonly used tools return. Each example matches the actual Zod `outputSchema` defined in the server's `src/schemas/index.ts`. For full schema details and token comparisons, see the [tool-schemas/](./tool-schemas/) directory.

## git status

Returns branch info, staged/modified/untracked files, and whether the working tree is clean.

```json
{
  "branch": "feat/add-search",
  "upstream": "origin/feat/add-search",
  "ahead": 1,
  "behind": 0,
  "staged": [
    { "file": "src/index.ts", "status": "modified" },
    { "file": "src/utils.ts", "status": "added" }
  ],
  "modified": ["README.md"],
  "deleted": [],
  "untracked": ["temp.log"],
  "conflicts": [],
  "clean": false
}
```

**Key fields for agents**: `clean` (quick pass/fail check), `staged`/`modified`/`untracked` (decide what to commit), `ahead`/`behind` (decide whether to push/pull), `conflicts` (detect merge issues).

## git log

Returns an array of commit entries with hash, author, date, and message.

```json
{
  "commits": [
    {
      "hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "hashShort": "a1b2c3d",
      "author": "Alice",
      "date": "2025-03-01T10:30:00+00:00",
      "message": "feat: add search tool"
    },
    {
      "hash": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      "hashShort": "b2c3d4e",
      "author": "Bob",
      "date": "2025-02-28T15:20:00+00:00",
      "message": "fix: handle empty input in parser"
    }
  ]
}
```

**Key fields for agents**: `hashShort` (reference commits), `message` (understand change history), `author`/`date` (attribution and recency).

## git diff

Returns per-file diff stats with additions, deletions, and optional chunk content.

```json
{
  "files": [
    {
      "file": "src/parser.ts",
      "status": "modified",
      "additions": 12,
      "deletions": 3,
      "chunks": [
        {
          "header": "@@ -10,6 +10,15 @@",
          "lines": "+import { validate } from './validate.js';\n ...\n-const old = true;\n+const new = false;"
        }
      ]
    },
    {
      "file": "tests/parser.test.ts",
      "status": "added",
      "additions": 45,
      "deletions": 0
    }
  ]
}
```

**Key fields for agents**: `files[].status` (what kind of change), `additions`/`deletions` (change magnitude), `chunks` (actual diff content when requested).

## npm audit

Returns a list of vulnerabilities with severity, fix availability, and CVE identifiers.

```json
{
  "packageManager": "npm",
  "vulnerabilities": [
    {
      "name": "lodash",
      "severity": "high",
      "title": "Prototype Pollution",
      "url": "https://github.com/advisories/GHSA-xxxx",
      "range": "<4.17.21",
      "fixAvailable": true,
      "cve": "CVE-2021-23337"
    },
    {
      "name": "minimist",
      "severity": "critical",
      "title": "Prototype Pollution",
      "url": "https://github.com/advisories/GHSA-yyyy",
      "range": "<1.2.6",
      "fixAvailable": true,
      "cve": "CVE-2021-44906"
    }
  ]
}
```

**Key fields for agents**: `severity` (prioritize fixes), `fixAvailable` (decide whether to auto-fix), `name`/`range` (identify which dependency to update).

## npm outdated

Returns packages with current, wanted, and latest versions.

```json
{
  "packageManager": "npm",
  "packages": [
    {
      "name": "typescript",
      "current": "5.3.3",
      "wanted": "5.3.3",
      "latest": "5.7.2",
      "type": "devDependency"
    },
    {
      "name": "zod",
      "current": "3.22.0",
      "wanted": "3.23.8",
      "latest": "3.23.8",
      "type": "dependency"
    }
  ]
}
```

**Key fields for agents**: `current` vs `wanted` vs `latest` (decide update strategy), `type` (distinguish prod vs dev dependencies).

## test run

Returns framework, summary counts, and detailed failure information.

```json
{
  "framework": "vitest",
  "summary": {
    "total": 42,
    "passed": 40,
    "failed": 2,
    "skipped": 0,
    "duration": 3.45
  },
  "failures": [
    {
      "name": "parser > handles empty input",
      "file": "src/__tests__/parser.test.ts",
      "line": 15,
      "message": "expected undefined to equal ''",
      "expected": "''",
      "actual": "undefined"
    },
    {
      "name": "formatter > truncates long output",
      "file": "src/__tests__/formatter.test.ts",
      "line": 88,
      "message": "expected 256 to be less than 100"
    }
  ]
}
```

**Key fields for agents**: `summary.failed` (quick pass/fail), `failures[].file`/`line` (jump to broken code), `failures[].expected`/`actual` (understand what went wrong), `framework` (context for interpreting results).

## build tsc

Returns TypeScript compiler diagnostics with file locations, error codes, and severity.

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 42,
      "column": 5,
      "code": 2322,
      "severity": "error",
      "message": "Type 'string' is not assignable to type 'number'."
    },
    {
      "file": "src/utils.ts",
      "line": 10,
      "column": 1,
      "code": 6133,
      "severity": "warning",
      "message": "'unusedVar' is declared but its value is never read."
    }
  ],
  "errors": 1,
  "warnings": 1
}
```

**Key fields for agents**: `success` (quick pass/fail), `diagnostics[].file`/`line` (locate the problem), `diagnostics[].code` (TS error code for lookup), `errors`/`warnings` (summary counts).
