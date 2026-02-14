# github > run-rerun

Re-runs a workflow run by ID. Optionally re-runs only failed jobs. Returns structured result with run ID, status, and URL.

**Command**: `gh run rerun 12345` / `gh run rerun 12345 --failed`

## Input Parameters

| Parameter    | Type    | Default      | Description                                          |
| ------------ | ------- | ------------ | ---------------------------------------------------- |
| `runId`      | number  | —            | Workflow run ID to re-run                            |
| `failedOnly` | boolean | `false`      | Re-run only failed jobs                              |
| `repo`       | string  | current repo | Repository in OWNER/REPO format                      |
| `path`       | string  | cwd          | Repository path                                      |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
✓ Requested rerun of run 12345
```

</td>
<td>

~20 tokens

```json
{
  "runId": 12345,
  "status": "requested",
  "failedOnly": false,
  "url": "https://github.com/owner/repo/actions/runs/12345"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Rerun request | ~15        | ~20       | ~20          | -33%    |

## Notes

- The Pare response is slightly larger than CLI output due to including structured fields (`runId`, `status`, `failedOnly`, `url`), but provides machine-parseable data
- The `status` field is always `"requested"` on success
- The `url` is extracted from the gh CLI output if present; it may be empty if not included in the CLI response
- Use `failedOnly: true` to re-run only the jobs that failed, saving CI time
