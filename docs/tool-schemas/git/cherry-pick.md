# git > cherry-pick

Applies specific commits to the current branch. Returns structured data with applied commits and any conflicts.

**Command**: `git cherry-pick [-n] <commits...>` or `git cherry-pick --abort` or `git cherry-pick --continue`

## Input Parameters

| Parameter  | Type     | Default | Description                               |
| ---------- | -------- | ------- | ----------------------------------------- |
| `path`     | string   | cwd     | Repository path                           |
| `commits`  | string[] | `[]`    | Commit hashes to cherry-pick              |
| `abort`    | boolean  | `false` | Abort in-progress cherry-pick             |
| `continue` | boolean  | `false` | Continue after resolving conflicts        |
| `noCommit` | boolean  | `false` | Apply changes without committing (`-n`)   |

## Success — Clean Cherry-Pick

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
[main def5678] feat: add user validation
 Date: Mon Feb 10 14:30:00 2026 +0000
 2 files changed, 15 insertions(+), 3 deletions(-)
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "applied": ["abc1234"],
  "conflicts": []
}
```

</td>
</tr>
</table>

## Error — Cherry-Pick Conflicts

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
error: could not apply abc1234... feat: add validation
hint: After resolving the conflicts, mark the corrected paths
hint: with 'git add <paths>' or 'git rm <paths>'
hint: and commit the result with 'git commit'
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "applied": [],
  "conflicts": ["src/index.ts"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Savings |
| -------------------- | ---------- | --------- | ------- |
| Clean cherry-pick    | ~30        | ~20       | 33%     |
| Cherry-pick conflict | ~80        | ~20       | 75%     |

## Notes

- No compact mode; the response is already concise
- Multiple commits can be cherry-picked in a single call
- The `noCommit` flag (`-n`) applies changes to the working tree without creating a commit
- When conflicts occur, `success` is `false` and `applied` is empty
- Use `abort: true` to cancel or `continue: true` to resume after resolving conflicts
- The `commits` parameter is required for a normal cherry-pick but not for abort/continue
