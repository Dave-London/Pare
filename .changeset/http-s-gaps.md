---
"@paretools/http": minor
---

Add S-complexity gap parameters to HTTP tools:

- **All tools**: `connectTimeout` (--connect-timeout), `basicAuth` (-u), `proxy` (-x)
- **get**: `queryParams` (URL-encoded query convenience), `httpVersion`, `resolve` (--resolve)
- **head**: Switch from `-X HEAD` to `-I` for correct HEAD behavior, `httpVersion`, `resolve`, `contentLength` parsed output field
- **post**: `preserveMethodOnRedirect` (--post301/302/303), `dataUrlencode` (--data-urlencode), `httpVersion`
- **request**: `httpVersion` (--http1.0/1.1/2), `cookie` (-b), `resolve` (--resolve)
