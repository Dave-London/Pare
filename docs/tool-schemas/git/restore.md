# git > restore

Discards working tree changes or restores files from a specific commit. Returns structured data with restored files, source ref, and staged flag.

**Command**: `git restore [--staged] [--source <ref>] -- <files...>`

## Input Parameters

| Parameter | Type     | Default | Description                            |
| --------- | -------- | ------- | -------------------------------------- |
| `path`    | string   | cwd     | Repository path                        |
| `files`   | string[] | --      | File paths to restore                  |
| `staged`  | boolean  | `false` | Restore staged changes (`--staged`)    |
| `source`  | string   | --      | Restore from specific ref (`--source`) |

## Success — Discard Working Tree Changes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output on success)
```

</td>
<td>

~25 tokens

```json
{
  "restored": ["src/index.ts", "src/utils.ts"],
  "source": "HEAD",
  "staged": false
}
```

</td>
</tr>
</table>

## Success — Unstage Files

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output on success)
```

</td>
<td>

~20 tokens

```json
{
  "restored": ["src/index.ts"],
  "source": "HEAD",
  "staged": true
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Savings |
| --------------- | ---------- | --------- | ------- |
| Discard 2 files | ~5         | ~25       | --\*    |
| Unstage 1 file  | ~5         | ~20       | --\*    |

\*`git restore` produces no output on success; Pare adds value by confirming which files were restored and the restoration parameters.

## Notes

- No compact mode; the response is already concise
- `git restore` produces no stdout on success; the response is constructed from the input parameters
- Without `--source`, files are restored from HEAD (working tree) or the index (staged)
- The `staged` flag controls whether staged changes are restored (equivalent to `git restore --staged`)
- File path resolution handles case sensitivity on Windows
