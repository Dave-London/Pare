---
"@paretools/shared": patch
---

fix(shared): eliminate shell:true default to resolve CodeQL alert #16

Default `shell` to `false` on all platforms. On Windows, `.cmd`/`.bat` wrappers
are automatically detected and spawned via `cmd.exe` with `windowsVerbatimArguments`
(cross-spawn pattern), avoiding shell command injection from environment-resolved paths.
