---
"@paretools/test": patch
"@paretools/build": patch
"@paretools/npm": patch
"@paretools/cargo": patch
"@paretools/docker": patch
"@paretools/make": patch
---

Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).
