# git > commit

Creates a commit with the given message. Returns structured data with hash, message, and change statistics.

**Command**: `git commit --file -` (message piped via stdin)

## Input Parameters

| Parameter | Type    | Default | Description                                                                          |
| --------- | ------- | ------- | ------------------------------------------------------------------------------------ |
| `path`    | string  | cwd     | Repository path                                                                      |
| `message` | string  | --      | Commit message; required unless `noEdit`, `reuseMessage` or `fixup` is set           |
| `amend`   | boolean | `false` | Amend previous commit                                                                |
| `noEdit`  | boolean | --      | Keep the existing message (`--no-edit`); with `amend`, the previous commit's message |

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
- `noEdit`, `reuseMessage` (`-C`) and `fixup` each supply the message themselves, so `message` is rejected with any of them (git would otherwise let the piped message silently replace the kept one). Without `message`, no `--file -` is sent and `--no-edit` is always passed, so git never opens an editor
- Change statistics (files changed, insertions, deletions) are parsed from git's summary line
