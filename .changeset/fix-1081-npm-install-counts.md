---
"@paretools/npm": patch
---

fix(npm): make install `added`/`removed`/`changed` agree with `packageDetails`

pnpm never prints npm's "added N packages" summary sentence, so `install` on a
pnpm project returned `added: 0, removed: 0, changed: 0` even when
`packageDetails` listed every package that moved. Counters are now derived from
`packageDetails` when no npm summary line is present, and fall back to pnpm's
store-level `Packages: +N -M` line when there are no per-package details at all.

A same-name version bump (pnpm prints `- pkg 1.0.0` then `+ pkg 1.1.0`) is now
reported as a single `updated` entry with a new optional `previousVersion`
field instead of one addition plus one removal. npm and yarn parsing is
unchanged.
