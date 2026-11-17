---
"@paretools/github": patch
---

`api` explains non-JSON responses instead of returning an empty body with a bare decoder message (#1256). Plain-text bodies such as Actions job logs come back as a string `body` with the BOM removed. When gh cannot decode a non-JSON body itself (`jq` on a job log, an HTML 502 page on `graphql`), the result carries an `errorMessage` naming the HTTP status, the content type and the fix. A non-JSON error body (an HTML error page) is cut to a 500-character snippet with `bodyTruncated` and `bodyLength`, and the status is read from gh's `(HTTP nnn)` text when no headers were printed.
