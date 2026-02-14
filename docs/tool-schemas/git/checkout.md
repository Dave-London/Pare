# git > checkout

Switches branches or restores files. Returns structured data with ref, previous ref, and whether a new branch was created.

**Command**: `git checkout [-b] <ref>`

## Input Parameters

| Parameter | Type    | Default | Description                             |
| --------- | ------- | ------- | --------------------------------------- |
| `path`    | string  | cwd     | Repository path                         |
| `ref`     | string  | --      | Branch name, tag, or commit to checkout |
| `create`  | boolean | `false` | Create a new branch (`-b`)              |

## Success — Switch Branch

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
Switched to branch 'feature/auth'
Your branch is up to date with 'origin/feature/auth'.
```

</td>
<td>

~20 tokens

```json
{
  "ref": "feature/auth",
  "previousRef": "main",
  "created": false
}
```

</td>
</tr>
</table>

## Success — Create and Switch

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
Switched to a new branch 'feature/new'
```

</td>
<td>

~20 tokens

```json
{
  "ref": "feature/new",
  "previousRef": "main",
  "created": true
}
```

</td>
</tr>
</table>

## Error — Branch Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
error: pathspec 'nonexistent' did not match any file(s) known to git
```

</td>
<td>

~25 tokens

```json
{
  "error": "git checkout failed: pathspec 'nonexistent' did not match any file(s) known to git"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Savings |
| ---------------- | ---------- | --------- | ------- |
| Switch branch    | ~20        | ~20       | 0%      |
| Create branch    | ~15        | ~20       | --*     |
| Branch not found | ~25        | ~25       | 0%      |

*Checkout responses are already compact; Pare adds value through consistent structured schema rather than token savings.

## Notes

- No compact mode; the response is already concise
- The `previousRef` is determined by running `git rev-parse --abbrev-ref HEAD` before checkout
- The `created` flag reflects whether `-b` was used to create a new branch
