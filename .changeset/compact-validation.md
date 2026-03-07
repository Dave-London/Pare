---
"@paretools/shared": patch
---

Add dev-mode runtime validation for compactDualOutput and strippedCompactDualOutput. When an optional `outputSchema` (Zod) is passed and `NODE_ENV !== 'production'` (or `PARE_DEBUG` is set), the structured output is validated against the schema before returning. Mismatches throw a descriptive error with field paths, catching compact-map / schema bugs during development and testing rather than in production.
