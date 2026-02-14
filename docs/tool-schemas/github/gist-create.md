# github > gist-create

Creates a new GitHub gist from one or more files. Returns structured data with gist ID, URL, and visibility.

**Command**: `gh gist create --desc "My snippet" --public file1.ts file2.ts`

## Input Parameters

| Parameter     | Type     | Default   | Description                         |
| ------------- | -------- | --------- | ----------------------------------- |
| `files`       | string[] | —         | File paths to include in the gist   |
| `description` | string   | —         | Gist description                    |
| `public`      | boolean  | `false`   | Create as public gist (default: secret) |
| `path`        | string   | cwd       | Working directory                   |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
https://gist.github.com/abc123def456
```

</td>
<td>

~15 tokens

```json
{
  "id": "abc123def456",
  "url": "https://gist.github.com/abc123def456",
  "public": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Error — File Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~15 tokens

```
failed to collect files for gist: open nonexistent.ts: no such file or directory
```

</td>
<td>

~20 tokens

```json
{
  "error": "gh gist create failed: failed to collect files for gist: open nonexistent.ts: no such file or directory"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Gist created  | ~15        | ~15       | ~15          | 0%      |
| File not found | ~15        | ~20       | ~20          | -33%    |

## Notes

- Token savings are minimal since both CLI and Pare output are small
- The primary benefit is structured, machine-parseable JSON with explicit `id`, `url`, and `public` fields
- The gist ID is extracted from the URL returned by `gh gist create`
- At least one file is required (enforced by `min(1)` validation)
