# security > trivy

Runs Trivy vulnerability/misconfiguration scanner on container images, filesystems, or IaC configs. Returns structured vulnerability data with severity summary.

**Command**: `trivy <scanType> --format json --quiet <target>`

## Input Parameters

| Parameter       | Type    | Default   | Description                                                                  |
| --------------- | ------- | --------- | ---------------------------------------------------------------------------- |
| `target`        | string  | required  | Scan target: image name (e.g. `"alpine:3.18"`) or filesystem path            |
| `scanType`      | enum    | `"image"` | Scan type: `"image"`, `"fs"`, or `"config"`                                  |
| `severity`      | enum    | all       | Severity filter: `"UNKNOWN"`, `"LOW"`, `"MEDIUM"`, `"HIGH"`, or `"CRITICAL"` |
| `ignoreUnfixed` | boolean | `false`   | Only show vulnerabilities with known fixes                                   |
| `path`          | string  | cwd       | Working directory                                                            |
| `compact`       | boolean | `true`    | Auto-compact when structured output exceeds raw CLI tokens                   |

## Success — No Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ trivy image --format json --quiet alpine:3.20

{
  "SchemaVersion": 2,
  "CreatedAt": "2026-02-14T10:00:00.000Z",
  "ArtifactName": "alpine:3.20",
  "ArtifactType": "container_image",
  "Results": []
}
```

</td>
<td>

~30 tokens

```json
{
  "target": "alpine:3.20",
  "scanType": "image",
  "vulnerabilities": [],
  "summary": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "unknown": 0
  },
  "totalVulnerabilities": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no vulnerabilities).

</td>
</tr>
</table>

## Success — With Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~800 tokens

```
$ trivy image --format json --quiet node:18-alpine

{
  "SchemaVersion": 2,
  "CreatedAt": "2026-02-14T10:00:00.000Z",
  "ArtifactName": "node:18-alpine",
  "ArtifactType": "container_image",
  "Results": [
    {
      "Target": "node:18-alpine (alpine 3.18.6)",
      "Class": "os-pkgs",
      "Type": "alpine",
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-2024-6119",
          "PkgName": "libssl3",
          "PkgID": "libssl3@3.1.4-r2",
          "InstalledVersion": "3.1.4-r2",
          "FixedVersion": "3.1.4-r6",
          "Status": "fixed",
          "Layer": { "DiffID": "sha256:abc123..." },
          "SeveritySource": "nvd",
          "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2024-6119",
          "Title": "OpenSSL: Possible denial of service in X.509 name checks",
          "Description": "An issue was found in OpenSSL...",
          "Severity": "HIGH",
          "CweIDs": ["CWE-843"],
          "CVSS": { "nvd": { "V3Score": 7.5 } },
          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2024-6119"],
          "PublishedDate": "2024-09-03",
          "LastModifiedDate": "2024-09-12"
        },
        {
          "VulnerabilityID": "CVE-2024-5535",
          "PkgName": "libssl3",
          "PkgID": "libssl3@3.1.4-r2",
          "InstalledVersion": "3.1.4-r2",
          "FixedVersion": "3.1.4-r6",
          "Status": "fixed",
          "Severity": "CRITICAL",
          "Title": "OpenSSL: SSL_select_next_proto buffer overread",
          "Description": "A buffer overread can be triggered..."
        },
        {
          "VulnerabilityID": "CVE-2024-4741",
          "PkgName": "libcrypto3",
          "PkgID": "libcrypto3@3.1.4-r2",
          "InstalledVersion": "3.1.4-r2",
          "FixedVersion": "3.1.4-r6",
          "Status": "fixed",
          "Severity": "MEDIUM",
          "Title": "OpenSSL: Use after free in SSL_free_buffers"
        },
        {
          "VulnerabilityID": "CVE-2024-2511",
          "PkgName": "libcrypto3",
          "PkgID": "libcrypto3@3.1.4-r2",
          "InstalledVersion": "3.1.4-r2",
          "Severity": "LOW",
          "Title": "OpenSSL: Unbounded memory growth with session handling in TLSv1.3"
        }
      ]
    }
  ]
}
```

</td>
<td>

~200 tokens

```json
{
  "target": "node:18-alpine",
  "scanType": "image",
  "vulnerabilities": [
    {
      "id": "CVE-2024-6119",
      "severity": "HIGH",
      "package": "libssl3",
      "installedVersion": "3.1.4-r2",
      "fixedVersion": "3.1.4-r6",
      "title": "OpenSSL: Possible denial of service in X.509 name checks"
    },
    {
      "id": "CVE-2024-5535",
      "severity": "CRITICAL",
      "package": "libssl3",
      "installedVersion": "3.1.4-r2",
      "fixedVersion": "3.1.4-r6",
      "title": "OpenSSL: SSL_select_next_proto buffer overread"
    },
    {
      "id": "CVE-2024-4741",
      "severity": "MEDIUM",
      "package": "libcrypto3",
      "installedVersion": "3.1.4-r2",
      "fixedVersion": "3.1.4-r6",
      "title": "OpenSSL: Use after free in SSL_free_buffers"
    },
    {
      "id": "CVE-2024-2511",
      "severity": "LOW",
      "package": "libcrypto3",
      "installedVersion": "3.1.4-r2",
      "title": "OpenSSL: Unbounded memory growth with session handling in TLSv1.3"
    }
  ],
  "summary": {
    "critical": 1,
    "high": 1,
    "medium": 1,
    "low": 1,
    "unknown": 0
  },
  "totalVulnerabilities": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "target": "node:18-alpine",
  "scanType": "image",
  "summary": {
    "critical": 1,
    "high": 1,
    "medium": 1,
    "low": 1,
    "unknown": 0
  },
  "totalVulnerabilities": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| No vulnerabilities | ~50        | ~30       | ~30          | 40%     |
| 4 vulnerabilities  | ~800       | ~200      | ~35          | 75-96%  |
| Trivy not found    | ~30        | ~30       | ~30          | 0%      |

## Notes

- Trivy JSON output is parsed from `--format json`; each result entry contains a `Target` and either a `Vulnerabilities` array (for image/fs scans) or a `Misconfigurations` array (for config scans)
- All vulnerabilities across multiple result entries are flattened into a single list; verbose fields like `Description`, `CVSS`, `CweIDs`, `References`, `Layer`, `PrimaryURL`, and dates are discarded
- For `config` scan type, misconfigurations are mapped into the same vulnerability structure with `package` set to the misconfiguration `Type` and `installedVersion` set to `"N/A"`
- The `ignoreUnfixed` parameter appends `--ignore-unfixed` to filter out vulnerabilities without a known fixed version
- The `severity` parameter filters at the Trivy level, reducing output before parsing
- Compact mode drops the `vulnerabilities` array entirely, keeping only `target`, `scanType`, `summary`, and `totalVulnerabilities`
- The `fixedVersion` field is omitted from the output when no fix is available
