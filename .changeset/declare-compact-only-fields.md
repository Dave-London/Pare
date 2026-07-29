---
"@paretools/shared": patch
"@paretools/python": patch
"@paretools/lint": patch
"@paretools/go": patch
"@paretools/cargo": patch
---

Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.
