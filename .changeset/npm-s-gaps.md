---
"@paretools/npm": minor
---

Implement S-complexity gaps for npm tools:

**audit**: Add `level` (severity enum), `production` (boolean), `omit` (array), `workspace`, and `args` params. Add `cve`/`cwe` fields to vulnerability output schema.

**info**: Add `registry`, `field`, and `workspace` params. Add `engines`, `peerDependencies`, `deprecated`, `repository`, `keywords`, `versions`, and `dist.integrity` to output schema.

**init**: Add `license`, `authorName`, `authorEmail`, `authorUrl`, `version`, `module`, and `workspace` params.

**install**: Add `global` and `registry` params.

**list**: Add `packages` (string[]), `workspace`, and `args` params.

**nvm**: Add `which` (Node.js binary path) and `arch` (architecture) to output schema.

**outdated**: Add `packages` (string[]), `workspace`, and `args` params.

**run**: Add `workspace` (string or string[]) and `scriptShell` params.

**search**: Add `exclude`, `registry`, and `searchopts` params. Add `keywords`, `score`, `links`, `scope`, and `registryTotal` to output schema.

**test**: Add `workspace` (string or string[]) param.
