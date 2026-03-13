---
"@paretools/build": patch
"@paretools/docker": patch
"@paretools/test": patch
---

fix: validate args array elements with assertNoFlagInjection

Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.
