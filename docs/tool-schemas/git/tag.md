# git > tag

Lists tags sorted by creation date. Returns structured tag data with name, date, and message.

**Command**: `git tag -l --sort=-creatordate --format='%(refname:short)\t%(creatordate:iso-strict)\t%(subject)'`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
v0.8.0
v0.7.1
v0.7.0
v0.6.0
v0.5.0
```

(standard `git tag` shows only names; Pare uses a custom format for richer data)

</td>
<td>

~80 tokens

```json
{
  "tags": [
    { "name": "v0.8.0", "date": "2026-02-10T14:30:00+00:00", "message": "Release v0.8.0" },
    { "name": "v0.7.1", "date": "2026-01-20T09:15:00+00:00", "message": "Patch release" },
    { "name": "v0.7.0", "date": "2026-01-05T11:00:00+00:00", "message": "Release v0.7.0" },
    { "name": "v0.6.0", "date": "2025-12-15T08:00:00+00:00" },
    { "name": "v0.5.0", "date": "2025-11-01T10:00:00+00:00" }
  ],
  "total": 5
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "tags": ["v0.8.0", "v0.7.1", "v0.7.0", "v0.6.0", "v0.5.0"],
  "total": 5
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario  | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------- | ---------- | --------- | ------------ | ------- |
| 5 tags    | ~80        | ~80       | ~25          | 0-69%   |
| 20 tags   | ~120       | ~300      | ~80          | 33%*    |

*Full mode is larger than CLI due to added metadata (dates, messages); compact mode provides savings.

## Notes

- Tags are sorted newest-first by creation date
- Full mode includes `date` (ISO 8601) and `message` (annotation subject) when available
- Compact mode reduces tags to a simple string array of names
- Lightweight tags may not have a `message` field
