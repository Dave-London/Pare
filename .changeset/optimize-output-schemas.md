---
"@paretools/git": minor
"@paretools/github": minor
"@paretools/npm": minor
"@paretools/build": minor
"@paretools/lint": minor
"@paretools/cargo": minor
"@paretools/go": minor
"@paretools/test": minor
"@paretools/search": minor
"@paretools/http": minor
"@paretools/k8s": minor
"@paretools/security": minor
"@paretools/make": minor
"@paretools/process": minor
"@paretools/python": minor
"@paretools/docker": minor
"@paretools/shared": minor
---

Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.
