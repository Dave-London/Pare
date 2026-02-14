# cargo > audit

Runs cargo audit and returns structured vulnerability data with severity breakdown. Use instead of running `cargo audit` in the terminal.

**Command**: `cargo audit --json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ cargo audit
    Fetching advisory database from `https://github.com/RustSec/advisory-db.git`
    Scanning Cargo.lock for vulnerabilities (142 crate dependencies)

0 vulnerabilities found.
```

</td>
<td>

~30 tokens

```json
{
  "vulnerabilities": [],
  "summary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "informational": 0,
    "unknown": 0
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "summary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "informational": 0,
    "unknown": 0
  }
}
```

</td>
</tr>
</table>

## Success — Vulnerabilities Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
$ cargo audit
    Fetching advisory database from `https://github.com/RustSec/advisory-db.git`
    Scanning Cargo.lock for vulnerabilities (142 crate dependencies)

Crate:     chrono
Version:   0.4.19
Title:     Potential segfault in `localtime_r` invocations
Date:      2020-11-10
ID:        RUSTSEC-2020-0159
URL:       https://rustsec.org/advisories/RUSTSEC-2020-0159
Severity:  medium
Solution:  Upgrade to >=0.4.20

Crate:     openssl-src
Version:   111.22.0+1.1.1q
Title:     X.509 Email Address Variable Length Buffer Overflow
Date:      2022-11-01
ID:        RUSTSEC-2022-0065
URL:       https://rustsec.org/advisories/RUSTSEC-2022-0065
Severity:  high
Solution:  Upgrade to >=300.0.11

2 vulnerabilities found!
```

</td>
<td>

~120 tokens

```json
{
  "vulnerabilities": [
    {
      "id": "RUSTSEC-2020-0159",
      "package": "chrono",
      "version": "0.4.19",
      "severity": "medium",
      "title": "Potential segfault in `localtime_r` invocations",
      "url": "https://rustsec.org/advisories/RUSTSEC-2020-0159",
      "patched": [">=0.4.20"],
      "unaffected": []
    },
    {
      "id": "RUSTSEC-2022-0065",
      "package": "openssl-src",
      "version": "111.22.0+1.1.1q",
      "severity": "high",
      "title": "X.509 Email Address Variable Length Buffer Overflow",
      "url": "https://rustsec.org/advisories/RUSTSEC-2022-0065",
      "patched": [">=300.0.11"],
      "unaffected": []
    }
  ],
  "summary": {
    "total": 2,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 0,
    "informational": 0,
    "unknown": 0
  }
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
  "summary": {
    "total": 2,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 0,
    "informational": 0,
    "unknown": 0
  }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| No vulnerabilities | ~30        | ~30       | ~20          | 0-33%   |
| 2 vulnerabilities  | ~300       | ~120      | ~25          | 60-92%  |

## Notes

- `cargo audit` returns exit code 1 when vulnerabilities are found; this is expected behavior and not treated as an error
- The tool invokes `cargo audit --json` to get structured JSON output from the RustSec advisory database
- Each vulnerability entry includes an advisory ID (e.g., `RUSTSEC-2022-0065`), affected crate, installed version, severity, title, and patched version requirements
- Severity levels are derived from CVSS scores: `critical`, `high`, `medium`, `low`, `informational`, or `unknown`
- The `patched` array contains version requirement strings that resolve the vulnerability (e.g., `>=0.4.20`)
- The `unaffected` array is optional and lists version requirements that were never affected
- The `url` field is optional and links to the full advisory details
- Compact mode drops individual vulnerability details and returns only the severity summary counts
