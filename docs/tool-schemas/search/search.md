# search > search

Searches file contents using ripgrep with structured JSON output. Returns match locations with file, line, column, matched text, and line content.

**Command**: `rg --json <pattern> .`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `pattern`       | string  | —       | Regular expression pattern to search for                   |
| `path`          | string  | cwd     | Directory or file to search in                             |
| `glob`          | string  | —       | Glob pattern to filter files (e.g., `*.ts`, `*.{js,jsx}`)  |
| `caseSensitive` | boolean | `true`  | Case-sensitive search                                      |
| `maxResults`    | number  | `1000`  | Maximum number of matches to return                        |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Matches Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~220 tokens

```
$ rg "TODO" src/
src/lib/parsers.ts:12: // TODO: handle edge case for empty input
src/lib/parsers.ts:45: // TODO: add validation for malformed JSON
src/tools/search.ts:8: // TODO: support multiline matches
src/index.ts:3: // TODO: wire up new jq tool
src/schemas/index.ts:22: // TODO: add optional metadata field
```

</td>
<td>

~120 tokens

```json
{
  "matches": [
    {
      "file": "src/lib/parsers.ts",
      "line": 12,
      "column": 8,
      "matchText": "TODO",
      "lineContent": "// TODO: handle edge case for empty input"
    },
    {
      "file": "src/lib/parsers.ts",
      "line": 45,
      "column": 8,
      "matchText": "TODO",
      "lineContent": "// TODO: add validation for malformed JSON"
    },
    {
      "file": "src/tools/search.ts",
      "line": 8,
      "column": 8,
      "matchText": "TODO",
      "lineContent": "// TODO: support multiline matches"
    },
    {
      "file": "src/index.ts",
      "line": 3,
      "column": 8,
      "matchText": "TODO",
      "lineContent": "// TODO: wire up new jq tool"
    },
    {
      "file": "src/schemas/index.ts",
      "line": 22,
      "column": 8,
      "matchText": "TODO",
      "lineContent": "// TODO: add optional metadata field"
    }
  ],
  "totalMatches": 5,
  "filesSearched": 4
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
  "totalMatches": 5,
  "filesSearched": 4
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
$ rg "FIXME" src/
(no output, exit code 1)
```

</td>
<td>

~20 tokens

```json
{
  "matches": [],
  "totalMatches": 0,
  "filesSearched": 0
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
$ rg "[invalid" src/
rg: regex parse error:
    [invalid
    ^
error: unclosed character class
```

</td>
<td>

~20 tokens

```json
{
  "matches": [],
  "totalMatches": 0,
  "filesSearched": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| 5 matches     | ~220       | ~120      | ~15          | 45-93%  |
| No matches    | ~10        | ~20       | ~15          | —       |
| Invalid regex | ~25        | ~20       | ~15          | 20-40%  |

## Notes

- Uses `rg --json` to get structured JSONL output, then parses match events for file, line, column, match text, and full line content
- Column numbers are 1-based, derived from the first submatch offset
- `caseSensitive` defaults to `true`; set to `false` to add `--ignore-case`
- The `glob` parameter maps to `rg --glob` for file filtering (e.g., `*.ts` to search only TypeScript files)
- `maxResults` caps the number of returned matches but ripgrep still searches the full directory; use `glob` or `path` to narrow scope for performance
- Compact mode drops all individual matches and returns only `totalMatches` and `filesSearched` counts
- Exit code 1 from ripgrep (no matches) is treated as a successful empty result, not an error
- Flag injection is blocked: `pattern`, `path`, and `glob` are validated to reject values starting with `-`
