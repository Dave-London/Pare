# python > black

Runs Black code formatter and returns structured results with file change counts and reformat lists.

**Command**: `black <targets>` / `black --check <targets>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `targets` | string[] | `["."]` | Files or directories to format                             |
| `check`   | boolean  | `false` | Check mode (report without modifying files)                |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- All Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
All done! ✨ 🍰 ✨
8 files left unchanged.
```

</td>
<td>

~20 tokens

```json
{
  "filesChanged": 0,
  "filesUnchanged": 8,
  "filesChecked": 8,
  "success": true,
  "wouldReformat": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when no files changed).

</td>
</tr>
</table>

## Success -- Files Reformatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
reformatted src/api/views.py
reformatted src/utils/helpers.py
reformatted tests/test_api.py
All done! ✨ 🍰 ✨
3 files reformatted, 5 files left unchanged.
```

</td>
<td>

~40 tokens

```json
{
  "filesChanged": 3,
  "filesUnchanged": 5,
  "filesChecked": 8,
  "success": true,
  "wouldReformat": ["src/api/views.py", "src/utils/helpers.py", "tests/test_api.py"]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "success": true,
  "filesChanged": 3,
  "filesUnchanged": 5,
  "filesChecked": 8
}
```

</td>
</tr>
</table>

## Check Mode -- Would Reformat

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
would reformat src/api/views.py
would reformat src/utils/helpers.py
Oh no! 💥 💔 💥
2 files would be reformatted, 6 files would be left unchanged.
```

</td>
<td>

~35 tokens

```json
{
  "filesChanged": 2,
  "filesUnchanged": 6,
  "filesChecked": 8,
  "success": false,
  "wouldReformat": ["src/api/views.py", "src/utils/helpers.py"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| All formatted   | ~15        | ~20       | ~20          | 0%      |
| 3 files changed | ~60        | ~40       | ~15          | 33-75%  |
| Check mode (2)  | ~50        | ~35       | ~15          | 30-70%  |

## Notes

- Black writes most output to stderr; the parser handles both stdout and stderr
- In check mode (`--check`), exit code 1 means files would be reformatted and `success` is `false`
- The `wouldReformat` array lists files that were reformatted (or would be in check mode)
- Exit code 123 indicates a Black internal error
- Compact mode drops the `wouldReformat` file list, keeping only aggregate counts
