# github > pr-merge

Merges a pull request by number. Returns structured data with merge status, method, and URL.

**Command**: `gh pr merge 42 --squash`

## Input Parameters

| Parameter      | Type                                     | Default    | Description                                                |
| -------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------- |
| `number`       | number                                   | —          | Pull request number                                       |
| `method`       | `"squash"` \| `"merge"` \| `"rebase"`   | `"squash"` | Merge method                                               |
| `deleteBranch` | boolean                                  | `false`    | Delete branch after merge                                  |
| `path`         | string                                   | cwd        | Repository path                                            |
| `compact`      | boolean                                  | `true`     | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
✓ Squashed and merged pull request #42 (feat: add dark mode)
https://github.com/owner/repo/pull/42
```

</td>
<td>

~20 tokens

```json
{
  "number": 42,
  "merged": true,
  "method": "squash",
  "url": "https://github.com/owner/repo/pull/42"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Error — Merge Conflict

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
Pull request #42 is not mergeable: the base branch policy prohibits the merge.
```

</td>
<td>

~25 tokens

```json
{
  "error": "gh pr merge failed: Pull request #42 is not mergeable: the base branch policy prohibits the merge."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| PR merged     | ~30        | ~20       | ~20          | 33%     |
| Merge blocked | ~25        | ~25       | ~25          | 0%      |

## Notes

- The `merged` field is always `true` on success; errors throw before returning
- Use `deleteBranch: true` to automatically delete the head branch after merge
- The merge method maps to `--squash`, `--merge`, or `--rebase` flags on the gh CLI
