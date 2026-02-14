# github > release-create

Creates a new GitHub release. Returns structured data with tag, URL, draft, and prerelease status.

**Command**: `gh release create v1.0.0 --title "v1.0.0" --notes "Release notes" --draft --prerelease`

## Input Parameters

| Parameter    | Type    | Default      | Description                             |
| ------------ | ------- | ------------ | --------------------------------------- |
| `tag`        | string  | —            | Tag name for the release                |
| `title`      | string  | tag name     | Release title                           |
| `notes`      | string  | —            | Release notes/body                      |
| `draft`      | boolean | `false`      | Create as draft release                 |
| `prerelease` | boolean | `false`      | Mark as prerelease                      |
| `target`     | string  | —            | Target commitish (branch or commit SHA) |
| `repo`       | string  | current repo | Repository in owner/repo format         |
| `path`       | string  | cwd          | Repository path                         |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
https://github.com/owner/repo/releases/tag/v1.0.0
```

</td>
<td>

~20 tokens

```json
{
  "tag": "v1.0.0",
  "url": "https://github.com/owner/repo/releases/tag/v1.0.0",
  "draft": false,
  "prerelease": false
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

## Error — Tag Already Exists

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
HTTP 422: Validation Failed: tag_name already exists
```

</td>
<td>

~25 tokens

```json
{
  "error": "gh release create failed: HTTP 422: Validation Failed: tag_name already exists"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| Release created | ~20        | ~20       | ~20          | 0%      |
| Tag exists      | ~25        | ~25       | ~25          | 0%      |

## Notes

- Token savings are minimal since both CLI and Pare output are small
- The primary benefit is structured, machine-parseable JSON output
- Input validation rejects flag injection in `tag`, `title`, `target`, and `repo` fields
- Use `target` to create a release from a specific branch or commit instead of HEAD
