# http > get

Makes an HTTP GET request via curl and returns structured response data. Convenience wrapper for the `request` tool with the method fixed to GET.

**Command**: `curl -s -S -i -w '%{time_total} %{size_download}' -X GET <URL>`

## Input Parameters

| Parameter         | Type                     | Default    | Description                                                |
| ----------------- | ------------------------ | ---------- | ---------------------------------------------------------- |
| `url`             | string                   | (required) | The URL to request (http:// or https:// only)              |
| `headers`         | Record\<string, string\> | —          | Request headers as key-value pairs                         |
| `timeout`         | number (1–300)           | `30`       | Request timeout in seconds                                 |
| `followRedirects` | boolean                  | `true`     | Follow HTTP redirects                                      |
| `compact`         | boolean                  | `true`     | Auto-compact when structured output exceeds raw CLI tokens |
| `path`            | string                   | cwd        | Working directory                                          |

## Success — HTML Page

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
etag: "abc123"
cache-control: max-age=3600
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 142

<!DOCTYPE html>
<html><head><title>Example</title></head>
<body><h1>Hello, world!</h1></body></html>
```

</td>
<td>

~110 tokens

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "etag": "\"abc123\"",
    "cache-control": "max-age=3600",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "142"
  },
  "body": "<!DOCTYPE html>\n<html><head><title>Example</title></head>\n<body><h1>Hello, world!</h1></body></html>",
  "timing": { "total": 0.312 },
  "size": 142,
  "contentType": "text/html; charset=utf-8"
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
  "contentType": "text/html; charset=utf-8",
  "size": 142,
  "timing": { "total": 0.312 }
}
```

</td>
</tr>
</table>

## Error — Timeout

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
curl: (28) Operation timed out after 30001 milliseconds
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

## Token Savings

| Scenario  | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------- | ---------- | --------- | ------------ | ------- |
| HTML page | ~200       | ~110      | ~30          | 45–85%  |
| Timeout   | ~25        | ~30       | ~30          | 0%      |

## Notes

- This is a convenience wrapper around the `request` tool with method fixed to `GET`
- No `body` or `method` parameters are exposed since GET requests should not include a body
- Compact mode drops `headers` and `body`, keeping only `status`, `statusText`, `contentType`, `size`, and `timing`
- URLs are validated to allow only `http://` and `https://` schemes
