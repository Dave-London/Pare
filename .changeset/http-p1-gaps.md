---
"@paretools/http": minor
---

feat(http): add expanded timing, HEAD compact mode, and POST form param (P1)

- Add detailed timing breakdown (namelookup, connect, starttransfer, etc.) to all HTTP tools
- Preserve key headers in HEAD compact mode (content-length, cache-control, etag, etc.)
- Add `form` parameter to POST for multipart form data uploads
