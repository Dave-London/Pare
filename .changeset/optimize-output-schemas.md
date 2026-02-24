---
"@paretools/http": minor
"@paretools/k8s": minor
"@paretools/security": minor
"@paretools/make": minor
"@paretools/process": minor
"@paretools/shared": minor
---

Optimize output schemas across 5 server packages: remove echo-back fields, move display-only data to formatters, and ensure compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.
