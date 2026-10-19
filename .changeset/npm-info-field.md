---
"@paretools/npm": patch
"@paretools/shared": patch
---

fix(npm): `info` with `field` now returns `{ name, field, value }` with the field's real value (or no `value` when the package does not set it). It used to return a placeholder `{ name: "unknown", version: "0.0.0" }`, because npm prints a bare value for a single field (#1164). Package metadata that is not a JSON object is now an error rather than placeholder values. Also, a "Command not found" error from a `.cmd` wrapper now names the program cmd.exe could not find when it is not the wrapper itself (#1093)
