# github > release-list

Lists GitHub releases for a repository. Returns structured list with tag, name, draft/prerelease status, publish date, and URL.

**Command**: `gh release list --json tagName,name,isDraft,isPrerelease,publishedAt,url --limit 10`

## Input Parameters

| Parameter | Type    | Default      | Description                                                |
| --------- | ------- | ------------ | ---------------------------------------------------------- |
| `limit`   | number  | `10`         | Maximum number of releases to return                       |
| `repo`    | string  | current repo | Repository in owner/repo format                            |
| `path`    | string  | cwd          | Repository path                                            |
| `compact` | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
TITLE    TAG      PUBLISHED           DRAFT  PRERELEASE
v1.2.0   v1.2.0   about 2 days ago    false  false
v1.1.0   v1.1.0   about 2 weeks ago   false  false
v1.0.0   v1.0.0   about 1 month ago   false  false
```

</td>
<td>

~80 tokens

```json
{
  "releases": [
    {
      "tag": "v1.2.0",
      "name": "v1.2.0",
      "draft": false,
      "prerelease": false,
      "publishedAt": "2025-01-13T10:00:00Z",
      "url": "https://github.com/owner/repo/releases/tag/v1.2.0"
    },
    {
      "tag": "v1.1.0",
      "name": "v1.1.0",
      "draft": false,
      "prerelease": false,
      "publishedAt": "2025-01-01T10:00:00Z",
      "url": "https://github.com/owner/repo/releases/tag/v1.1.0"
    },
    {
      "tag": "v1.0.0",
      "name": "v1.0.0",
      "draft": false,
      "prerelease": false,
      "publishedAt": "2024-12-15T10:00:00Z",
      "url": "https://github.com/owner/repo/releases/tag/v1.0.0"
    }
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~45 tokens

```json
{
  "releases": [
    { "tag": "v1.2.0", "name": "v1.2.0", "draft": false, "prerelease": false },
    { "tag": "v1.1.0", "name": "v1.1.0", "draft": false, "prerelease": false },
    { "tag": "v1.0.0", "name": "v1.0.0", "draft": false, "prerelease": false }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------- | ---------- | --------- | ------------ | ------- |
| 3 releases  | ~150       | ~80       | ~45          | 47-70%  |
| No releases | ~20        | ~10       | ~10          | 50%     |

## Notes

- Compact mode drops `publishedAt` and `url`, keeping `tag`, `name`, `draft`, and `prerelease`
- Field names are mapped from gh CLI names: `tagName` to `tag`, `isDraft` to `draft`, `isPrerelease` to `prerelease`
- Use the `repo` parameter to list releases from any repository
