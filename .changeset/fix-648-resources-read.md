---
"@paretools/shared": patch
---

fix: register stub resource handlers to suppress spurious -32603 errors in OpenCode

Some MCP clients (e.g. OpenCode) fire a `resources/read` request after every tool call that returns `structuredContent`. Because Pare servers register no resource handlers, the SDK responded with `-32601 Method Not Found` (displayed as `-32603` by OpenCode). Now `createServer()` registers empty `resources/list` and `resources/read` handlers so these requests receive a clean `-32602 InvalidParams` ("Resource not found") response instead.
