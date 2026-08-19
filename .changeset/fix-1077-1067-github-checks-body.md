---
"@paretools/github": patch
---

fix(github): never report `conclusion: "passed"` for zero checks, and cap unbounded `body` in pr-view/issue-view

**`pr-checks` (#1077)** — a PR with no reported check runs no longer reads as green:

- New `conclusion` value `"none"` for zero checks. The invariant is now
  `conclusion === "passed"` implies `checks.length > 0` and all of them succeeded, so a merge gate
  cannot mistake "CI has not started" for "CI is green".
- `watch: true` keeps polling until checks actually appear (previously it exited on the first poll
  with an empty array), and gh's "no checks reported" exit is treated as "nothing started yet"
  rather than a fatal error — new `errorType: "no-checks"`.
- Short settle grace: while gh itself still exits `8` within the first 30s, a checks array that
  merely looks terminal does not end the watch loop.
- Timing out with no checks returns `conclusion: "timed_out"` and an error message saying no checks
  were ever reported.

**`pr-view` / `issue-view` (#1067)** — `body` is no longer unbounded in full-schema mode:

- HTML `<details>…</details>` blocks are collapsed to their `<summary>` text plus ` […]`, then the
  result is capped at 4000 characters. This shrinks a typical Dependabot body by ~95%.
- New output fields `bodyTruncated` and `bodyLength` (original character count), plus a
  `body truncated …` line in the human-readable text.
- New input `maxBodyLength` to raise the cap, or `0` to disable both the collapse and the cap and
  return the body verbatim. Oversized `pr-view` `reviews[].body` values are shortened the same way.
