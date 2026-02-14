# git > push

Pushes commits to a remote repository. Returns structured data with success status, remote, branch, and summary.

**Command**: `git push [--force] [-u] <remote> [<branch>]`

## Input Parameters

| Parameter     | Type    | Default    | Description                       |
| ------------- | ------- | ---------- | --------------------------------- |
| `path`        | string  | cwd        | Repository path                   |
| `remote`      | string  | `"origin"` | Remote name                       |
| `branch`      | string  | --         | Branch to push (default: current) |
| `force`       | boolean | `false`    | Force push (`--force`)            |
| `setUpstream` | boolean | `false`    | Set upstream tracking (`-u`)      |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 512 bytes | 512.00 KiB/s, done.
To github.com:user/repo.git
   abc1234..def5678  main -> main
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "remote": "origin",
  "branch": "main",
  "summary": "To github.com:user/repo.git\n   abc1234..def5678  main -> main"
}
```

</td>
</tr>
</table>

## Error — Rejected (Non-Fast-Forward)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~80 tokens

```
To github.com:user/repo.git
 ! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'github.com:user/repo.git'
hint: Updates were rejected because the tip of your current branch is behind
```

</td>
<td>

~30 tokens

```json
{
  "error": "git push failed: ! [rejected] main -> main (non-fast-forward)"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Savings |
| ----------- | ---------- | --------- | ------- |
| Normal push | ~60        | ~25       | 58%     |
| Rejected    | ~80        | ~30       | 63%     |

## Notes

- No compact mode; the response is already concise
- Git push output goes to stderr; both stdout and stderr are captured and combined
- The `summary` field contains the relevant push details from git's output
- Branch is resolved from the push output if not explicitly provided
