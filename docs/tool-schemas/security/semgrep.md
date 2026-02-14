# security > semgrep

Runs Semgrep static analysis with structured rules and findings. Returns structured finding data with severity summary.

**Command**: `semgrep scan --json --quiet --config <config> <patterns...>`

## Input Parameters

| Parameter  | Type     | Default  | Description                                                                       |
| ---------- | -------- | -------- | --------------------------------------------------------------------------------- |
| `patterns` | string[] | `["."]`  | File patterns or paths to scan                                                    |
| `config`   | string   | `"auto"` | Semgrep config/ruleset (e.g. `"auto"`, `"p/security-audit"`, `"p/owasp-top-ten"`) |
| `severity` | enum     | all      | Severity filter: `"INFO"`, `"WARNING"`, or `"ERROR"`                              |
| `path`     | string   | cwd      | Working directory                                                                 |
| `compact`  | boolean  | `true`   | Auto-compact when structured output exceeds raw CLI tokens                        |

## Success — No Findings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ semgrep scan --json --quiet --config auto .

{
  "results": [],
  "errors": [],
  "version": "1.56.0",
  "paths": {
    "scanned": ["src/index.ts", "src/utils.ts", "src/lib/helpers.ts"]
  }
}
```

</td>
<td>

~25 tokens

```json
{
  "totalFindings": 0,
  "findings": [],
  "summary": {
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "config": "auto"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no findings).

</td>
</tr>
</table>

## Success — With Findings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~700 tokens

```
$ semgrep scan --json --quiet --config auto .

{
  "results": [
    {
      "check_id": "javascript.lang.security.detect-eval-with-expression.detect-eval-with-expression",
      "path": "src/api/handler.js",
      "start": { "line": 42, "col": 5, "offset": 1023 },
      "end": { "line": 42, "col": 28, "offset": 1046 },
      "extra": {
        "message": "Detected eval() with a non-literal argument. This is dangerous and can lead to code injection.",
        "severity": "ERROR",
        "metadata": {
          "category": "security",
          "cwe": ["CWE-94"],
          "confidence": "HIGH",
          "technology": ["javascript"],
          "references": ["https://owasp.org/Top10/A03_2021-Injection/"]
        },
        "lines": "    eval(userInput);",
        "is_ignored": false
      }
    },
    {
      "check_id": "javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp",
      "path": "src/utils/search.js",
      "start": { "line": 15, "col": 12, "offset": 310 },
      "end": { "line": 15, "col": 35, "offset": 333 },
      "extra": {
        "message": "RegExp() called with a non-literal value. This could allow ReDoS attacks.",
        "severity": "WARNING",
        "metadata": {
          "category": "security",
          "cwe": ["CWE-1333"],
          "confidence": "MEDIUM",
          "technology": ["javascript"]
        },
        "lines": "    new RegExp(pattern);",
        "is_ignored": false
      }
    },
    {
      "check_id": "javascript.lang.best-practice.detected-logging-request-body",
      "path": "src/api/handler.js",
      "start": { "line": 30, "col": 3, "offset": 780 },
      "end": { "line": 30, "col": 32, "offset": 809 },
      "extra": {
        "message": "Request body is being logged. This may leak sensitive data.",
        "severity": "INFO",
        "metadata": {
          "category": "best-practice",
          "confidence": "LOW"
        },
        "lines": "  console.log(req.body);",
        "is_ignored": false
      }
    }
  ],
  "errors": [],
  "version": "1.56.0"
}
```

</td>
<td>

~180 tokens

```json
{
  "totalFindings": 3,
  "findings": [
    {
      "ruleId": "javascript.lang.security.detect-eval-with-expression.detect-eval-with-expression",
      "path": "src/api/handler.js",
      "startLine": 42,
      "endLine": 42,
      "message": "Detected eval() with a non-literal argument. This is dangerous and can lead to code injection.",
      "severity": "ERROR",
      "category": "security"
    },
    {
      "ruleId": "javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp",
      "path": "src/utils/search.js",
      "startLine": 15,
      "endLine": 15,
      "message": "RegExp() called with a non-literal value. This could allow ReDoS attacks.",
      "severity": "WARNING",
      "category": "security"
    },
    {
      "ruleId": "javascript.lang.best-practice.detected-logging-request-body",
      "path": "src/api/handler.js",
      "startLine": 30,
      "endLine": 30,
      "message": "Request body is being logged. This may leak sensitive data.",
      "severity": "INFO",
      "category": "best-practice"
    }
  ],
  "summary": {
    "error": 1,
    "warning": 1,
    "info": 1
  },
  "config": "auto"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "totalFindings": 3,
  "summary": {
    "error": 1,
    "warning": 1,
    "info": 1
  },
  "config": "auto"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| No findings       | ~60        | ~25       | ~25          | 58%     |
| 3 findings        | ~700       | ~180      | ~25          | 74-96%  |
| Semgrep not found | ~30        | ~25       | ~25          | 17%     |

## Notes

- Semgrep JSON output is parsed from `--json`; each result contains `check_id`, `path`, `start`/`end` positions, and `extra` with `message`, `severity`, and `metadata`
- The parser extracts `category` from `extra.metadata.category` when available; other metadata fields like `cwe`, `confidence`, `references`, and `lines` are discarded
- The `config` parameter supports any Semgrep registry config: `"auto"` (recommended defaults), `"p/security-audit"`, `"p/owasp-top-ten"`, or a path to a local YAML rule file
- The `severity` parameter filters findings at the Semgrep level before parsing, reducing scan output
- Compact mode drops the `findings` array entirely, keeping only `totalFindings`, `summary`, and `config`
- Input patterns are validated against flag injection (patterns starting with `--` are rejected)
