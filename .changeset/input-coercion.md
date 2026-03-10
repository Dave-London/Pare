---
"@paretools/shared": patch
"@paretools/git": patch
"@paretools/github": patch
"@paretools/docker": patch
"@paretools/lint": patch
"@paretools/build": patch
"@paretools/cargo": patch
"@paretools/k8s": patch
"@paretools/search": patch
"@paretools/security": patch
"@paretools/test": patch
"@paretools/make": patch
"@paretools/remote": patch
---

fix: add input coercion for numeric and array parameters

MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.
