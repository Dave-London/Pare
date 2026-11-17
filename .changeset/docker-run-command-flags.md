---
"@paretools/docker": patch
---

`run` no longer rejects a container command that starts with `-` (e.g. `--version` for an image with an ENTRYPOINT). Every `command` element is passed through after the image, where docker stops parsing its own options; only NUL and newline characters are rejected.
