---
"@paretools/git": patch
---

`commit` with `amend: true, noEdit: true` now keeps the existing commit message (#1255). `message` is optional and is rejected with a clear error when combined with `noEdit`, `reuseMessage` or `fixup`, each of which supplies the message itself; previously a passed `message` silently replaced the message `noEdit` was meant to keep. Without `message` the tool no longer sends `--file -`, so `reuseMessage` and `fixup` (which git refused alongside `-F`) now work, and `--no-edit` is always passed so git never opens an editor.
