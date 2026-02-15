# security > gitleaks

Runs Gitleaks to detect hardcoded secrets in git repositories. Returns structured finding data with redacted secrets.

**Command**: `gitleaks detect --report-format json --report-path /dev/stdout --source <path>`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path to scan                                    |
| `noGit`   | boolean | `false` | Scan files without git history (`--no-git`)                |
| `verbose` | boolean | `false` | Enable verbose output from gitleaks                        |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Findings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ gitleaks detect --source .

    ○
    │╲
    │ ○
    ○ ░
    ░    gitleaks

No leaks found.
```

</td>
<td>

~20 tokens

```json
{
  "totalFindings": 0,
  "findings": [],
  "summary": {
    "totalFindings": 0
  }
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

~500 tokens

```
$ gitleaks detect --report-format json --report-path /dev/stdout --source .

[
  {
    "Description": "AWS Access Key",
    "StartLine": 14,
    "EndLine": 14,
    "StartColumn": 1,
    "EndColumn": 40,
    "Match": "AKIAIOSFODNN7EXAMPLE",
    "Secret": "AKIAIOSFODNN7EXAMPLE",
    "File": "config/credentials.yml",
    "SymlinkFile": "",
    "Commit": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "Entropy": 3.684,
    "Author": "dev@example.com",
    "Email": "dev@example.com",
    "Date": "2025-11-10T14:32:00Z",
    "Message": "add config files",
    "Tags": [],
    "RuleID": "aws-access-key-id",
    "Fingerprint": "a1b2c3d4:config/credentials.yml:aws-access-key-id:14"
  },
  {
    "Description": "Generic API Key",
    "StartLine": 8,
    "EndLine": 8,
    "StartColumn": 12,
    "EndColumn": 55,
    "Match": "api_key = \"EXAMPLE_KEY_abcdef1234567890ghij\"",
    "Secret": "EXAMPLE_KEY_abcdef1234567890ghij",
    "File": "src/services/payment.ts",
    "SymlinkFile": "",
    "Commit": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
    "Entropy": 4.125,
    "Author": "dev@example.com",
    "Email": "dev@example.com",
    "Date": "2025-12-01T09:15:00Z",
    "Message": "integrate payment service",
    "Tags": [],
    "RuleID": "generic-api-key",
    "Fingerprint": "b2c3d4e5:src/services/payment.ts:generic-api-key:8"
  }
]
```

</td>
<td>

~150 tokens

```json
{
  "totalFindings": 2,
  "findings": [
    {
      "ruleID": "aws-access-key-id",
      "description": "AWS Access Key",
      "match": "AKIAIOSFODNN7EXAMPLE",
      "secret": "AKI***PLE",
      "file": "config/credentials.yml",
      "startLine": 14,
      "endLine": 14,
      "commit": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "author": "dev@example.com",
      "date": "2025-11-10T14:32:00Z"
    },
    {
      "ruleID": "generic-api-key",
      "description": "Generic API Key",
      "match": "api_key = \"EXAMPLE_KEY_abcdef1234567890ghij\"",
      "secret": "EXA***hij",
      "file": "src/services/payment.ts",
      "startLine": 8,
      "endLine": 8,
      "commit": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      "author": "dev@example.com",
      "date": "2025-12-01T09:15:00Z"
    }
  ],
  "summary": {
    "totalFindings": 2
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "totalFindings": 2,
  "summary": {
    "totalFindings": 2
  }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| No findings        | ~40        | ~20       | ~20          | 50%     |
| 2 secret findings  | ~500       | ~150      | ~15          | 70-97%  |
| Gitleaks not found | ~30        | ~20       | ~20          | 33%     |

## Notes

- Gitleaks JSON output is a flat array of finding objects; the parser extracts key fields and discards metadata like `Entropy`, `Fingerprint`, `Tags`, and `SymlinkFile`
- Secrets are automatically redacted: strings longer than 8 characters show only the first 3 and last 3 characters (e.g., `EXA***hij`); shorter secrets are fully redacted to `***`
- Gitleaks exits with code 1 when findings are detected, which is treated as a successful scan (not an error)
- The `noGit` parameter appends `--no-git` to scan files without git history, useful for non-git directories or CI artifact scanning
- Compact mode drops the `findings` array entirely, keeping only `totalFindings` and `summary`
