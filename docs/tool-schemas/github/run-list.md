# github > run-list

Lists workflow runs with optional filters. Returns structured list with run ID, status, conclusion, and workflow details.

**Command**: `gh run list --json databaseId,status,conclusion,name,workflowName,headBranch,url,createdAt --limit 20`

## Input Parameters

| Parameter | Type                                                                       | Default | Description                                                |
| --------- | -------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `limit`   | number                                                                     | `20`    | Maximum number of runs to return                           |
| `branch`  | string                                                                     | —       | Filter by branch name                                     |
| `status`  | `"queued"` \| `"in_progress"` \| `"completed"` \| `"failure"` \| `"success"` | —       | Filter by run status                                      |
| `path`    | string                                                                     | cwd     | Repository path                                            |
| `compact` | boolean                                                                    | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
STATUS  NAME     WORKFLOW  BRANCH  EVENT  ID     ELAPSED  AGE
✓       CI run   CI        main    push   12345  2m       1h
✓       CI run   CI        main    push   12344  1m       3h
✗       CI run   CI        fix/a   push   12343  3m       5h
✓       Deploy   Release   main    push   12342  5m       1d
```

</td>
<td>

~100 tokens

```json
{
  "runs": [
    { "id": 12345, "status": "completed", "conclusion": "success", "name": "CI run", "workflowName": "CI", "headBranch": "main", "url": "https://github.com/owner/repo/actions/runs/12345", "createdAt": "2025-01-15T09:00:00Z" },
    { "id": 12344, "status": "completed", "conclusion": "success", "name": "CI run", "workflowName": "CI", "headBranch": "main", "url": "https://github.com/owner/repo/actions/runs/12344", "createdAt": "2025-01-15T07:00:00Z" },
    { "id": 12343, "status": "completed", "conclusion": "failure", "name": "CI run", "workflowName": "CI", "headBranch": "fix/a", "url": "https://github.com/owner/repo/actions/runs/12343", "createdAt": "2025-01-15T05:00:00Z" },
    { "id": 12342, "status": "completed", "conclusion": "success", "name": "Deploy", "workflowName": "Release", "headBranch": "main", "url": "https://github.com/owner/repo/actions/runs/12342", "createdAt": "2025-01-14T12:00:00Z" }
  ],
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~50 tokens

```json
{
  "runs": [
    { "id": 12345, "workflowName": "CI", "status": "completed", "conclusion": "success" },
    { "id": 12344, "workflowName": "CI", "status": "completed", "conclusion": "success" },
    { "id": 12343, "workflowName": "CI", "status": "completed", "conclusion": "failure" },
    { "id": 12342, "workflowName": "Release", "status": "completed", "conclusion": "success" }
  ],
  "total": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| 4 runs       | ~250       | ~100      | ~50          | 60-80%  |
| No runs      | ~30        | ~10       | ~10          | 67%     |

## Notes

- Compact mode drops `name`, `headBranch`, `url`, and `createdAt`, keeping `id`, `workflowName`, `status`, and `conclusion`
- The `id` is mapped from `databaseId` in the gh CLI response
- Use `status` filter to find only failed or in-progress runs
