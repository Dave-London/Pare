# git > reset

Unstages files by resetting them to a ref (default: HEAD). Returns structured data with the ref and list of unstaged files.

**Command**: `git reset <ref> [-- <files...>]`

## Input Parameters

| Parameter | Type     | Default  | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `path`    | string   | cwd      | Repository path                      |
| `files`   | string[] | --       | File paths to unstage (omit for all) |
| `ref`     | string   | `"HEAD"` | Ref to reset to                      |

## Success — Unstage Specific Files

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
Unstaged changes after reset:
M	src/index.ts
M	src/utils.ts
```

</td>
<td>

~20 tokens

```json
{
  "ref": "HEAD",
  "unstaged": ["src/index.ts", "src/utils.ts"]
}
```

</td>
</tr>
</table>

## Success — Unstage All

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
Unstaged changes after reset:
M	src/index.ts
```

</td>
<td>

~15 tokens

```json
{
  "ref": "HEAD",
  "unstaged": ["src/index.ts"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Savings |
| --------------- | ---------- | --------- | ------- |
| Unstage 2 files | ~20        | ~20       | 0%      |
| Unstage all     | ~10        | ~15       | --\*    |

\*Reset responses are already compact; Pare adds value through consistent structured schema.

## Notes

- No compact mode; the response is already concise
- Only performs `git reset` (mixed reset) which unstages files without discarding working tree changes
- Unstaged file list is parsed from git's output lines matching the `<status>\t<file>` pattern
- File path resolution handles case sensitivity on Windows
