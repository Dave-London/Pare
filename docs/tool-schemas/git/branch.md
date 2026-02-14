# git > branch

Lists, creates, or deletes branches. Returns structured branch data.

**Command**: `git branch` (with `-a` for all, `git checkout -b` for create, `git branch -d` for delete)

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path                                            |
| `create`  | string  | --      | Create a new branch with this name                         |
| `delete`  | string  | --      | Delete branch with this name                               |
| `all`     | boolean | `false` | Include remote branches                                    |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Branches

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
  develop
  feature/auth
* main
  release/v1.0
```

</td>
<td>

~70 tokens

```json
{
  "branches": [
    { "name": "develop", "current": false },
    { "name": "feature/auth", "current": false },
    { "name": "main", "current": true },
    { "name": "release/v1.0", "current": false }
  ],
  "current": "main"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "branches": ["develop", "feature/auth", "main", "release/v1.0"],
  "current": "main"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 4 local branches   | ~60        | ~70       | ~30          | 50%*    |
| 20 branches (-a)   | ~300       | ~350      | ~100         | 67%*    |

*Full mode may be slightly larger than CLI for small branch lists; compact mode provides the savings.

## Notes

- Create uses `git checkout -b` internally, switching to the new branch
- Delete uses `git branch -d` (safe delete); branches with unmerged changes will error
- Compact mode reduces branches to a simple string array, dropping `current` and `upstream` metadata per branch
- The `current` field at the top level always identifies the active branch
