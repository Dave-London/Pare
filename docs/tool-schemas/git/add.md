# git > add

Stages files for commit. Returns structured data with count and list of staged files.

**Command**: `git add -- <files...>` or `git add -A`

## Input Parameters

| Parameter  | Type     | Default | Description                                                                                          |
| ---------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `path`     | string   | cwd     | Repository path                                                                                      |
| `files`    | string[] | --      | File paths to stage (required unless `all`)                                                          |
| `all`      | boolean  | `false` | Stage all changes (`git add -A`)                                                                     |
| `update`   | boolean  | `false` | Stage only changes to tracked files (`git add -u`)                                                   |
| `resolved` | boolean  | `false` | Stage matching unmerged paths only when no conflict markers remain (`git add --resolved`, Git 2.56+) |

## Success

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
  "staged": 3,
  "files": ["src/auth.ts", "src/index.ts", "tests/auth.test.ts"]
}
```

</td>
</tr>
</table>

## Error — No Files Specified

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~20 tokens

```
Nothing specified, nothing added.
```

</td>
<td>

~20 tokens

```json
{
  "error": "Either 'files' must be provided or 'all' must be true"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Savings |
| ------------- | ---------- | --------- | ------- |
| Stage 3 files | ~5         | ~25       | --\*    |

\*`git add` produces no output on success; Pare adds value by returning which files were staged via a follow-up `git status --porcelain=v1` call.

## Notes

- With `resolved: true`, Git refuses the entire request if any matching unmerged file still contains conflict markers.
  It cannot be combined with `all` or `update`; older Git versions return an unsupported-option error without a fallback.
  Omitting `resolved` or setting it to `false` preserves ordinary staging behavior.
- No compact mode; the response is already concise
- After staging, Pare runs `git status --porcelain=v1` to determine which files are staged
- File path resolution handles case sensitivity on Windows for single-file pathspecs;
  `.`, directory, and glob pathspecs reach git untouched so they expand the way the CLI
  expands them (#1057)
- Either `files` or `all: true` must be provided; omitting both throws an error
