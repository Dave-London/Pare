# http > request

Makes an HTTP request via curl and returns structured response data (status, headers, body, timing). Supports all standard HTTP methods.

**Command**: `curl -s -S -i -w '%{time_total} %{size_download}' -X <METHOD> <URL>`

## Input Parameters

| Parameter         | Type                                                                                 | Default    | Description                                                |
| ----------------- | ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------- |
| `url`             | string                                                                               | (required) | The URL to request (http:// or https:// only)              |
| `method`          | `"GET"` \| `"POST"` \| `"PUT"` \| `"PATCH"` \| `"DELETE"` \| `"HEAD"` \| `"OPTIONS"` | `"GET"`    | HTTP method                                                |
| `headers`         | Record\<string, string\>                                                             | —          | Request headers as key-value pairs                         |
| `body`            | string                                                                               | —          | Request body (for POST, PUT, PATCH)                        |
| `timeout`         | number (1–300)                                                                       | `30`       | Request timeout in seconds                                 |
| `followRedirects` | boolean                                                                              | `true`     | Follow HTTP redirects                                      |
| `compact`         | boolean                                                                              | `true`     | Auto-compact when structured output exceeds raw CLI tokens |
| `path`            | string                                                                               | cwd        | Working directory                                          |

## Success — JSON API Response

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~220 tokens

```
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
x-request-id: abc123
cache-control: no-cache
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 82

{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"total":2}
```

</td>
<td>

~120 tokens

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": "abc123",
    "cache-control": "no-cache",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "82"
  },
  "body": "{\"users\":[{\"id\":1,\"name\":\"Alice\"},{\"id\":2,\"name\":\"Bob\"}],\"total\":2}",
  "timing": { "total": 0.245 },
  "size": 82,
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
  "status": 200,
  "statusText": "OK",
  "contentType": "application/json; charset=utf-8",
  "size": 82,
  "timing": { "total": 0.245 }
}
```

</td>
</tr>
</table>

## Error — Connection Refused

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
curl: (7) Failed to connect to localhost port 9999: Connection refused
```

</td>
<td>

~30 tokens

```json
{
  "status": 0,
  "statusText": "",
  "headers": {},
  "timing": { "total": 0 },
  "size": 0
}
```

</td>
</tr>
</table>

## Error — 404 Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
HTTP/1.1 404 Not Found
content-type: text/html
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 18

404 - Not Found
```

</td>
<td>

~60 tokens

```json
{
  "status": 404,
  "statusText": "Not Found",
  "headers": {
    "content-type": "text/html",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "18"
  },
  "body": "404 - Not Found",
  "timing": { "total": 0.102 },
  "size": 18,
  "contentType": "text/html"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| JSON API response  | ~220       | ~120      | ~30          | 45–86%  |
| 404 Not Found      | ~100       | ~60       | ~30          | 40–70%  |
| Connection refused | ~30        | ~30       | ~30          | 0%      |

## Notes

- URLs are validated to allow only `http://` and `https://` schemes; other schemes (e.g., `file://`) are rejected
- Header keys and values are checked for flag injection (e.g., values starting with `-` are blocked)
- When `followRedirects` is true, curl uses `-L` with a maximum of 10 redirect hops
- When following redirects, the response reflects the final destination (last HTTP response block)
- The `body` field is omitted from the response when the server returns no body
- Compact mode drops `headers` and `body`, keeping only `status`, `statusText`, `contentType`, `size`, and `timing`
- The response body is truncated to 500 characters in the human-readable text output
