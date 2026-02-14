# github > api

Makes arbitrary GitHub API calls via `gh api`. Supports all HTTP methods, request bodies, field parameters, pagination, and jq filtering. Returns structured data with status, parsed JSON body, endpoint, and method.

**Command**: `gh api repos/owner/repo/pulls --method GET`

## Input Parameters

| Parameter  | Type                                                 | Default | Description                                         |
| ---------- | ---------------------------------------------------- | ------- | --------------------------------------------------- |
| `endpoint` | string                                               | —       | GitHub API endpoint (e.g., `repos/owner/repo/pulls`, `/user`) |
| `method`   | `"GET"` \| `"POST"` \| `"PATCH"` \| `"DELETE"` \| `"PUT"` | `"GET"` | HTTP method                                         |
| `body`     | object                                               | —       | JSON request body as key-value pairs                |
| `fields`   | object                                               | —       | Key-value pairs sent as `--raw-field` parameters    |
| `paginate` | boolean                                              | `false` | Enable pagination (fetch all pages)                 |
| `jq`       | string                                               | —       | jq filter expression                                |
| `path`     | string                                               | cwd     | Repository path                                     |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```json
[
  {
    "number": 42,
    "title": "feat: add dark mode",
    "state": "open",
    "user": { "login": "alice", "id": 12345, "avatar_url": "..." },
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z",
    "html_url": "https://github.com/owner/repo/pull/42",
    "labels": [],
    "draft": false,
    "head": { "ref": "feature/dark-mode", "sha": "abc123..." },
    "base": { "ref": "main", "sha": "def456..." }
  }
]
```

</td>
<td>

~85 tokens

```json
{
  "status": 200,
  "body": [
    {
      "number": 42,
      "title": "feat: add dark mode",
      "state": "open",
      "user": { "login": "alice", "id": 12345 },
      "html_url": "https://github.com/owner/repo/pull/42"
    }
  ],
  "endpoint": "repos/owner/repo/pulls",
  "method": "GET"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for API tool).

</td>
</tr>
</table>

## Error — Endpoint Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
gh: Not Found (HTTP 404)
```

</td>
<td>

~20 tokens

```json
{
  "error": "gh api failed: Not Found (HTTP 404)"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| API GET response  | ~300       | ~85       | ~85          | 72%     |
| API 404 error     | ~30        | ~20       | ~20          | 33%     |

## Notes

- The `body` in the response is the parsed JSON from the API response (or raw string if not valid JSON)
- The `status` is mapped from the exit code: `0` becomes `200`, non-zero becomes `422`
- Request body is passed via stdin (`--input -`) to avoid shell escaping issues
- Fields are passed as `--raw-field key=value` parameters
- Use `paginate: true` with `--paginate` to fetch all pages of paginated endpoints
- The `jq` parameter allows server-side filtering before returning results
- No compact mode exists for this tool; the response body varies per endpoint
