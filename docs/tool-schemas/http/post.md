# http > post

Makes an HTTP POST request via curl and returns structured response data. Convenience wrapper for the `request` tool with a required body and configurable Content-Type.

**Command**: `curl -s -S -i -w '%{time_total} %{size_download}' -X POST -H 'Content-Type: application/json' --data-raw '<body>' <URL>`

## Input Parameters

| Parameter         | Type                     | Default              | Description                                                |
| ----------------- | ------------------------ | -------------------- | ---------------------------------------------------------- |
| `url`             | string                   | (required)           | The URL to request (http:// or https:// only)              |
| `body`            | string                   | (required)           | Request body                                               |
| `headers`         | Record\<string, string\> | —                    | Request headers as key-value pairs                         |
| `contentType`     | string                   | `"application/json"` | Content-Type header                                        |
| `timeout`         | number (1–300)           | `30`                 | Request timeout in seconds                                 |
| `followRedirects` | boolean                  | `true`               | Follow HTTP redirects                                      |
| `compact`         | boolean                  | `true`               | Auto-compact when structured output exceeds raw CLI tokens |
| `path`            | string                   | cwd                  | Working directory                                          |

## Success — JSON API Create

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
HTTP/1.1 201 Created
content-type: application/json; charset=utf-8
location: /api/users/42
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 52

{"id":42,"name":"Alice","email":"alice@example.com"}
```

</td>
<td>

~100 tokens

```json
{
  "status": 201,
  "statusText": "Created",
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "location": "/api/users/42",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "52"
  },
  "body": "{\"id\":42,\"name\":\"Alice\",\"email\":\"alice@example.com\"}",
  "timing": { "total": 0.189 },
  "size": 52,
  "contentType": "application/json; charset=utf-8"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "status": 201,
  "statusText": "Created",
  "contentType": "application/json; charset=utf-8",
  "size": 52,
  "timing": { "total": 0.189 }
}
```

</td>
</tr>
</table>

## Error — 422 Validation Error

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~140 tokens

```
HTTP/1.1 422 Unprocessable Entity
content-type: application/json
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 74

{"errors":[{"field":"email","message":"Invalid email format"}]}
```

</td>
<td>

~80 tokens

```json
{
  "status": 422,
  "statusText": "Unprocessable Entity",
  "headers": {
    "content-type": "application/json",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "74"
  },
  "body": "{\"errors\":[{\"field\":\"email\",\"message\":\"Invalid email format\"}]}",
  "timing": { "total": 0.095 },
  "size": 74,
  "contentType": "application/json"
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
  "status": 422,
  "statusText": "Unprocessable Entity",
  "contentType": "application/json",
  "size": 74,
  "timing": { "total": 0.095 }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 201 Created    | ~180       | ~100      | ~30          | 44–83%  |
| 422 Validation | ~140       | ~80       | ~25          | 43–82%  |

## Notes

- The `body` parameter is required, unlike the `request` tool where it is optional
- The `contentType` parameter defaults to `application/json` and is merged into the headers as the `Content-Type` header
- User-supplied headers take precedence over the `contentType` default if they include a `Content-Type` key
- Compact mode drops `headers` and `body`, keeping only `status`, `statusText`, `contentType`, `size`, and `timing`
- URLs are validated to allow only `http://` and `https://` schemes
