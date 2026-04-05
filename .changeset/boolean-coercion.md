---
"@paretools/shared": patch
"@paretools/git": patch
"@paretools/github": patch
"@paretools/npm": patch
"@paretools/docker": patch
"@paretools/build": patch
"@paretools/lint": patch
"@paretools/test": patch
"@paretools/search": patch
"@paretools/cargo": patch
"@paretools/go": patch
"@paretools/python": patch
"@paretools/k8s": patch
"@paretools/security": patch
"@paretools/make": patch
"@paretools/process": patch
---

Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas
