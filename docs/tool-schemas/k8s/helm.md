# k8s > helm

Manages Helm releases (install, upgrade, list, status). Returns structured JSON output. Use instead of running `helm` in the terminal.

**Command**: `helm <action> [release] [chart] [-n namespace] [-o json] [--set key=val] [--values file]`

## Input Parameters

| Parameter   | Type     | Default | Description                                                          |
| ----------- | -------- | ------- | -------------------------------------------------------------------- |
| `action`    | enum     | —       | Helm action: `list`, `status`, `install`, or `upgrade`               |
| `release`   | string   | —       | Release name (required for status, install, upgrade)                 |
| `chart`     | string   | —       | Chart reference (required for install, upgrade; e.g., bitnami/nginx) |
| `namespace` | string   | —       | Kubernetes namespace (omit for default)                              |
| `setValues` | string[] | —       | Values to set via --set (e.g., `["key1=val1", "key2=val2"]`)         |
| `values`    | string   | —       | Path to a values YAML file (--values)                                |
| `compact`   | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens           |

## Success — List Releases

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
NAME        NAMESPACE   REVISION    UPDATED                                 STATUS      CHART               APP VERSION
nginx       default     3           2026-02-14 09:00:00.123456 +0000 UTC    deployed    nginx-15.4.0        1.25.3
prometheus  monitoring  2           2026-02-13 14:30:00.654321 +0000 UTC    deployed    prometheus-25.8.0   2.48.0
redis       default     1           2026-02-12 08:00:00.111111 +0000 UTC    deployed    redis-18.6.1        7.2.4
```

</td>
<td>

~150 tokens

```json
{
  "action": "list",
  "success": true,
  "releases": [
    {
      "name": "nginx",
      "namespace": "default",
      "revision": "3",
      "status": "deployed",
      "chart": "nginx-15.4.0",
      "app_version": "1.25.3"
    },
    {
      "name": "prometheus",
      "namespace": "monitoring",
      "revision": "2",
      "status": "deployed",
      "chart": "prometheus-25.8.0",
      "app_version": "2.48.0"
    },
    {
      "name": "redis",
      "namespace": "default",
      "revision": "1",
      "status": "deployed",
      "chart": "redis-18.6.1",
      "app_version": "7.2.4"
    }
  ],
  "total": 3,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~90 tokens

```json
{
  "action": "list",
  "success": true,
  "releases": [
    { "name": "nginx", "namespace": "default", "status": "deployed", "chart": "nginx-15.4.0" },
    {
      "name": "prometheus",
      "namespace": "monitoring",
      "status": "deployed",
      "chart": "prometheus-25.8.0"
    },
    { "name": "redis", "namespace": "default", "status": "deployed", "chart": "redis-18.6.1" }
  ],
  "total": 3,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Success — Install Release

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
NAME: nginx
LAST DEPLOYED: Fri Feb 14 12:00:00 2026
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
** Please be patient while the chart is being deployed **

NGINX can be accessed through the following DNS name:
  nginx.default.svc.cluster.local (port 80)
```

</td>
<td>

~70 tokens

```json
{
  "action": "install",
  "success": true,
  "name": "nginx",
  "namespace": "default",
  "revision": "1",
  "status": "deployed",
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~55 tokens

```json
{
  "action": "install",
  "success": true,
  "name": "nginx",
  "revision": "1",
  "status": "deployed",
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| List 3 releases   | ~300       | ~150      | ~90          | 50-70%  |
| Install release   | ~400       | ~70       | ~55          | 82-86%  |
| Upgrade release   | ~400       | ~70       | ~55          | 82-86%  |
| Status with notes | ~500       | ~120      | ~80          | 76-84%  |
| Release not found | ~25        | ~30       | ~30          | 0%      |

## Notes

- This is a multi-action tool that dispatches to `helm list`, `helm status`, `helm install`, or `helm upgrade` based on the `action` parameter
- The `release` parameter is required for `status`, `install`, and `upgrade` actions; omit it for `list`
- The `chart` parameter is required for `install` and `upgrade` actions (e.g., `bitnami/nginx`, `./my-chart`)
- The `setValues` parameter accepts an array of `key=value` strings, each passed as a separate `--set` flag; all values are validated against flag injection
- The `values` parameter accepts a path to a YAML values file passed via `--values`
- Install and upgrade actions use a 120-second timeout (vs 60 seconds for list and status) to accommodate chart downloads and resource creation
- Compact mode drops `revision`, `app_version`, and `namespace` from list results, and drops `namespace` from install/upgrade/status results
