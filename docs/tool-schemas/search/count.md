# search > count

Counts pattern matches per file using ripgrep. Returns per-file match counts and totals.

**Command**: `rg --count <pattern> .`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `pattern`       | string  | —       | Regular expression pattern to count matches for            |
| `path`          | string  | cwd     | Directory or file to search in                             |
| `glob`          | string  | —       | Glob pattern to filter files (e.g., `*.ts`, `*.{js,jsx}`) |
| `caseSensitive` | boolean | `true`  | Case-sensitive search                                      |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Matches Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~65 tokens

```
$ rg --count "import" src/
src/index.ts:3
src/lib/parsers.ts:2
src/lib/formatters.ts:1
src/tools/search.ts:5
src/tools/find.ts:5
src/tools/count.ts:5
src/schemas/index.ts:1
```

</td>
<td>

~85 tokens

```json
{
  "files": [
    { "file": "src/index.ts", "count": 3 },
    { "file": "src/lib/parsers.ts", "count": 2 },
    { "file": "src/lib/formatters.ts", "count": 1 },
    { "file": "src/tools/search.ts", "count": 5 },
    { "file": "src/tools/find.ts", "count": 5 },
    { "file": "src/tools/count.ts", "count": 5 },
    { "file": "src/schemas/index.ts", "count": 1 }
  ],
  "totalMatches": 22,
  "totalFiles": 7
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
  "totalMatches": 22,
  "totalFiles": 7
}
```

</td>
</tr>
</table>

## Success — No Matches

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ rg --count "FIXME" src/
(no output, exit code 1)
```

</td>
<td>

~18 tokens

```json
{
  "files": [],
  "totalMatches": 0,
  "totalFiles": 0
}
```

</td>
</tr>
</table>

## Error — Invalid Regex

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
$ rg --count "[invalid" src/
rg: regex parse error:
    [invalid
    ^
error: unclosed character class
```

</td>
<td>

~18 tokens

```json
{
  "files": [],
  "totalMatches": 0,
  "totalFiles": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings  |
| -------------- | ---------- | --------- | ------------ | -------- |
| 7 files matched| ~65        | ~85       | ~15          | —/77%    |
| No matches     | ~10        | ~18       | ~15          | —        |
| Invalid regex  | ~25        | ~18       | ~15          | 28-40%   |

## Notes

- Uses `rg --count` which outputs one line per file in the format `file:count`
- The parser splits on the last colon in each line to correctly handle file paths containing colons (e.g., Windows drive letters like `C:\`)
- `caseSensitive` defaults to `true`; set to `false` to add `--ignore-case`
- The `glob` parameter maps to `rg --glob` for file filtering
- Unlike the `search` tool, `count` does not have a `maxResults` parameter — all matching files are returned
- Exit code 1 from ripgrep (no matches) is treated as a successful empty result, not an error
- Compact mode drops the per-file breakdown and returns only `totalMatches` and `totalFiles`
- Full mode may use slightly more tokens than raw CLI for small result sets due to JSON structure; compact mode always saves tokens
- Flag injection is blocked on `pattern`, `path`, and `glob` parameters
