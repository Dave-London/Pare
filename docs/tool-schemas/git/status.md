# git > status

Returns the working tree status as structured data (branch, staged, modified, untracked, conflicts).

**Command**: `git status --porcelain=v1 --branch`

## Input Parameters

| Parameter | Type   | Default | Description     |
| --------- | ------ | ------- | --------------- |
| `path`    | string | cwd     | Repository path |

## Success — Clean Working Tree

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

</td>
<td>

~30 tokens

```json
{
  "branch": "main",
  "upstream": "origin/main",
  "staged": [],
  "modified": [],
  "deleted": [],
  "untracked": [],
  "conflicts": [],
  "clean": true
}
```

</td>
</tr>
</table>

## Success — Dirty Working Tree

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
On branch feature/auth
Your branch is ahead of 'origin/feature/auth' by 2 commits.

Changes to be committed:
  new file:   src/auth.ts
  modified:   src/index.ts

Changes not staged for commit:
  modified:   src/utils.ts

Untracked files:
  .env.local
  tmp/debug.log
```

</td>
<td>

~80 tokens

```json
{
  "branch": "feature/auth",
  "upstream": "origin/feature/auth",
  "ahead": 2,
  "staged": [
    { "file": "src/auth.ts", "status": "added" },
    { "file": "src/index.ts", "status": "modified" }
  ],
  "modified": ["src/utils.ts"],
  "deleted": [],
  "untracked": [".env.local", "tmp/debug.log"],
  "conflicts": [],
  "clean": false
}
```

</td>
</tr>
</table>

## Error — Not a Git Repository

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
fatal: not a git repository (or any of the parent directories): .git
```

</td>
<td>

~25 tokens

```json
{
  "error": "git status failed: fatal: not a git repository (or any of the parent directories): .git"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Savings |
| -------------- | ---------- | --------- | ------- |
| Clean tree     | ~60        | ~30       | 50%     |
| Dirty tree     | ~200       | ~80       | 60%     |
| Not a git repo | ~30        | ~25       | 17%     |

## Notes

- No compact mode; the status response is already concise
- Branch tracking info (`ahead`/`behind`) is parsed from the porcelain `##` line
- Conflict detection covers both-modified (`UU`), added-by-both (`AA`), and other unmerged states
- File renames in the staging area include an `oldFile` field
