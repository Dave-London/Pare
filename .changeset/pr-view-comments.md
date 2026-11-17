---
"@paretools/github": patch
---

fix(github): `pr-view` with `comments: true` now returns the PR's conversation comments as `comments[]` (author, createdAt, body), including in compact mode. gh only serialises fields named in `--json`, so the old `--comments` flag returned nothing (#1259). Comment bodies follow `maxBodyLength` like review bodies.
