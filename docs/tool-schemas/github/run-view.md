# github > run-view

Views a workflow run by ID. Returns structured data with status, conclusion, jobs, and workflow details.

**Command**: `gh run view 12345 --json databaseId,status,conclusion,name,workflowName,headBranch,jobs,url,createdAt`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `id`      | number  | —       | Workflow run ID                                            |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
✓ main CI · 12345
Triggered via push about 1 hour ago

JOBS
✓ build (ubuntu) in 45s
✓ lint in 12s
✗ test in 1m30s

ANNOTATIONS
test: Process completed with exit code 1.

For more information about a job, try: gh run view --job=<job-id>
View this run on GitHub: https://github.com/owner/repo/actions/runs/12345
```

</td>
<td>

~90 tokens

```json
{
  "id": 12345,
  "status": "completed",
  "conclusion": "failure",
  "name": "CI",
  "workflowName": "CI",
  "headBranch": "main",
  "jobs": [
    { "name": "build (ubuntu)", "status": "completed", "conclusion": "success" },
    { "name": "lint", "status": "completed", "conclusion": "success" },
    { "name": "test", "status": "completed", "conclusion": "failure" }
  ],
  "url": "https://github.com/owner/repo/actions/runs/12345",
  "createdAt": "2025-01-15T09:00:00Z"
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
  "id": 12345,
  "status": "completed",
  "conclusion": "failure",
  "workflowName": "CI",
  "headBranch": "main",
  "jobsTotal": 3,
  "url": "https://github.com/owner/repo/actions/runs/12345"
}
```

</td>
</tr>
</table>

## Error — Run Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~20 tokens

```
could not find any workflows with ID 99999
```

</td>
<td>

~20 tokens

```json
{
  "error": "gh run view failed: could not find any workflows with ID 99999"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| Run with 3 jobs      | ~200       | ~90       | ~35          | 55-83%  |
| Run not found        | ~20        | ~20       | ~20          | 0%      |

## Notes

- Compact mode drops individual job details and `name`/`createdAt`, reporting only `jobsTotal`
- The `id` is mapped from `databaseId` in the gh CLI response
- `conclusion` is `null` for in-progress runs
