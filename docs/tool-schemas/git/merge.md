# git > merge

Merges a branch into the current branch. Returns structured data with merge status, fast-forward detection, conflicts, and commit hash.

**Command**: `git merge [--no-ff] [-m <message>] <branch>` or `git merge --abort`

## Input Parameters

| Parameter | Type    | Default | Description                  |
| --------- | ------- | ------- | ---------------------------- |
| `path`    | string  | cwd     | Repository path              |
| `branch`  | string  | --      | Branch to merge              |
| `noFf`    | boolean | `false` | Force merge commit (`--no-ff`) |
| `abort`   | boolean | `false` | Abort in-progress merge      |
| `message` | string  | --      | Custom merge commit message  |

## Success — Fast-Forward Merge

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
Updating abc1234..def5678
Fast-forward
 src/index.ts | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
```

</td>
<td>

~25 tokens

```json
{
  "merged": true,
  "fastForward": true,
  "branch": "feature/auth",
  "conflicts": [],
  "commitHash": "def5678"
}
```

</td>
</tr>
</table>

## Success — Merge Commit

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Merge made by the 'ort' strategy.
 src/auth.ts | 45 +++++++++++++++++++++++
 1 file changed, 45 insertions(+)
```

</td>
<td>

~25 tokens

```json
{
  "merged": true,
  "fastForward": false,
  "branch": "feature/auth",
  "conflicts": [],
  "commitHash": "abc1234"
}
```

</td>
</tr>
</table>

## Error — Merge Conflicts

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
CONFLICT (content): Merge conflict in src/config.ts
Automatic merge failed; fix conflicts and then commit the result.
```

</td>
<td>

~30 tokens

```json
{
  "merged": false,
  "fastForward": false,
  "branch": "feature/auth",
  "conflicts": ["src/index.ts", "src/config.ts"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Savings |
| --------------- | ---------- | --------- | ------- |
| Fast-forward    | ~40        | ~25       | 38%     |
| Merge commit    | ~30        | ~25       | 17%     |
| Merge conflicts | ~80        | ~30       | 63%     |

## Notes

- No compact mode; the response is already concise
- `fastForward` is `true` when git performs a fast-forward merge
- When conflicts occur, `merged` is `false` and the `conflicts` array lists affected files
- `commitHash` is extracted from the merge output when available
- The `abort` flag runs `git merge --abort` to cancel an in-progress merge
