# http > head

Makes an HTTP HEAD request via curl and returns structured response headers (no body). Use to check resource existence, content type, or cache headers without downloading the body.

**Command**: `curl -s -S -i -w '%{time_total} %{size_download}' -X HEAD <URL>`

## Input Parameters

| Parameter         | Type                     | Default    | Description                                                |
| ----------------- | ------------------------ | ---------- | ---------------------------------------------------------- |
| `url`             | string                   | (required) | The URL to request (http:// or https:// only)              |
| `headers`         | Record\<string, string\> | —          | Request headers as key-value pairs                         |
| `timeout`         | number (1–300)           | `30`       | Request timeout in seconds                                 |
| `followRedirects` | boolean                  | `true`     | Follow HTTP redirects                                      |
| `compact`         | boolean                  | `true`     | Auto-compact when structured output exceeds raw CLI tokens |
| `path`            | string                   | cwd        | Working directory                                          |

## Success — Check Resource Headers

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
HTTP/1.1 200 OK
content-type: application/pdf
content-length: 1048576
last-modified: Wed, 12 Feb 2026 08:00:00 GMT
etag: "f47ac10b"
cache-control: public, max-age=86400
date: Fri, 14 Feb 2026 12:00:00 GMT
```

</td>
<td>

~80 tokens

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/pdf",
    "content-length": "1048576",
    "last-modified": "Wed, 12 Feb 2026 08:00:00 GMT",
    "etag": "\"f47ac10b\"",
    "cache-control": "public, max-age=86400",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT"
  },
  "timing": { "total": 0.087 },
  "contentType": "application/pdf"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "status": 200,
  "statusText": "OK",
  "contentType": "application/pdf",
  "timing": { "total": 0.087 }
}
```

</td>
</tr>
</table>

## Error — 301 Redirect (followRedirects: false)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
HTTP/1.1 301 Moved Permanently
location: https://www.example.com/new-path
date: Fri, 14 Feb 2026 12:00:00 GMT
content-length: 0
```

</td>
<td>

~55 tokens

```json
{
  "status": 301,
  "statusText": "Moved Permanently",
  "headers": {
    "location": "https://www.example.com/new-path",
    "date": "Fri, 14 Feb 2026 12:00:00 GMT",
    "content-length": "0"
  },
  "timing": { "total": 0.054 }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "status": 301,
  "statusText": "Moved Permanently",
  "timing": { "total": 0.054 }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Resource headers      | ~150       | ~80       | ~20          | 47–87%  |
| 301 Redirect          | ~80        | ~55       | ~15          | 31–81%  |

## Notes

- HEAD requests never return a body; the response schema omits the `body` and `size` fields
- Useful for checking resource existence (status code), content type, file size (`content-length` header), and cache freshness (`etag`, `last-modified`) without downloading the full response
- Compact mode drops `headers`, keeping only `status`, `statusText`, `contentType`, and `timing`
- URLs are validated to allow only `http://` and `https://` schemes
- When `followRedirects` is false, redirect responses (3xx) are returned as-is, which is useful for inspecting redirect destinations via the `location` header
