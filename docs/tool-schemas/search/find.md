# search > find

Finds files and directories using fd with structured output. Returns file paths, names, and extensions.

**Command**: `fd --color never [pattern]`

## Input Parameters

| Parameter    | Type                                     | Default | Description                                                |
| ------------ | ---------------------------------------- | ------- | ---------------------------------------------------------- |
| `pattern`    | string                                   | —       | Regex pattern to match file/directory names                |
| `path`       | string                                   | cwd     | Directory to search in                                     |
| `type`       | `"file"` \| `"directory"` \| `"symlink"` | —       | Filter by entry type                                       |
| `extension`  | string                                   | —       | Filter by file extension (e.g., `ts`, `js`)                |
| `maxResults` | number                                   | `1000`  | Maximum number of results to return                        |
| `compact`    | boolean                                  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Files Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ fd --extension ts --type f src/
src/index.ts
src/lib/parsers.ts
src/lib/formatters.ts
src/schemas/index.ts
src/tools/search.ts
src/tools/find.ts
src/tools/count.ts
```

</td>
<td>

~130 tokens

```json
{
  "files": [
    { "path": "src/index.ts", "name": "index.ts", "ext": ".ts" },
    { "path": "src/lib/parsers.ts", "name": "parsers.ts", "ext": ".ts" },
    { "path": "src/lib/formatters.ts", "name": "formatters.ts", "ext": ".ts" },
    { "path": "src/schemas/index.ts", "name": "index.ts", "ext": ".ts" },
    { "path": "src/tools/search.ts", "name": "search.ts", "ext": ".ts" },
    { "path": "src/tools/find.ts", "name": "find.ts", "ext": ".ts" },
    { "path": "src/tools/count.ts", "name": "count.ts", "ext": ".ts" }
  ],
  "total": 7
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~8 tokens

```json
{
  "total": 7
}
```

</td>
</tr>
</table>

## Success — No Files Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
$ fd --extension rb src/
(no output)
```

</td>
<td>

~12 tokens

```json
{
  "files": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Error — Invalid Pattern

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
$ fd "[invalid"
[fd error]: Regex syntax error:
    [invalid
    ^
error: unclosed character class
```

</td>
<td>

~12 tokens

```json
{
  "files": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 7 files found   | ~80        | ~130      | ~8           | —/90%   |
| No files found  | ~5         | ~12       | ~8           | —       |
| Invalid pattern | ~30        | ~12       | ~8           | 60-73%  |

## Notes

- Uses `fd --color never` to get plain file paths, one per line
- Each file entry includes `path` (relative), `name` (basename), and `ext` (extension with leading dot, e.g., `.ts`)
- The `type` parameter maps to `fd --type`: `file` -> `f`, `directory` -> `d`, `symlink` -> `l`
- The `extension` parameter maps to `fd --extension` and should be provided without a leading dot (e.g., `ts` not `.ts`)
- `maxResults` maps to `fd --max-results` to cap results at the source
- All parameters (`pattern`, `path`, `extension`) are validated against flag injection
- Compact mode drops all individual file entries and returns only the `total` count
- Full mode may use more tokens than raw CLI for small result sets because it includes structured metadata (name, ext) per file; compact mode always saves tokens
- When no `pattern` is given, fd lists all files in the search path
