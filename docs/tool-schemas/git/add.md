# git > add

Stages files for commit. Returns structured data with count and list of staged files.

**Command**: `git add -- <files...>` or `git add -A`

## Input Parameters

| Parameter | Type     | Default | Description                                 |
| --------- | -------- | ------- | ------------------------------------------- |
| `path`    | string   | cwd     | Repository path                             |
| `files`   | string[] | --      | File paths to stage (required unless `all`)  |
| `all`     | boolean  | `false` | Stage all changes (`git add -A`)            |

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
  "files": [
    "src/auth.ts",
    "src/index.ts",
    "tests/auth.test.ts"
  ]
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

| Scenario       | CLI Tokens | Pare Full | Savings |
| -------------- | ---------- | --------- | ------- |
| Stage 3 files  | ~5         | ~25       | --*     |

*`git add` produces no output on success; Pare adds value by returning which files were staged via a follow-up `git status --porcelain=v1` call.

## Notes

- No compact mode; the response is already concise
- After staging, Pare runs `git status --porcelain=v1` to determine which files are staged
- File path resolution handles case sensitivity on Windows
- Either `files` or `all: true` must be provided; omitting both throws an error
