# git > pull

Pulls changes from a remote repository. Returns structured data with success status, summary, change statistics, and any conflicts.

**Command**: `git pull [--rebase] <remote> [<branch>]`

## Input Parameters

| Parameter | Type    | Default    | Description                            |
| --------- | ------- | ---------- | -------------------------------------- |
| `path`    | string  | cwd        | Repository path                        |
| `remote`  | string  | `"origin"` | Remote name                            |
| `branch`  | string  | --         | Branch to pull (default: tracking)     |
| `rebase`  | boolean | `false`    | Use rebase instead of merge (`--rebase`) |

## Success — Changes Pulled

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
remote: Enumerating objects: 8, done.
remote: Counting objects: 100% (8/8), done.
remote: Compressing objects: 100% (4/4), done.
Updating abc1234..def5678
Fast-forward
 src/index.ts | 5 +++--
 src/utils.ts | 3 +++
 2 files changed, 6 insertions(+), 2 deletions(-)
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "summary": "Updating abc1234..def5678",
  "filesChanged": 2,
  "insertions": 6,
  "deletions": 2,
  "conflicts": []
}
```

</td>
</tr>
</table>

## Success — Already Up to Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
Already up to date.
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "summary": "Already up to date",
  "filesChanged": 0,
  "insertions": 0,
  "deletions": 0,
  "conflicts": []
}
```

</td>
</tr>
</table>

## Error — Merge Conflicts

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~120 tokens

```
Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
Auto-merging src/config.ts
CONFLICT (content): Merge conflict in src/config.ts
Automatic merge failed; fix conflicts and then commit the result.
```

</td>
<td>

~35 tokens

```json
{
  "success": false,
  "summary": "Pull completed with 2 conflict(s)",
  "filesChanged": 0,
  "insertions": 0,
  "deletions": 0,
  "conflicts": ["src/index.ts", "src/config.ts"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Savings |
| ------------------ | ---------- | --------- | ------- |
| Changes pulled     | ~100       | ~30       | 70%     |
| Already up to date | ~10        | ~25       | --*     |
| Merge conflicts    | ~120       | ~35       | 71%     |

*Already-up-to-date responses are slightly larger in structured form but provide consistent schema.

## Notes

- No compact mode; the response is already concise
- Conflict detection uses regex matching on `CONFLICT (...)` patterns in git output
- When conflicts occur, `success` is `false` and the `conflicts` array lists affected files
- The `rebase` flag adds `--rebase` for pull-with-rebase workflows
