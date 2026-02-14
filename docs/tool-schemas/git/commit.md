# git > commit

Creates a commit with the given message. Returns structured data with hash, message, and change statistics.

**Command**: `git commit --file -` (message piped via stdin)

## Input Parameters

| Parameter | Type    | Default | Description           |
| --------- | ------- | ------- | --------------------- |
| `path`    | string  | cwd     | Repository path       |
| `message` | string  | --      | Commit message        |
| `amend`   | boolean | `false` | Amend previous commit |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
[main abc1234] feat: add user authentication
 3 files changed, 79 insertions(+), 1 deletion(-)
 create mode 100644 src/auth.ts
 create mode 100644 tests/auth.test.ts
```

</td>
<td>

~30 tokens

```json
{
  "hash": "abc1234",
  "hashShort": "abc1234",
  "message": "feat: add user authentication",
  "filesChanged": 3,
  "insertions": 79,
  "deletions": 1
}
```

</td>
</tr>
</table>

## Error — Nothing to Commit

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
On branch main
nothing to commit, working tree clean
```

</td>
<td>

~20 tokens

```json
{
  "error": "git commit failed: nothing to commit, working tree clean"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Savings |
| ----------------- | ---------- | --------- | ------- |
| Commit 3 files    | ~40        | ~30       | 25%     |
| Nothing to commit | ~30        | ~20       | 33%     |

## Notes

- No compact mode; the response is already concise
- The message is passed via stdin (`--file -`) to avoid shell escaping issues on Windows
- The `amend` flag adds `--amend` to amend the previous commit
- Change statistics (files changed, insertions, deletions) are parsed from git's summary line
