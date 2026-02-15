# git > worktree

Lists, adds, or removes git worktrees for managing multiple working trees. Returns structured data with worktree paths, branches, and HEAD commits.

**Command**: `git worktree <list --porcelain | add [-b <branch>] <path> [<base>] | remove [--force] <path>>`

## Input Parameters

| Parameter      | Type    | Default | Description                                                     |
| -------------- | ------- | ------- | --------------------------------------------------------------- |
| `path`         | string  | cwd     | Repository path                                                 |
| `action`       | enum    | `list`  | Worktree action: `list`, `add`, `remove`                        |
| `worktreePath` | string  | --      | Path for the new or existing worktree (required for add/remove) |
| `branch`       | string  | --      | Branch to checkout in the new worktree (used with add)          |
| `createBranch` | boolean | `false` | Create a new branch when adding (used with add)                 |
| `base`         | string  | --      | Base ref for the new branch (used with add + createBranch)      |
| `force`        | boolean | `false` | Force removal even if worktree is dirty (used with remove)      |
| `compact`      | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens      |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full (list)</strong></td>
<td>

~120 tokens

```
worktree /home/user/project
HEAD a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
branch refs/heads/main

worktree /home/user/project-wt-feature
HEAD b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3
branch refs/heads/feature/auth

worktree /home/user/project-wt-bugfix
HEAD c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4
branch refs/heads/fix/parser
```

</td>
<td>

~130 tokens

```json
{
  "worktrees": [
    { "path": "/home/user/project", "head": "a1b2c3d", "branch": "main", "bare": false },
    {
      "path": "/home/user/project-wt-feature",
      "head": "b2c3d4e",
      "branch": "feature/auth",
      "bare": false
    },
    {
      "path": "/home/user/project-wt-bugfix",
      "head": "c3d4e5f",
      "branch": "fix/parser",
      "bare": false
    }
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact (list)</strong></td>
<td><em>n/a</em></td>
<td>

~50 tokens

```json
{
  "worktrees": [
    "/home/user/project [main] a1b2c3d",
    "/home/user/project-wt-feature [feature/auth] b2c3d4e",
    "/home/user/project-wt-bugfix [fix/parser] c3d4e5f"
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Add / Remove</strong></td>
<td>

~30 tokens

```
Preparing worktree (new branch 'feature/auth')
HEAD is now at a1b2c3d Update dependencies
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "path": "/home/user/project-wt-feature",
  "branch": "feature/auth"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| List 3 worktrees  | ~120       | ~130      | ~50          | 0-58%   |
| List 10 worktrees | ~400       | ~420      | ~170         | 0-58%   |
| Add / Remove      | ~30        | ~25       | --           | 15-20%  |

## Notes

- The `list` action uses `--porcelain` for reliable machine-parseable output
- The `add` action supports both checking out an existing branch and creating a new branch via `createBranch`
- When `createBranch` is true, the `branch` parameter is used with `-b` to create a new branch; `base` specifies the starting point
- The `remove` action requires `worktreePath`; use `force` to remove dirty worktrees
- Add and remove actions return a `GitWorktree` schema (success, path, branch) rather than the list schema
- Compact mode only applies to the `list` action, collapsing each worktree into a single summary string
- The `bare` field in list output indicates whether the worktree is a bare repository
