# git > rebase

Rebases the current branch onto a target branch. Supports abort and continue for conflict resolution.

**Command**: `git rebase <branch>` or `git rebase --abort` or `git rebase --continue`

## Input Parameters

| Parameter  | Type    | Default | Description                                          |
| ---------- | ------- | ------- | ---------------------------------------------------- |
| `path`     | string  | cwd     | Repository path                                      |
| `branch`   | string  | --      | Target branch to rebase onto (required unless abort/continue) |
| `abort`    | boolean | `false` | Abort in-progress rebase                             |
| `continue` | boolean | `false` | Continue after conflict resolution                   |

## Success — Clean Rebase

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Successfully rebased and updated refs/heads/feature/auth.
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "branch": "main",
  "current": "feature/auth",
  "conflicts": [],
  "rebasedCommits": 3
}
```

</td>
</tr>
</table>

## Error — Rebase Conflicts

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
error: could not apply abc1234... feat: update index
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "branch": "main",
  "current": "feature/auth",
  "conflicts": ["src/index.ts"],
  "rebasedCommits": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Savings |
| ---------------- | ---------- | --------- | ------- |
| Clean rebase     | ~30        | ~25       | 17%     |
| Rebase conflicts | ~100       | ~30       | 70%     |

## Notes

- No compact mode; the response is already concise
- The `current` field shows the branch being rebased (determined via `git rev-parse --abbrev-ref HEAD`)
- `rebasedCommits` is pre-counted using `git log <branch>..HEAD` before the rebase starts
- When conflicts occur, `success` is `false` and the `conflicts` array lists affected files
- Use `abort: true` to cancel or `continue: true` to resume after resolving conflicts
- The `branch` parameter is required for a normal rebase but not for abort/continue
