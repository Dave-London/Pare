---
"@paretools/build": minor
---

feat(build): add env params, improve parsers, normalize output fields (P1)

- Add `env` parameter to build and webpack tools
- Improve error/warning detection heuristics
- Add `define` and `metafile` params to esbuild
- Distinguish local vs remote cache in Nx output
- Normalize duration to milliseconds in Turbo output
- Normalize file sizes to bytes in Vite output
- Add `profile` param to webpack
