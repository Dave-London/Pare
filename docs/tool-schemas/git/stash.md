# git > stash

Pushes, pops, applies, or drops stash entries. Returns structured result with action, success, and message.

**Command**: `git stash push [-m <message>]` / `git stash pop [stash@{N}]` / `git stash apply [stash@{N}]` / `git stash drop [stash@{N}]`

## Input Parameters

| Parameter | Type                                         | Default | Description                                              |
| --------- | -------------------------------------------- | ------- | -------------------------------------------------------- |
| `path`    | string                                       | cwd     | Repository path                                          |
| `action`  | `"push"` \| `"pop"` \| `"apply"` \| `"drop"` | --      | Stash action to perform                                  |
| `message` | string                                       | --      | Stash message (only used with `push`)                    |
| `index`   | number                                       | --      | Stash index for pop/apply/drop (e.g., 0 for `stash@{0}`) |

## Success — Push

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
Saved working directory and index state WIP on main: abc1234 feat: add auth
```

</td>
<td>

~20 tokens

```json
{
  "action": "push",
  "success": true,
  "message": "Saved working directory and index state WIP on main: abc1234 feat: add auth"
}
```

</td>
</tr>
</table>

## Success — Pop

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
On branch main
Changes not staged for commit:
  modified:   src/index.ts

Dropped refs/stash@{0} (abc1234def5678)
```

</td>
<td>

~25 tokens

```json
{
  "action": "pop",
  "success": true,
  "message": "On branch main\nChanges not staged for commit:\n  modified:   src/index.ts\n\nDropped refs/stash@{0} (abc1234def5678)"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Savings |
| ---------- | ---------- | --------- | ------- |
| Stash push | ~20        | ~20       | 0%      |
| Stash pop  | ~40        | ~25       | 38%     |

## Notes

- No compact mode; the response is already concise
- The `message` parameter is only used with the `push` action; it is ignored for other actions
- The `index` parameter selects which stash entry to pop/apply/drop
- The response `message` field contains the raw git output
