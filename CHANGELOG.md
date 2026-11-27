# Changelog

This is a monorepo managed by [changesets](https://github.com/changesets/changesets) with fixed versioning: every published package is released together at the same version.

Each package maintains its own changelog:

<!-- BEGIN PACKAGE TABLE -->

| Package                                                                    | Changelog                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`@paretools/bazel`](https://www.npmjs.com/package/@paretools/bazel)       | [packages/server-bazel/CHANGELOG.md](packages/server-bazel/CHANGELOG.md)       |
| [`@paretools/build`](https://www.npmjs.com/package/@paretools/build)       | [packages/server-build/CHANGELOG.md](packages/server-build/CHANGELOG.md)       |
| [`@paretools/bun`](https://www.npmjs.com/package/@paretools/bun)           | [packages/server-bun/CHANGELOG.md](packages/server-bun/CHANGELOG.md)           |
| [`@paretools/cargo`](https://www.npmjs.com/package/@paretools/cargo)       | [packages/server-cargo/CHANGELOG.md](packages/server-cargo/CHANGELOG.md)       |
| [`@paretools/cmake`](https://www.npmjs.com/package/@paretools/cmake)       | [packages/server-cmake/CHANGELOG.md](packages/server-cmake/CHANGELOG.md)       |
| [`@paretools/db`](https://www.npmjs.com/package/@paretools/db)             | [packages/server-db/CHANGELOG.md](packages/server-db/CHANGELOG.md)             |
| [`@paretools/deno`](https://www.npmjs.com/package/@paretools/deno)         | [packages/server-deno/CHANGELOG.md](packages/server-deno/CHANGELOG.md)         |
| [`@paretools/docker`](https://www.npmjs.com/package/@paretools/docker)     | [packages/server-docker/CHANGELOG.md](packages/server-docker/CHANGELOG.md)     |
| [`@paretools/dotnet`](https://www.npmjs.com/package/@paretools/dotnet)     | [packages/server-dotnet/CHANGELOG.md](packages/server-dotnet/CHANGELOG.md)     |
| [`@paretools/git`](https://www.npmjs.com/package/@paretools/git)           | [packages/server-git/CHANGELOG.md](packages/server-git/CHANGELOG.md)           |
| [`@paretools/github`](https://www.npmjs.com/package/@paretools/github)     | [packages/server-github/CHANGELOG.md](packages/server-github/CHANGELOG.md)     |
| [`@paretools/go`](https://www.npmjs.com/package/@paretools/go)             | [packages/server-go/CHANGELOG.md](packages/server-go/CHANGELOG.md)             |
| [`@paretools/http`](https://www.npmjs.com/package/@paretools/http)         | [packages/server-http/CHANGELOG.md](packages/server-http/CHANGELOG.md)         |
| [`@paretools/infra`](https://www.npmjs.com/package/@paretools/infra)       | [packages/server-infra/CHANGELOG.md](packages/server-infra/CHANGELOG.md)       |
| [`@paretools/init`](https://www.npmjs.com/package/@paretools/init)         | [packages/init/CHANGELOG.md](packages/init/CHANGELOG.md)                       |
| [`@paretools/jvm`](https://www.npmjs.com/package/@paretools/jvm)           | [packages/server-jvm/CHANGELOG.md](packages/server-jvm/CHANGELOG.md)           |
| [`@paretools/k8s`](https://www.npmjs.com/package/@paretools/k8s)           | [packages/server-k8s/CHANGELOG.md](packages/server-k8s/CHANGELOG.md)           |
| [`@paretools/lint`](https://www.npmjs.com/package/@paretools/lint)         | [packages/server-lint/CHANGELOG.md](packages/server-lint/CHANGELOG.md)         |
| [`@paretools/make`](https://www.npmjs.com/package/@paretools/make)         | [packages/server-make/CHANGELOG.md](packages/server-make/CHANGELOG.md)         |
| [`@paretools/nix`](https://www.npmjs.com/package/@paretools/nix)           | [packages/server-nix/CHANGELOG.md](packages/server-nix/CHANGELOG.md)           |
| [`@paretools/npm`](https://www.npmjs.com/package/@paretools/npm)           | [packages/server-npm/CHANGELOG.md](packages/server-npm/CHANGELOG.md)           |
| [`@paretools/process`](https://www.npmjs.com/package/@paretools/process)   | [packages/server-process/CHANGELOG.md](packages/server-process/CHANGELOG.md)   |
| [`@paretools/python`](https://www.npmjs.com/package/@paretools/python)     | [packages/server-python/CHANGELOG.md](packages/server-python/CHANGELOG.md)     |
| [`@paretools/remote`](https://www.npmjs.com/package/@paretools/remote)     | [packages/server-remote/CHANGELOG.md](packages/server-remote/CHANGELOG.md)     |
| [`@paretools/ruby`](https://www.npmjs.com/package/@paretools/ruby)         | [packages/server-ruby/CHANGELOG.md](packages/server-ruby/CHANGELOG.md)         |
| [`@paretools/search`](https://www.npmjs.com/package/@paretools/search)     | [packages/server-search/CHANGELOG.md](packages/server-search/CHANGELOG.md)     |
| [`@paretools/security`](https://www.npmjs.com/package/@paretools/security) | [packages/server-security/CHANGELOG.md](packages/server-security/CHANGELOG.md) |
| [`@paretools/shared`](https://www.npmjs.com/package/@paretools/shared)     | [packages/shared/CHANGELOG.md](packages/shared/CHANGELOG.md)                   |
| [`@paretools/swift`](https://www.npmjs.com/package/@paretools/swift)       | [packages/server-swift/CHANGELOG.md](packages/server-swift/CHANGELOG.md)       |
| [`@paretools/test`](https://www.npmjs.com/package/@paretools/test)         | [packages/server-test/CHANGELOG.md](packages/server-test/CHANGELOG.md)         |

<!-- END PACKAGE TABLE -->

## Aggregated changelog

Run `pnpm changelog` to regenerate the table above and the sections below from per-package changelogs. Dependency-only entries ("Updated dependencies") are left out; versions with no other changes are omitted.

<!-- BEGIN AGGREGATED CHANGELOG -->

### 0.24.1

#### @paretools/github

##### Patch Changes

- [#1268](https://github.com/Dave-London/Pare/pull/1268) [`eb28dc1`](https://github.com/Dave-London/Pare/commit/eb28dc131734912250753de820ad6facc0fb2265) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `pr-diff` with `full: true` now returns hunk `chunks` for every file. The chunk step re-read each filename with a regex that matched the first `b/` on the `diff --git` line, so any path containing `b/` (`.github/`, `lib/`, `web/`) got no chunks and the call returned stats only. Chunks are now paired with files by position, the same way the stats are parsed.

- [#1261](https://github.com/Dave-London/Pare/pull/1261) [`57b2363`](https://github.com/Dave-London/Pare/commit/57b2363c0e226b8aa2ed1a662b6924ba6466a011) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `pr-view` with `comments: true` now returns the PR's conversation comments as `comments[]` (author, createdAt, body), including in compact mode. gh only serialises fields named in `--json`, so the old `--comments` flag returned nothing ([#1259](https://github.com/Dave-London/Pare/issues/1259)). Comment bodies follow `maxBodyLength` like review bodies.

---

### 0.24.0

#### @paretools/docker

##### Patch Changes

- [#1232](https://github.com/Dave-London/Pare/pull/1232) [`4075c14`](https://github.com/Dave-London/Pare/commit/4075c1413a0a2ef78e40b307641f1de75ca11022) Thanks [@Dave-London](https://github.com/Dave-London)! - `run` no longer rejects a container command that starts with `-` (e.g. `--version` for an image with an ENTRYPOINT). Every `command` element is passed through after the image, where docker stops parsing its own options; only NUL and newline characters are rejected.

#### @paretools/git

##### Minor Changes

- [#1251](https://github.com/Dave-London/Pare/pull/1251) [`d2b78f4`](https://github.com/Dave-London/Pare/commit/d2b78f4a60eb9d0d1fc6e595137a1926afb022ee) Thanks [@MergingMonkey](https://github.com/MergingMonkey)! - Add an optional resolved mode to Git add for native conflict-resolution staging on Git 2.56+.
  Preserve Git's conflict-marker refusal without a fallback, reject all/update combinations, and omit still-unmerged paths from staged-file results.

##### Patch Changes

- [#1258](https://github.com/Dave-London/Pare/pull/1258) [`faedfad`](https://github.com/Dave-London/Pare/commit/faedfadfe78c260a74ebe1468176255d0c09d6e7) Thanks [@Dave-London](https://github.com/Dave-London)! - `commit` with `amend: true, noEdit: true` now keeps the existing commit message ([#1255](https://github.com/Dave-London/Pare/issues/1255)). `message` is optional and is rejected with a clear error when combined with `noEdit`, `reuseMessage` or `fixup`, each of which supplies the message itself; previously a passed `message` silently replaced the message `noEdit` was meant to keep. Without `message` the tool no longer sends `--file -`, so `reuseMessage` and `fixup` (which git refused alongside `-F`) now work, and `--no-edit` is always passed so git never opens an editor.

- [#1234](https://github.com/Dave-London/Pare/pull/1234) [`7453ae4`](https://github.com/Dave-London/Pare/commit/7453ae44d0219a799a92b19a1abfaf74e21356f7) Thanks [@Dave-London](https://github.com/Dave-London)! - `config` can now set `core.hooksPath` to a repo-tracked hooks directory such as `.githooks`: local or worktree scope only, a relative path that resolves (symlinks included) to a directory of tracked files inside the working tree. Global/system scope, absolute paths, paths outside the repo and untracked directories stay blocked.

- [#1231](https://github.com/Dave-London/Pare/pull/1231) [`a2557ac`](https://github.com/Dave-London/Pare/commit/a2557acda89053e29191682d8701d1027a777d83) Thanks [@fangjian-bit](https://github.com/fangjian-bit)! - fix(git): place `--chmod` and other flags before pathspec separator `--` in `git add` ([#1216](https://github.com/Dave-London/Pare/issues/1216))

- [#1212](https://github.com/Dave-London/Pare/pull/1212) [`b52cb66`](https://github.com/Dave-London/Pare/commit/b52cb66218e06071594dfb09fbd4f359fb9e025b) Thanks [@jsdhwfmax](https://github.com/jsdhwfmax)! - Continue resolved rebases, cherry-picks, and merges without launching an interactive
  commit-message editor. Keep the prepared commit message and override the editor
  only in the continuing Git child process.

#### @paretools/github

##### Patch Changes

- [#1260](https://github.com/Dave-London/Pare/pull/1260) [`80327ff`](https://github.com/Dave-London/Pare/commit/80327ff9ce1bdb6ebabe931d5adbdff0a081b32d) Thanks [@Dave-London](https://github.com/Dave-London)! - `api` explains non-JSON responses instead of returning an empty body with a bare decoder message ([#1256](https://github.com/Dave-London/Pare/issues/1256)). Plain-text bodies such as Actions job logs come back as a string `body` with the BOM removed. When gh cannot decode a non-JSON body itself (`jq` on a job log, an HTML 502 page on `graphql`), the result carries an `errorMessage` naming the HTTP status, the content type and the fix. A non-JSON error body (an HTML error page) is cut to a 500-character snippet with `bodyTruncated` and `bodyLength`, and the status is read from gh's `(HTTP nnn)` text when no headers were printed.

- [#1260](https://github.com/Dave-London/Pare/pull/1260) [`0a841ae`](https://github.com/Dave-London/Pare/commit/0a841aea2e988df38b64f617da55f41897df7b96) Thanks [@Dave-London](https://github.com/Dave-London)! - `run-view` no longer returns an unbounded log that MCP clients cut without a marker ([#1257](https://github.com/Dave-London/Pare/issues/1257)). With `log` or `logFailed` and no `tailLines`, logs are cut to the last 300 lines and 30,000 characters, and the result always carries `logsTotalLines`, `logsReturnedLines` and `logsTruncated`. A new `grep` input keeps only lines matching a case-insensitive regular expression (with `logsMatchedLines`), so a failure in the middle of a long log can be found. An explicit `tailLines` still returns exactly that many lines. Jobs in the run summary now include their `id`, for the `job` filter.

- [#1226](https://github.com/Dave-London/Pare/pull/1226) [`ea2e50c`](https://github.com/Dave-London/Pare/commit/ea2e50cc6423a715963641213532a6d38f38f5a9) Thanks [@fangjian-bit](https://github.com/fangjian-bit)! - fix(github): `issue-view` now includes comments in structured output when `comments: true` by requesting `comments` in `--json` fields ([#1224](https://github.com/Dave-London/Pare/issues/1224))

#### @paretools/npm

##### Minor Changes

- [#1245](https://github.com/Dave-London/Pare/pull/1245) [`b4d4e66`](https://github.com/Dave-London/Pare/commit/b4d4e662c47e510ae1e95a8e3b3aeba6d96896c4) Thanks [@MergingMonkey](https://github.com/MergingMonkey)! - Add an optional pnpmReporter: "silent" install input without relaxing package-operand validation or changing lifecycle-script defaults. Silent installs omit output-derived statistics, including added/removed/changed counts, and report unavailable counts in the readable summary. Install count fields are now optional in the output schema; ordinary install calls retain their existing statistics.

  Report nonzero install exit codes as tool failures for every supported package manager, including when node_modules already exists or output is empty. Bound failure diagnostics using the shared compact-output limits, compact each stream separately, preserve both ends when the character budget binds, and prioritize stderr so verbose stdout cannot hide the failure reason. Apply the same redaction and diagnostic limits to successful-exit verification failures, including project paths in the error context.

#### @paretools/python

##### Patch Changes

- [#1240](https://github.com/Dave-London/Pare/pull/1240) [`3f08104`](https://github.com/Dave-London/Pare/commit/3f08104e6a8020b7f048cb01e5d2787d3f7bdcf6) Thanks [@fangjian-bit](https://github.com/fangjian-bit)! - `mypy`: treat runs with only note diagnostics as successful passes without attaching `exitCode: 1` or error details, and support streaming NDJSON output parsing from `mypy --output json` ([#1223](https://github.com/Dave-London/Pare/issues/1223)).

- [#1227](https://github.com/Dave-London/Pare/pull/1227) [`23aaee5`](https://github.com/Dave-London/Pare/commit/23aaee52d3d6cb35db6096d73b06cf7af7183f71) Thanks [@fangjian-bit](https://github.com/fangjian-bit)! - fix(python): extract test failures from `short test summary info` when failure blocks are absent, supporting hyphenated/parameterized IDs and following `E` error lines ([#1222](https://github.com/Dave-London/Pare/issues/1222))

#### @paretools/shared

##### Patch Changes

- [#1244](https://github.com/Dave-London/Pare/pull/1244) [`13e48c3`](https://github.com/Dave-London/Pare/commit/13e48c3cea0f063d991ac95f68770423ca03adb7) Thanks [@MergingMonkey](https://github.com/MergingMonkey)! - Error output now redacts JSON-escaped Windows home paths such as `C:\\Users\\name\\project`, keeping the escape depth of the original text. A quote or other character that cannot occur in a Windows file name ends the profile-name match, so redaction no longer runs on into the next JSON string.

- [#1241](https://github.com/Dave-London/Pare/pull/1241) [`241b045`](https://github.com/Dave-London/Pare/commit/241b04510999bd2670e11ff0948ce9caea581f97) Thanks [@fangjian-bit](https://github.com/fangjian-bit)! - Add a shared stdio integration-test client helper that captures bounded child stderr and rethrows `connect()` failures with that stderr attached, making `MCP error -32000: Connection closed` failures diagnosable ([#1085](https://github.com/Dave-London/Pare/issues/1085)).

#### @paretools/test

##### Patch Changes

- [#1233](https://github.com/Dave-London/Pare/pull/1233) [`0ed0db1`](https://github.com/Dave-London/Pare/commit/0ed0db16978350fe1dd6857430b63a704a7064e9) Thanks [@Dave-London](https://github.com/Dave-London)! - `playwright` now passes `args` through verbatim, flags included (e.g. `["--list"]`), matching the `run` tool's passthrough `args`. Only NUL and newline characters are rejected; named params such as `project` and `grep` keep their flag guard. Tests with no results (listed by `--list`, or never run after `maxFailures`/an interruption) are now counted as skipped, as in Playwright's own stats, instead of being dropped from the totals.

---

### 0.23.3

#### @paretools/build

##### Patch Changes

- [#1203](https://github.com/Dave-London/Pare/pull/1203) [`6a1be02`](https://github.com/Dave-London/Pare/commit/6a1be02bd1739827914c9e8de5e3987304f13b06) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(build): `turbo` now returns each task's captured log as `output` (tail, capped): for every task when `outputLogs` is set to a mode that prints logs, and for failed tasks by default. `outputLogs` used to have no visible effect, and compact output now lists the failed tasks ([#1168](https://github.com/Dave-London/Pare/issues/1168)). `tsc` now reads diagnostics from Windows CRLF output; a failing typecheck used to report `errors: 0` there ([#1202](https://github.com/Dave-London/Pare/issues/1202))

#### @paretools/github

##### Patch Changes

- [#1204](https://github.com/Dave-London/Pare/pull/1204) [`0d8830c`](https://github.com/Dave-London/Pare/commit/0d8830cf3c073835446b13e9c4132d8fc6e0cc22) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `api` now rejects combining `jq`, `silent` and `verbose` with a clear message before calling gh, which accepts only one of them and refused the request with a usage error ([#1109](https://github.com/Dave-London/Pare/issues/1109)). `run-view` with `log`/`logFailed` gains `tailLines` to return only the end of the log (with `logsTotalLines`), and its text preview keeps the tail of a long log, where test failures and tracebacks are, instead of only the first 2000 characters ([#1108](https://github.com/Dave-London/Pare/issues/1108))

#### @paretools/infra

##### Patch Changes

- [#1205](https://github.com/Dave-London/Pare/pull/1205) [`3d0e338`](https://github.com/Dave-London/Pare/commit/3d0e338cee79e2075dd360ea4be03815088dab4b) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(infra): `init` accepts `backend: false`, mapping to `terraform init -backend=false`, so a validate-only workflow (`init` then `validate`) no longer fails on backend credentials ([#1103](https://github.com/Dave-London/Pare/issues/1103))

#### @paretools/lint

##### Patch Changes

- [#1201](https://github.com/Dave-London/Pare/pull/1201) [`c9f5d58`](https://github.com/Dave-London/Pare/commit/c9f5d5823891f7eda92dcfd34522393fd526c3eb) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(lint): `prettier-format` now reports `filesUnchanged` correctly. Prettier 3 prints already-formatted files as `file.ts 12ms (unchanged)`, and those lines were dropped, so the count was always 0 ([#1161](https://github.com/Dave-London/Pare/issues/1161))

#### @paretools/npm

##### Patch Changes

- [#1200](https://github.com/Dave-London/Pare/pull/1200) [`a719387`](https://github.com/Dave-London/Pare/commit/a719387df39ed67f96e280439d66e171a86fcf8b) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): `info` with `field` now returns `{ name, field, value }` with the field's real value (or no `value` when the package does not set it). It used to return a placeholder `{ name: "unknown", version: "0.0.0" }`, because npm prints a bare value for a single field ([#1164](https://github.com/Dave-London/Pare/issues/1164)). Package metadata that is not a JSON object is now an error rather than placeholder values. Also, a "Command not found" error from a `.cmd` wrapper now names the program cmd.exe could not find when it is not the wrapper itself ([#1093](https://github.com/Dave-London/Pare/issues/1093))

#### @paretools/shared

##### Patch Changes

- [#1200](https://github.com/Dave-London/Pare/pull/1200) [`a719387`](https://github.com/Dave-London/Pare/commit/a719387df39ed67f96e280439d66e171a86fcf8b) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): `info` with `field` now returns `{ name, field, value }` with the field's real value (or no `value` when the package does not set it). It used to return a placeholder `{ name: "unknown", version: "0.0.0" }`, because npm prints a bare value for a single field ([#1164](https://github.com/Dave-London/Pare/issues/1164)). Package metadata that is not a JSON object is now an error rather than placeholder values. Also, a "Command not found" error from a `.cmd` wrapper now names the program cmd.exe could not find when it is not the wrapper itself ([#1093](https://github.com/Dave-London/Pare/issues/1093))

---

### 0.23.2

#### @paretools/git

##### Patch Changes

- [#1194](https://github.com/Dave-London/Pare/pull/1194) [`0c8b8b2`](https://github.com/Dave-London/Pare/commit/0c8b8b2b8b6b68cc997fe2ab764d2530063f0c35) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): `diff` and `show` take each file's status from git (`--summary`) instead of guessing it from the line counts, so a modification that only removes lines is no longer reported as `deleted`, and one that only adds lines is no longer `added` ([#1099](https://github.com/Dave-London/Pare/issues/1099)). Lines that are not numstat rows are skipped instead of becoming entries with an empty `file` ([#1152](https://github.com/Dave-London/Pare/issues/1152)). Renamed files now report the real new path in `file` (and the old one in `oldFile`) instead of the `{old => new}` notation, so `full: true` attaches their patch

- [#1195](https://github.com/Dave-London/Pare/pull/1195) [`0d4dd0d`](https://github.com/Dave-London/Pare/commit/0d4dd0d9acd79004b80bbbbae2aebf9d0483e45f) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): `status` with `noLockIndex: true` now runs `git --no-optional-locks status`. It used to pass `--no-lock-index`, which `git status` rejects, so the option always failed ([#1167](https://github.com/Dave-London/Pare/issues/1167))

#### @paretools/github

##### Patch Changes

- [#1196](https://github.com/Dave-London/Pare/pull/1196) [`e4772ef`](https://github.com/Dave-London/Pare/commit/e4772ef1fd7af97534b389f69e796fed07cbeef5) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `issue-close` now returns the issue `url` and, when a comment was posted, its `commentUrl`. `gh issue close` prints neither, so they used to come back as `""` and unset; they are now looked up after closing, and `url` is omitted rather than `""` if the lookup fails ([#1170](https://github.com/Dave-London/Pare/issues/1170)). A new `commentPosted` field is `false` when the issue was already closed, because gh then skips the comment without an error

- [#1197](https://github.com/Dave-London/Pare/pull/1197) [`b90554c`](https://github.com/Dave-London/Pare/commit/b90554c45864da0cdd003c045a3981f1431fa933) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `issue-list` and `pr-list` no longer return other repositories' results for a `search` that uses `OR`. gh adds `repo:OWNER/REPO` to the search, and a bare `OR` split the query so that qualifier only covered the first alternative. The search is now grouped in parentheses, and any result from another repository is dropped and counted in `excludedOtherRepos` ([#1173](https://github.com/Dave-London/Pare/issues/1173))

- [#1198](https://github.com/Dave-London/Pare/pull/1198) [`f9d5c65`](https://github.com/Dave-London/Pare/commit/f9d5c659f9da0cb41faae931442428ec43e57d32) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): `pr-checks` no longer concludes `passed` while a workflow run for the PR's head commit has not completed. A run queued behind a `concurrency` group has no check run yet, so a few fast checks that had finished used to read as green. Before concluding `passed`, the tool now checks the head commit's workflow runs; any that are unfinished make the result `pending` (and keep `watch` polling), listed in the new `pendingRuns` field ([#1159](https://github.com/Dave-London/Pare/issues/1159))

---

### 0.23.1

#### @paretools/git

##### Patch Changes

- [#1156](https://github.com/Dave-London/Pare/pull/1156) [`e052df8`](https://github.com/Dave-London/Pare/commit/e052df8e18dfc6a203e11f04fe2ab6d601e3d9a3) Thanks [@jay23606](https://github.com/jay23606)! - fix(git): `branch` now filters the list with `--list <pattern>`. It used to pass the pattern as a bare name, which git reads as a branch to create, so filtering failed or created a branch ([#1155](https://github.com/Dave-London/Pare/issues/1155))

#### @paretools/python

##### Patch Changes

- [#1190](https://github.com/Dave-London/Pare/pull/1190) [`7512d09`](https://github.com/Dave-London/Pare/commit/7512d09718d740a68cb8aa5f13c7e45ed6f86101) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python): `pytest` only reads failure blocks from pytest's FAILURES and ERRORS sections, so pytest-cov's `____ coverage: platform ... ____` header (and `-rA`'s PASSES headers) no longer show up as a failed test on a passing run ([#1181](https://github.com/Dave-London/Pare/issues/1181)). The rule and header scans are linear now on long lines of `=` or `_` ([#1182](https://github.com/Dave-London/Pare/issues/1182))

#### @paretools/test

##### Patch Changes

- [#1192](https://github.com/Dave-London/Pare/pull/1192) [`5588bd2`](https://github.com/Dave-London/Pare/commit/5588bd2f946dc7d5b9d607597804986286279772) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): `coverage` now reports a run whose test runner exited non-zero (a failed test, a suite that failed to load, a hook that threw, or a missed `failUnder` / configured threshold) with an `error` field and the runner's output, instead of a clean-looking coverage result. A missed `failUnder` is named as the cause ([#1177](https://github.com/Dave-London/Pare/issues/1177))

- [#1193](https://github.com/Dave-London/Pare/pull/1193) [`8db3ab2`](https://github.com/Dave-London/Pare/commit/8db3ab2916a8efdf98436c2d920675d01d596662) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): `run` with Jest now parses real `jest --json` output (`name` / `assertionResults` per file). It read keys Jest never writes, so a passing run returned a tool error and a failing run came back as "0 tests". A file that fails to run (for example a missing module) is reported as a suite-level failure, ANSI codes are stripped from failure messages, and the duration comes from the report instead of the parse time ([#1176](https://github.com/Dave-London/Pare/issues/1176))

- [#1188](https://github.com/Dave-London/Pare/pull/1188) [`90b17e1`](https://github.com/Dave-London/Pare/commit/90b17e1ae976a591d625e64699a8767157f21146) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): `run` with pytest now reports tests that ERROR in setup or teardown, and modules that fail to collect. They are listed in `failures` and `tests` and counted in `summary.failed`, with the new optional `summary.errors` giving how many were errors, so a run with errors no longer reads as `failed: 0` ([#1178](https://github.com/Dave-London/Pare/issues/1178)). The summary-rule parsing is also linear now on long lines of `=` ([#1182](https://github.com/Dave-London/Pare/issues/1182))

- [#1187](https://github.com/Dave-London/Pare/pull/1187) [`b3ad257`](https://github.com/Dave-London/Pare/commit/b3ad257d7ab226d3fc0676139eb9668f532fc6af) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): `run` with `testNamePattern` and Vitest now passes `--testNamePattern`. It used to pass `--grep`, a Mocha flag that Vitest rejects, so no tests ran ([#1172](https://github.com/Dave-London/Pare/issues/1172))

---

### 0.23.0

#### @paretools/bazel

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/build

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/bun

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/cargo

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/cmake

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/db

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/deno

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/docker

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/dotnet

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/git

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/github

##### Minor Changes

- [#1163](https://github.com/Dave-London/Pare/pull/1163) [`7dfae71`](https://github.com/Dave-London/Pare/commit/7dfae71bc64aa6baa2351704f5ce93b7f1f9b1e0) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): require `PARE_GITHUB_ALLOWED_ACCOUNTS` to use the `account` option on `pr-review` and `pr-merge`; the option is refused unless the account is listed

- [#1160](https://github.com/Dave-London/Pare/pull/1160) [`56b0db8`](https://github.com/Dave-London/Pare/commit/56b0db84b4ad81b88e9fbf0505c4a8b88cf8dc38) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): add `account` option to `pr-review` and `pr-merge` to run a single call as another locally logged-in gh account without switching the active account

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/go

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/http

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/infra

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/init

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`8a584bb`](https://github.com/Dave-London/Pare/commit/8a584bb275403bb43a7b88761235c6a13640480d) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `smol-toml` 1.9.0 or newer, which fixes a quadratic-time `parse()` on documents with many keys (GHSA-r4xh-jqrq-34v2)

#### @paretools/jvm

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/k8s

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/lint

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/make

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/nix

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/npm

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/process

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/python

##### Patch Changes

- [#1179](https://github.com/Dave-London/Pare/pull/1179) [`5a39b61`](https://github.com/Dave-London/Pare/commit/5a39b610694076561f390c890a53893d036946e6) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python): stop `pytest` reporting `passed: 0` on a passing run when `-q` is also given in `extraArgs` or the project's `addopts`. The tool now pins an absolute `--verbosity` after all other options, and a passing run whose summary line cannot be found is returned with `countsUnavailable: true` instead of clean zero counts

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/remote

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/ruby

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/search

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/security

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/shared

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/swift

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

#### @paretools/test

##### Patch Changes

- [#1165](https://github.com/Dave-London/Pare/pull/1165) [`2a3b643`](https://github.com/Dave-London/Pare/commit/2a3b643c082ce4a8dedd69ba31f14f321b1ec724) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(deps): require `@modelcontextprotocol/sdk` 1.31.0 or newer, which fixes CVE-2026-104850 (OAuth client could send credentials to an authorization server chosen by the MCP server)

- [#1175](https://github.com/Dave-London/Pare/pull/1175) [`7ffc737`](https://github.com/Dave-London/Pare/commit/7ffc737d5b8465a5ab89d3909fa8bc2fb9ea056b) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): stop reporting a run as passing when the runner exits non-zero with no failed test. A Vitest suite whose `beforeAll`/`afterAll` throws, or a file that fails to load while others pass, now sets `error` and appears in `failures` instead of returning `failed: 0` with nothing else

---

### 0.22.2

#### @paretools/github

##### Patch Changes

- [#1083](https://github.com/Dave-London/Pare/pull/1083) [`1e398f1`](https://github.com/Dave-London/Pare/commit/1e398f113477325357247756edadc666d8bfaf03) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): never report `conclusion: "passed"` for zero checks, and cap unbounded `body` in pr-view/issue-view

  **`pr-checks` ([#1077](https://github.com/Dave-London/Pare/issues/1077))** — a PR with no reported check runs no longer reads as green:

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

  **`pr-view` / `issue-view` ([#1067](https://github.com/Dave-London/Pare/issues/1067))** — `body` is no longer unbounded in full-schema mode:

  - HTML `<details>…</details>` blocks are collapsed to their `<summary>` text plus ` […]`, then the
    result is capped at 4000 characters. This shrinks a typical Dependabot body by ~95%.
  - New output fields `bodyTruncated` and `bodyLength` (original character count), plus a
    `body truncated …` line in the human-readable text.
  - New input `maxBodyLength` to raise the cap, or `0` to disable both the collapse and the cap and
    return the body verbatim. Oversized `pr-view` `reviews[].body` values are shortened the same way.

#### @paretools/npm

##### Patch Changes

- [#1082](https://github.com/Dave-London/Pare/pull/1082) [`e97460a`](https://github.com/Dave-London/Pare/commit/e97460a2fcf98eee7c4166cfdd05add857078990) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): make install `added`/`removed`/`changed` agree with `packageDetails`

  pnpm never prints npm's "added N packages" summary sentence, so `install` on a
  pnpm project returned `added: 0, removed: 0, changed: 0` even when
  `packageDetails` listed every package that moved. Counters are now derived from
  `packageDetails` when no npm summary line is present, and fall back to pnpm's
  store-level `Packages: +N -M` line when there are no per-package details at all.

  A same-name version bump (pnpm prints `- pkg 1.0.0` then `+ pkg 1.1.0`) is now
  reported as a single `updated` entry with a new optional `previousVersion`
  field instead of one addition plus one removal. npm and yarn parsing is
  unchanged.

---

### 0.22.1

#### @paretools/git

##### Patch Changes

- [#1071](https://github.com/Dave-London/Pare/pull/1071) [`5dc635c`](https://github.com/Dave-London/Pare/commit/5dc635cb2cf57301f246a15b7059b97a17edb05b) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): `add` stages and reports "." / directory paths correctly; `branch` delete returns a compact confirmation instead of the full listing

- [#1076](https://github.com/Dave-London/Pare/pull/1076) [`5e34b25`](https://github.com/Dave-London/Pare/commit/5e34b25147349a52d51a48dc8458f3032b2cc279) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix two git-server bugs around paths and worktree removal.

  **`restore` verification lied about directory pathspecs ([#1068](https://github.com/Dave-London/Pare/issues/1068)).** The post-restore
  check compared `git status --porcelain` lines against the requested paths by exact
  string, so a directory pathspec (`src`, `src/`, `.`) never matched a status line and
  `verified: true` came back regardless of what was left dirty. Verification now treats
  a path as unrestored when any remaining status entry lies at or under it, and
  translates pathspecs to repo-relative form first so it stays correct when the tool
  runs from a subdirectory.

  **`worktree` removal could report a failure it had already half-committed to
  ([#1073](https://github.com/Dave-London/Pare/issues/1073)).** `git worktree remove` deletes the admin entry even when the recursive
  delete of the working directory fails first — on Windows a large `node_modules` tree
  trips that routinely with `Filename too long` — so `prune-merged` reported
  `remove-failed` while the worktree was in fact unregistered, leaving an orphaned
  directory that later `remove` calls rejected with "is not a working tree". Removal now
  re-checks registration on failure: still registered means a genuine failure, reported
  as `removed: false` with git's stderr in a new `error` field and nothing touched; no
  longer registered means only the directory delete failed, so the tool finishes it with
  a recursive delete and reports `removed: true` with `cleanedUp: true`. The same
  handling applies to `action: "remove"`, whose thrown error now carries git's stderr.

#### @paretools/python

##### Patch Changes

- [#1072](https://github.com/Dave-London/Pare/pull/1072) [`4f74147`](https://github.com/Dave-London/Pare/commit/4f741473e8e47dabc7700a695d2d3440f1e10d88) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python,test): parse pytest counts only from the final summary line

  The pytest summary parser scanned every output line for `N passed` / `N failed`
  patterns, so free text that happened to contain a number next to a status word —
  notably libpq's skip reason `port 5555 failed: Connection refused` — was scraped
  as a count, producing self-contradictory results such as `failed: 5555` with
  `success: true` and an empty `failures[]`. Counts now come only from pytest's own
  final summary line (`===== N passed, M skipped in Xs =====`, also matched
  undecorated under `-q`, last occurrence wins), a consistency guard zeroes
  failure/error counts that have neither a summary line nor a parsed failure block
  behind them, and a run with failures is never reported as a success.

#### @paretools/test

##### Patch Changes

- [#1072](https://github.com/Dave-London/Pare/pull/1072) [`4f74147`](https://github.com/Dave-London/Pare/commit/4f741473e8e47dabc7700a695d2d3440f1e10d88) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python,test): parse pytest counts only from the final summary line

  The pytest summary parser scanned every output line for `N passed` / `N failed`
  patterns, so free text that happened to contain a number next to a status word —
  notably libpq's skip reason `port 5555 failed: Connection refused` — was scraped
  as a count, producing self-contradictory results such as `failed: 5555` with
  `success: true` and an empty `failures[]`. Counts now come only from pytest's own
  final summary line (`===== N passed, M skipped in Xs =====`, also matched
  undecorated under `-q`, last occurrence wins), a consistency guard zeroes
  failure/error counts that have neither a summary line nor a parsed failure block
  behind them, and a run with failures is never reported as a success.

---

### 0.22.0

#### @paretools/cargo

##### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1030](https://github.com/Dave-London/Pare/pull/1030) [`522a6c0`](https://github.com/Dave-London/Pare/commit/522a6c0e2377d48d4aeaf8b9ec1da7d39b89ff18) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface silent toolchain failures and restore compact payloads (part of [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - `cargo build`/`check`/`clippy`/`test`: a non-zero exit with no parseable diagnostics/tests (missing Cargo.toml, toolchain error, clippy not installed) now attaches the raw stderr as `error` plus `exitCode` instead of returning a zeroed result that reads as clean. Failing tests and denied lints still parse normally with no `error`.
  - `cargo audit`: unparseable output (cargo-audit missing, advisory DB fetch failure) now surfaces `error`/`exitCode` instead of a false-clean "0 vulnerabilities" result. Exit 1 with vulnerabilities found remains a successful scan.
  - `cargo run` compact mode: keeps the executed binary's stdout/stderr, truncated to the shared compact budget with truncation metadata, instead of dropping them.
  - `cargo audit` compact mode: keeps the first 10 advisory identities (id, package, version, severity, title, patched) plus an omitted count, instead of an empty vulnerabilities list.
  - Compact mappers and text formatters pass through the new `error`/`exitCode` fields.

#### @paretools/github

##### Patch Changes

- [#1019](https://github.com/Dave-London/Pare/pull/1019) [`870d1f6`](https://github.com/Dave-London/Pare/commit/870d1f683171a78d2aca0d8106f537f4ee25f215) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix PR/issue mutation tools echoing `number`/`prNumber` as `0` when the `number` input is passed as a string. A new `resolveNumber` helper resolves numeric strings, `[#123](https://github.com/Dave-London/Pare/issues/123)` references, and PR/issue URLs to the actual number; branch names still resolve to `0`.

#### @paretools/go

##### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1029](https://github.com/Dave-London/Pare/pull/1029) [`efe7799`](https://github.com/Dave-London/Pare/commit/efe7799d841e3fd3c29ece2f2d11b4e1cae45c80) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface toolchain failures and restore compact payloads ([#1022](https://github.com/Dave-London/Pare/issues/1022), [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - `go test`: toolchain failures (e.g. "go: cannot find main module", bad -tags) that previously read as a zeroed clean result now surface the raw stderr tail via a new `error` field plus `exitCode`. Normal test failures are unaffected.
  - `golangci-lint`: the parser now uses the exit code and stderr; linter crashes/config errors that previously read as a clean `{diagnostics: [], errors: 0}` result now surface `error` and `exitCode`. Exit code 1 with issues found remains a normal result.
  - Compact `run`: stdout/stderr content is now kept (truncated to the shared compact budget with `stdoutTruncated`/`stderrTruncated` flags and total line counts) instead of being dropped entirely.
  - Compact `get`: failing packages are kept with their `error`/`errorType` instead of being dropped.
  - Compact `fmt`: parse errors are kept in full instead of being reduced to a count.
  - Compact `golangci-lint`: the first 20 diagnostics are now included (fix data stripped, `diagnosticsOmitted` count when capped) instead of counts only; `error` is passed through.

#### @paretools/lint

##### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1028](https://github.com/Dave-London/Pare/pull/1028) [`c78d2df`](https://github.com/Dave-London/Pare/commit/c78d2df84890b69e8134e52ed81ea8d089e741c6) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface linter config failures and keep the actionable payload in compact output.

  - All six linters (eslint, biome-check, stylelint, shellcheck, hadolint, oxlint) now attach `error` and `exitCode` when the CLI exits non-zero with zero parsed diagnostics, instead of reporting a false "clean" result on config errors or crashes ([#1024](https://github.com/Dave-London/Pare/issues/1024)). Exits caused by found violations are unaffected.
  - `format-check` surfaces prettier failures (exit > 1) as `error` instead of a silent `{formatted: false, files: []}` ([#1024](https://github.com/Dave-London/Pare/issues/1024)).
  - Compact lint output now keeps the first 25 diagnostics plus `diagnosticsTruncated`/`omittedCount` and the fixable counts, instead of dropping every diagnostic ([#1022](https://github.com/Dave-London/Pare/issues/1022)).
  - Compact `format-check` output now includes the failing file list (capped at 50 with `filesTruncated`) and `total` ([#1021](https://github.com/Dave-London/Pare/issues/1021)).
  - Compact `prettier-format`/`biome-format` output now includes the list of reformatted files (capped at 50 with `filesTruncated`) ([#1022](https://github.com/Dave-London/Pare/issues/1022)).

#### @paretools/npm

##### Patch Changes

- [#1031](https://github.com/Dave-London/Pare/pull/1031) [`2f95f18`](https://github.com/Dave-London/Pare/commit/2f95f18ba1951417d6345a72075927bf7f90f840) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface npm failures and restore the compact list payload.

  - `outdated`: a non-zero exit with no output, or npm's `{"error": ...}` JSON payload, now returns an error instead of reading as "everything up to date" ([#1024](https://github.com/Dave-London/Pare/issues/1024))
  - `audit`: unparseable output or a failed run (e.g. ENOLOCK) now returns a structured Pare error via the shared `errorOutput`/`classifyError` helpers instead of a raw SyntaxError or a false "no vulnerabilities" ([#1024](https://github.com/Dave-London/Pare/issues/1024))
  - compact `list` output now includes `dependencyCount`, `problems`, `packageManager`, and the first 20 top-level dependencies with an omitted-count marker ([#1022](https://github.com/Dave-London/Pare/issues/1022))
  - compact `info` output now includes `dependencyCount` and `versionCount` ([#1022](https://github.com/Dave-London/Pare/issues/1022))

#### @paretools/process

##### Patch Changes

- [#1020](https://github.com/Dave-London/Pare/pull/1020) [`aa8670a`](https://github.com/Dave-London/Pare/commit/aa8670a39e4f1016a2d4426d983b6faba3491080) Thanks [@Dave-London](https://github.com/Dave-London)! - Include stdout/stderr in compact `run` output instead of silently dropping them. Compact mode (the default) previously returned only `{exitCode, success, timedOut}`, making a successful command's output indistinguishable from a command that printed nothing. Each stream is now included, truncated to a small budget (first 40 lines + last 10 lines, with an 8KB per-stream byte cap). When truncation occurs, `stdoutTruncated`/`stderrTruncated` and `stdoutTotalLines`/`stderrTotalLines` are set so an agent knows to re-run with `compact:false` for the full output; when output fits the budget it is included whole with no truncation flags. The compact human-readable text now shows the (truncated) output as well.

#### @paretools/python

##### Minor Changes

- [#1023](https://github.com/Dave-London/Pare/pull/1023) [`59a3024`](https://github.com/Dave-London/Pare/commit/59a3024f1b73f405072cc922c955d0b89b393526) Thanks [@Dave-London](https://github.com/Dave-London)! - pytest: surface collection/startup error diagnostics and add `env`/`extraArgs` inputs ([#984](https://github.com/Dave-London/Pare/issues/984))

  - When a pytest run fails with no test results (e.g. `ModuleNotFoundError` from a src-layout project missing `PYTHONPATH`, or a broken plugin crashing at startup), the tool now includes `exitCode` and an `errorOutput` diagnostic (capped tail of the most informative output stream) instead of a silent all-zero result.
  - New `env` input: extra environment variables merged over the parent environment (e.g. `{"PYTHONPATH": "src"}`).
  - New `extraArgs` input: additional pytest CLI arguments passed through verbatim (e.g. `["-p", "no:logfire"]`).

##### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1032](https://github.com/Dave-London/Pare/pull/1032) [`8a6e788`](https://github.com/Dave-London/Pare/commit/8a6e78897b63f0dd0d9f7f6f172467f0544413cf) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface silent tool failures and restore compact-mode payloads (part of [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - pip-audit, mypy, ruff-check, ruff-format, pip-install, and poetry now attach `error` and `exitCode` when a run fails without producing parseable output, instead of returning a silent zeroed result — a crashed pip-audit no longer reads as "0 vulnerabilities", and pip's `ERROR:` lines are captured.
  - Compact mode now keeps the actionable payload: mypy/ruff diagnostics (first 20 + severity/fixable counts), pip-audit severity counts + vulnerability identities, pip-list name/version pairs, poetry package/artifact/message entries, pyenv version lists, and uv-run truncated stdout/stderr via the shared compact-stream budget.

#### @paretools/security

##### Patch Changes

- [#1027](https://github.com/Dave-London/Pare/pull/1027) [`15af6d5`](https://github.com/Dave-London/Pare/commit/15af6d56b71ecf1e89997a092b5801cdaa30ce75) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface scanner failures and restore compact findings payload for trivy, semgrep, and gitleaks.

  - A crashed scan (non-zero exit with no parseable report) no longer reads as a clean scan: the result now carries `error` (stderr/stdout tail) and `exitCode`, in both structured and text output.
  - Exit-code semantics are respected per tool: gitleaks exit 1 with a findings report, trivy `--exit-code`, and semgrep findings exits are still treated as successful scans.
  - Compact mode no longer drops the actionable payload: gitleaks compact (previously `{}`) now returns `totalFindings` plus the top findings (rule/file/line); trivy compact includes the top critical/high vulnerabilities (id, package, severity, fixed version); semgrep compact includes the top findings and always passes through `errors[]`. All compact projections carry `error`/`exitCode` and set a truncation flag when the list is cut.

#### @paretools/shared

##### Minor Changes

- [#1026](https://github.com/Dave-London/Pare/pull/1026) [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared compact-output and diagnostics helpers: `truncateStream`/`compactStreamFields` (head/tail + byte-cap stream truncation with `CompactStreamSchemaFields`, generalizing the server-process compact budget from [#1020](https://github.com/Dave-London/Pare/issues/1020)) and `surfaceEmptyFailure` (attaches `error`/`exitCode` when a CLI exits non-zero with nothing parseable, with `EmptyFailureSchemaFields`, generalizing server-test's `surfaceLoadFailure`). Foundation for epics [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024).

##### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

---

### 0.21.1

#### @paretools/shared

##### Patch Changes

- [#986](https://github.com/Dave-London/Pare/pull/986) [`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b) Thanks [@jamesx0416](https://github.com/jamesx0416)! - Close child stdin when no input is provided so commands that wait for EOF, including Bun scripts, can exit normally.

---

### 0.21.0

#### @paretools/build

##### Patch Changes

- [#971](https://github.com/Dave-London/Pare/pull/971) [`16ac1b4`](https://github.com/Dave-London/Pare/commit/16ac1b4c82ae6892df32437466e5d92024fa63ae) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(build): tsc never returns a contextless `success:false` — surface failure detail

  When `tsc` exits non-zero without emitting parseable diagnostics (a tsconfig
  error like `TS18003 No inputs were found`, a crash, or an npx/binary resolution
  failure), the result was `{success:false, diagnostics:[]}` — and the compact
  formatter even rendered it as "TypeScript: no errors found." `parseTscOutput`
  now attaches the raw stderr (or stdout, or a generic exit-code message) as a
  new optional `error` field whenever a failed run has no diagnostics, and the
  full/compact formatters surface it instead of implying success. Enforces the
  same "success:false ⟹ actionable output" invariant the vite-build tool got.
  The pure missing-binary case is already handled by the `assertBinaryAvailable`
  preflight. Closes [#965](https://github.com/Dave-London/Pare/issues/965).

- [#963](https://github.com/Dave-London/Pare/pull/963) [`48ef524`](https://github.com/Dave-London/Pare/commit/48ef524f04be60ca2a4d25fac3c3a0f4e88430d8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(build): vite-build success now tracks the process exit code; advisory stderr (rolldown-vite chunk-size / ineffective-dynamic-import) maps to warnings and never flips success, and a failed build always populates errors[]

#### @paretools/bun

##### Patch Changes

- [#970](https://github.com/Dave-London/Pare/pull/970) [`65a27a0`](https://github.com/Dave-London/Pare/commit/65a27a0ff41ac45b8b74719abd07130a69155208) Thanks [@jamesx0416](https://github.com/jamesx0416)! - fix(bun): allow compact outdated and pm ls output to omit package details

#### @paretools/git

##### Minor Changes

- [#966](https://github.com/Dave-London/Pare/pull/966) [`132366f`](https://github.com/Dave-London/Pare/commit/132366f0fc205e39707f76eeced9071164cca3e0) Thanks [@Dave-London](https://github.com/Dave-London)! - Add safe worktree-cleanup primitives ([#921](https://github.com/Dave-London/Pare/issues/921)): `branch` gains an opt-in `mergedInto` ancestry check (per-branch `merged`/`unmerged`), `worktree list` gains opt-in `withStatus` (dirty/ahead/behind/unpushed) and `mergedInto` enrichment, and a new `worktree` action `prune-merged {base, requireClean}` batch-removes merged-clean worktrees while refusing dirty, unmerged, locked, bare, main, and current worktrees.

##### Patch Changes

- [#962](https://github.com/Dave-London/Pare/pull/962) [`fff367d`](https://github.com/Dave-London/Pare/commit/fff367d9db21422aee9631f3b075739bd327e003) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): return file content from `show` with `file` + `ref` in compact mode

  `git show` with a `file` argument (blob extraction, e.g. `HEAD:src/index.ts`)
  returned empty content in the default compact mode — the compact projection
  used a commit-shaped map that emitted only an empty `hashShort` and a
  `"blob ref:file"` message, dropping `fileContent` entirely. Because the raw
  content and the structured payload are near-identical in size, the dual-output
  helper always selected the compact branch, so the content was effectively never
  returned unless `compact: false` was passed. `compactShowMap` now preserves
  `fileContent` and object metadata for non-commit objects (blob/tag/tree). Also
  raised the `file` input cap from 255 to 4096 chars to match `path`. Closes [#926](https://github.com/Dave-London/Pare/issues/926).

#### @paretools/github

##### Minor Changes

- [#961](https://github.com/Dave-London/Pare/pull/961) [`05c02dc`](https://github.com/Dave-London/Pare/commit/05c02dc47a0ca91938faa45c173963646e775b37) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): add a top-level `conclusion` to `pr-checks` and make watch-mode timeouts non-throwing

  `pr-checks` now returns `conclusion` (`"passed" | "failed" | "pending" | "timed_out"`) derived from the check buckets, so callers can branch on the aggregate outcome without re-deriving it from `summary`. In `watch` mode, hitting `watchTimeout` now returns the latest snapshot with `timedOut: true`, `conclusion: "timed_out"`, and `errorType: "watch-timeout"` instead of throwing — making "drive this PR to green" fully expressible as a single tool call whose result you branch on. Closes [#932](https://github.com/Dave-London/Pare/issues/932).

#### @paretools/test

##### Patch Changes

- [#964](https://github.com/Dave-London/Pare/pull/964) [`cfbe390`](https://github.com/Dave-London/Pare/commit/cfbe3909f69d0990864015d2179456b7dda3752e) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): surface load/collection failures instead of reporting silent green, and allow flag-prefixed passthrough args

---

### 0.20.0

#### @paretools/git

##### Patch Changes

- [#898](https://github.com/Dave-London/Pare/pull/898) [`9937409`](https://github.com/Dave-London/Pare/commit/99374097eb89f6c1032f4e5df0eb96443cebfc54) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix checkout branch creation with `track` and `startPoint` so flags are ordered before branch operands.

- [#912](https://github.com/Dave-London/Pare/pull/912) [`854ab00`](https://github.com/Dave-London/Pare/commit/854ab00fab5a2be229fc6ec089909c217f992f93) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stash-list reporting every entry as `stash@{0}`; resolve real incrementing indices from a date-free reflog selector so `--date` no longer corrupts them. Closes [#908](https://github.com/Dave-London/Pare/issues/908).

- [#911](https://github.com/Dave-London/Pare/pull/911) [`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7) Thanks [@Dave-London](https://github.com/Dave-London)! - Clarify that the `path` parameter is authoritative: when omitted, repo-scoped tools operate on the server's own process working directory (its launch dir), not the caller's cwd. Callers in a git worktree or other directory must pass `path` explicitly to avoid operating on the wrong repository. Adds a regression test, documents the behavior in mutating git tool descriptions and the README, and updates the shared `repoPathInput` schema description. Closes [#876](https://github.com/Dave-London/Pare/issues/876).

- [#910](https://github.com/Dave-London/Pare/pull/910) [`c0dc657`](https://github.com/Dave-London/Pare/commit/c0dc657a477a50cb1e3011241c5ede54702406ae) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `worktree` list with `listVerbose=true` crashing on git's `--verbose`/`--porcelain` conflict; locked/prunable detail (including prunable reason) is now surfaced via the porcelain parser. Closes [#906](https://github.com/Dave-London/Pare/issues/906).

#### @paretools/github

##### Minor Changes

- [#901](https://github.com/Dave-London/Pare/pull/901) [`ae87a75`](https://github.com/Dave-London/Pare/commit/ae87a754f4c6f0e0596ae74c6489bcf2c69e91b6) Thanks [@Dave-London](https://github.com/Dave-London)! - Add first-class GitHub Actions secret and variable management tools: `secret-set`, `secret-list`, `secret-delete`, `variable-set`, `variable-list`, and `variable-delete`. Secret and variable set operations send values through stdin; secret values are masked from structured output. Closes [#883](https://github.com/Dave-London/Pare/issues/883).

##### Patch Changes

- [#909](https://github.com/Dave-London/Pare/pull/909) [`36816d5`](https://github.com/Dave-London/Pare/commit/36816d53287a3681b60787bbcda309b58de5d575) Thanks [@Dave-London](https://github.com/Dave-London)! - Guard list/view parsers against empty stdout from `gh` commands (e.g. `gh pr list --search`, `gh issue list`) that exit 0 with no output, instead of throwing "Unexpected end of JSON input". Closes [#905](https://github.com/Dave-London/Pare/issues/905).

- [#904](https://github.com/Dave-London/Pare/pull/904) [`410edc9`](https://github.com/Dave-London/Pare/commit/410edc9fa2e3055cf083df6be88c21a8f5de6678) Thanks [@MohammadYusif](https://github.com/MohammadYusif)! - Fix `label-list` crashing with "Unexpected end of JSON input" when `--search` matches zero labels. `gh label list --search <term>` exits 0 but prints empty stdout (not `[]`); `parseLabelList` now treats empty/whitespace-only output as an empty list. Closes [#903](https://github.com/Dave-London/Pare/issues/903).

- [#913](https://github.com/Dave-London/Pare/pull/913) [`ac1a286`](https://github.com/Dave-London/Pare/commit/ac1a286bec21ad14aa60223347e770f17605d153) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix pr-diff so full=true returns patch/hunk content and nameOnly=true returns the changed file paths. Closes [#907](https://github.com/Dave-London/Pare/issues/907).

- [#900](https://github.com/Dave-London/Pare/pull/900) [`e736de7`](https://github.com/Dave-London/Pare/commit/e736de75e0cd0b72e9f8ac16a1e45d2899099758) Thanks [@Dave-London](https://github.com/Dave-London)! - Allow `pr-checks` and `pr-diff` to accept the shared `path` parameter and run `gh` from that repository directory. Closes [#896](https://github.com/Dave-London/Pare/issues/896).

- [#875](https://github.com/Dave-London/Pare/pull/875) [`53e4b06`](https://github.com/Dave-London/Pare/commit/53e4b0662c494be1ec1dfd855ac97ab1f09fcfae) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `release-list` always failing with `Unknown JSON field: "url"`. The `url` field is not a valid `--json` field for `gh release list` (only `gh release view` exposes it). Removed `url` from the requested gh fields, parser, and output schema. Use `release-view` if you need a release URL. Closes [#868](https://github.com/Dave-London/Pare/issues/868).

#### @paretools/npm

##### Patch Changes

- [#873](https://github.com/Dave-London/Pare/pull/873) [`2507291`](https://github.com/Dave-London/Pare/commit/25072917a937d10867b740182b047586dec7961d) Thanks [@Dave-London](https://github.com/Dave-London)! - `pare-npm install` no longer emits `--no-audit` for pnpm or yarn. The flag is npm-specific — pnpm install rejects it with `ERROR Unknown option: 'audit'`, and yarn install does not run an audit step either. With this change, `noAudit: true` is honoured on npm (still maps to `--no-audit`) and is a silent no-op on pnpm/yarn, where install never audits anyway. The tool description has been updated to reflect this.

  Resolves [#872](https://github.com/Dave-London/Pare/issues/872).

#### @paretools/python

##### Patch Changes

- [#902](https://github.com/Dave-London/Pare/pull/902) [`416ecb2`](https://github.com/Dave-London/Pare/commit/416ecb2433a88eadee255d02e205727d2d9d729e) Thanks [@Dave-London](https://github.com/Dave-London)! - Document Python interpreter resolution order, virtualenv detection, `python -m` fallbacks, and explicit interpreter override inputs for Python-backed tools.

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

#### @paretools/search

##### Patch Changes

- [#874](https://github.com/Dave-London/Pare/pull/874) [`3ba18e2`](https://github.com/Dave-London/Pare/commit/3ba18e280337aed8bf89ba7a86ea3e60de73c6c5) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `pare-search__search` and `pare-search__count` crashing with `spawn ENOTDIR` when `path` points to a file. The runner previously used the supplied `path` as the child process `cwd` unconditionally, which fails when `path` is a file. The runner now resolves a file path into a parent-directory `cwd` plus a basename positional argument so ripgrep searches just that file (matching the schema's "Directory or file to search in" contract). Closes [#871](https://github.com/Dave-London/Pare/issues/871).

#### @paretools/shared

##### Patch Changes

- [#911](https://github.com/Dave-London/Pare/pull/911) [`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7) Thanks [@Dave-London](https://github.com/Dave-London)! - Clarify that the `path` parameter is authoritative: when omitted, repo-scoped tools operate on the server's own process working directory (its launch dir), not the caller's cwd. Callers in a git worktree or other directory must pass `path` explicitly to avoid operating on the wrong repository. Adds a regression test, documents the behavior in mutating git tool descriptions and the README, and updates the shared `repoPathInput` schema description. Closes [#876](https://github.com/Dave-London/Pare/issues/876).

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

#### @paretools/test

##### Patch Changes

- [#902](https://github.com/Dave-London/Pare/pull/902) [`416ecb2`](https://github.com/Dave-London/Pare/commit/416ecb2433a88eadee255d02e205727d2d9d729e) Thanks [@Dave-London](https://github.com/Dave-London)! - Document Python interpreter resolution order, virtualenv detection, `python -m` fallbacks, and explicit interpreter override inputs for Python-backed tools.

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

---

### 0.19.1

#### @paretools/git

##### Patch Changes

- [#864](https://github.com/Dave-London/Pare/pull/864) [`c5ba357`](https://github.com/Dave-London/Pare/commit/c5ba357ff85c181f40c5ddd35a14f2e010b1abe5) Thanks [@Dave-London](https://github.com/Dave-London)! - `pare-git status` now returns `ahead` and `behind` integer fields whenever an upstream is configured — including in the synced case (`0`/`0`), where they were previously omitted. When there is no upstream, both fields are explicitly `null` to distinguish "no tracking branch" from "synced".

  This eliminates the need for follow-up `pare-git log` / GitHub-compare round-trips just to answer "is this branch fully pushed?" during worktree audits and similar housekeeping.

  The `GitStatusSchema` now allows `ahead`/`behind` to be `number | null | undefined` (previously `number | undefined`).

  Resolves [#834](https://github.com/Dave-London/Pare/issues/834) (sub-bug 3).

#### @paretools/github

##### Patch Changes

- [#864](https://github.com/Dave-London/Pare/pull/864) [`c5ba357`](https://github.com/Dave-London/Pare/commit/c5ba357ff85c181f40c5ddd35a14f2e010b1abe5) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `pr-list`'s `limit` input rejecting JSON-number values (`"expected number, received string"`) and apply the same defensive `z.coerce.number()` pattern across other `pare-github` tools that take numeric inputs (`issue-list`, `run-list`, `label-list`, `release-list`, `discussion-list`, `repo-clone`).

  Workaround was to omit the param. After this fix, callers can pass numbers as JSON numbers or numeric strings interchangeably, matching the existing `run-view`/`run-rerun` behavior.

  Resolves [#861](https://github.com/Dave-London/Pare/issues/861).

---

### 0.19.0

#### @paretools/build

##### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

#### @paretools/github

##### Minor Changes

- [#845](https://github.com/Dave-London/Pare/pull/845) [`8ded90a`](https://github.com/Dave-London/Pare/commit/8ded90a094c18177c6863a6e7fcb073ef08efd7d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `pr-close`, `pr-reopen`, and `pr-ready` tools and fix `pr-checks` `watch: true`.
  - New tools ([#840](https://github.com/Dave-London/Pare/issues/840)): `pr-close { number, comment?, deleteBranch? }`, `pr-reopen { number, comment? }`, and `pr-ready { number, undo? }`. Each mirrors the `issue-close` shape and returns structured `{ number, state, url, ... }` data with typed error categories. They register alongside the other `pr-*` tools.
  - `pr-checks` `watch: true` no longer crashes with `cannot use --watch with --json` ([#844](https://github.com/Dave-London/Pare/issues/844)). The wrapper never passes gh's native `--watch` flag (which is incompatible with `--json`); instead it polls `gh pr checks --json ...` every `interval` seconds (default `10`, min `5`, max `300`) until no checks are in `pending`/`queued`, then returns the same structured payload as `watch: false` with extra `pollCount` and `waitedSeconds` fields. A new `watchTimeout` parameter (seconds, default `600`, max `3600`) bounds the wait; on timeout the tool throws `pr-checks watch timed out after <N>s — checks still pending: <list>` so callers can distinguish timeout from other failures.

#### @paretools/npm

##### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

#### @paretools/test

##### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

---

### 0.18.1

#### @paretools/build

##### Patch Changes

- [#833](https://github.com/Dave-London/Pare/pull/833) [`fdcce2a`](https://github.com/Dave-London/Pare/commit/fdcce2abdd9550427fd0e6af3a3c38591c07bef6) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `turbo` tool reporting `passed/failed/cached` all 0 with empty `tasks: []` on modern turbo 2.x output ([#830](https://github.com/Dave-London/Pare/issues/830)). Turbo 2.x prefixes per-task status lines with `<pkg>:<task>:` (colon) instead of the legacy `<pkg>#<task>:` (hash) the parser was matching, so every task was silently skipped. The parser now accepts both separators, treats the trailing `(duration)` as optional, recognizes `cache bypass` from `--force` runs, and parses turbo 2.x's `ERROR ...` and `Failed:` failure summary lines. The `passed + failed === totalTasks` invariant is now enforced via the summary line as a fallback when per-task lines can't be matched.

#### @paretools/search

##### Patch Changes

- [#843](https://github.com/Dave-London/Pare/pull/843) [`9db6a9a`](https://github.com/Dave-London/Pare/commit/9db6a9a8f3b702deed40ea918b15fdf175f6e69a) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `pare-search__search` and `pare-search__count` crashing with `spawn ENOTDIR` when `path` points to a file. The schema already promised file or directory; now both work. `pare-search__find` (fd) genuinely walks directories, so it now returns a typed `path must be a directory for find` error instead of leaking the raw Node `ENOTDIR`. Missing paths produce a clear `path does not exist: <path>` error. Closes [#827](https://github.com/Dave-London/Pare/issues/827).

#### @paretools/shared

##### Patch Changes

- [#829](https://github.com/Dave-London/Pare/pull/829) [`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve "Command not found" error: now includes the platform, the first PATH entries the runner saw, and on Windows the well-known fallback paths probed plus whether each exists on disk. Makes [#820](https://github.com/Dave-London/Pare/issues/820)-style failures (subagent PATH not inherited) self-debugging in the wild.

- [#841](https://github.com/Dave-London/Pare/pull/841) [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e) Thanks [@Dave-London](https://github.com/Dave-London)! - Add npm/npx/pnpm/yarn to `_WIN32_FALLBACK_PATHS` so `pare-npm` and other Node-package-manager calls succeed on Windows + Git Bash when the spawned MCP server doesn't inherit the user's PATH (the same root condition as [#820](https://github.com/Dave-London/Pare/issues/820)). The cross-spawn cmd.exe wrapper in `_buildSpawnConfig` already handled `.cmd` correctly — only the fallback registry was missing entries. Fixes [#839](https://github.com/Dave-London/Pare/issues/839).

---

### 0.18.0

#### @paretools/build

##### Patch Changes

- [#805](https://github.com/Dave-London/Pare/pull/805) [`ca9c8a8`](https://github.com/Dave-London/Pare/commit/ca9c8a893966718b021233819246d9ea3e2dc347) Thanks [@Dave-London](https://github.com/Dave-London)! - Allow dash-prefixed arguments in build tool args arrays — execFile already prevents injection

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

#### @paretools/git

##### Minor Changes

- [#807](https://github.com/Dave-London/Pare/pull/807) [`203b643`](https://github.com/Dave-London/Pare/commit/203b643a5aa556c128c7ca2b7dcbc4ca6bf4d43d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add batch branch deletion — pass an array of branch names to `delete` param

##### Patch Changes

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

#### @paretools/shared

##### Patch Changes

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

- [#808](https://github.com/Dave-London/Pare/pull/808) [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9) Thanks [@Dave-London](https://github.com/Dave-London)! - Augment PATH with common Unix tool locations on macOS/Linux to fix ENOENT when MCP clients launch servers with stripped environment

---

### 0.17.0

#### @paretools/git

##### Minor Changes

- [#799](https://github.com/Dave-London/Pare/pull/799) [`8c0c1c2`](https://github.com/Dave-London/Pare/commit/8c0c1c2e96cc2b8e712355454c9f20248a0aff07) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `prune` option to the pull tool for removing stale remote-tracking refs during pull (--prune)

#### @paretools/shared

##### Patch Changes

- [#798](https://github.com/Dave-London/Pare/pull/798) [`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add fallback PATH probing for Windows MSYS2/Git Bash environments where the MCP server process does not inherit the shell PATH, causing commands like git and gh to fail with "Command not found"

---

### 0.16.3

#### @paretools/shared

##### Patch Changes

- [#793](https://github.com/Dave-London/Pare/pull/793) [`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix Windows command resolution preferring extensionless shell scripts over .exe binaries, which caused docker compose tools to fail on Docker Desktop for Windows

---

### 0.16.2

#### @paretools/build

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/cargo

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/docker

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/git

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/github

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/go

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/init

##### Patch Changes

- [#778](https://github.com/Dave-London/Pare/pull/778) [`3ad8951`](https://github.com/Dave-London/Pare/commit/3ad8951e2a1c730b0457277a995aaaf78e2ab6d0) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `doctor` subcommand so `npx @paretools/init doctor` runs the health check (previously suggested `npx @paretools/doctor` which 404'd)

#### @paretools/k8s

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/lint

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/make

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/npm

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/process

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/python

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/search

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/security

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/shared

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/test

##### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

---

### 0.16.1

#### @paretools/git

##### Patch Changes

- [#765](https://github.com/Dave-London/Pare/pull/765) [`3064c7b`](https://github.com/Dave-London/Pare/commit/3064c7b1610ff72d03b6eb4fcd67ac09d76b77cd) Thanks [@MergingMonkey](https://github.com/MergingMonkey)! - fix(git): strip CRLF from diff patch output on Windows and show chunks in text summary

  On Windows, git emits `\r\n` line endings. The patch-splitting regex
  captured a trailing `\r` in the filename, preventing a match against the
  `parseDiffStat` result and leaving `chunks` empty when `full: true` was used.

  This fix also updates `formatDiff` to include code chunks in the human-readable
  text output, ensuring patch visibility in MCP clients that rely on the summary.

---

### 0.16.0

#### @paretools/bazel

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/bun

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/cargo

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/cmake

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/deno

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/docker

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/dotnet

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/git

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

- [#758](https://github.com/Dave-London/Pare/pull/758) [`e7a37d9`](https://github.com/Dave-London/Pare/commit/e7a37d9b16afc89e544a7c91838bfed207d3b567) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): support extracting raw file blobs via show tool

#### @paretools/github

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/infra

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/init

##### Minor Changes

- [#757](https://github.com/Dave-London/Pare/pull/757) [`5038f8f`](https://github.com/Dave-London/Pare/commit/5038f8fb8a71cad405ccd953578143038120170a) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(init): auto-detect project type to suggest preset during setup

#### @paretools/jvm

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/lint

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/nix

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/process

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/ruby

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

#### @paretools/swift

##### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

---

### 0.15.0

#### @paretools/build

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

#### @paretools/docker

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

#### @paretools/git

##### Patch Changes

- [#735](https://github.com/Dave-London/Pare/pull/735) [`2e4d5ac`](https://github.com/Dave-London/Pare/commit/2e4d5acfd3a1ca0694869385550dc86dd555e619) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): add security hardening for rebase exec, bisect run, and config set
  - Gate rebase --exec parameter behind assertAllowedByPolicy
  - Gate bisect run command behind assertAllowedByPolicy
  - Block dangerous git config keys that execute commands (core.fsmonitor, core.editor, etc.)

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

#### @paretools/go

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

#### @paretools/http

##### Minor Changes

- [#736](https://github.com/Dave-London/Pare/pull/736) [`2de5461`](https://github.com/Dave-London/Pare/commit/2de5461e4ba43d17660698c531083cd29f4f1ad5) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(http): add SSRF protection, file exfiltration guards, and security warnings
  - Block private/reserved IP ranges in URL validation (opt-out via PARE_HTTP_ALLOW_PRIVATE)
  - Validate resolve parameter IPs against private ranges
  - Block @filepath in form values (opt-in via PARE_HTTP_ALLOW_FILE_UPLOAD)
  - Validate cookie values contain = (reject file paths)
  - Add security warnings for proxy parameter

#### @paretools/make

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

#### @paretools/npm

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

#### @paretools/process

##### Patch Changes

- [#734](https://github.com/Dave-London/Pare/pull/734) [`2bb333a`](https://github.com/Dave-London/Pare/commit/2bb333a62eb39e465d4b27a100db46be88b52618) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(process): add security hardening to reload and run tools
  - Add assertAllowedByPolicy check to reload tool buildCommand parameter
  - Add assertAllowedRoot check to reload tool path parameter
  - Replace sh -c shell execution with direct executable + args in reload tool
  - Add destructiveHint annotation to both reload and run tools
  - Add security warnings about arbitrary command execution in tool descriptions
  - Document PARE_PROCESS_ALLOWED_COMMANDS and PARE_PROCESS_ALLOWED_ROOTS configuration

#### @paretools/remote

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

#### @paretools/search

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

#### @paretools/test

##### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

---

### 0.14.2

#### @paretools/build

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/cargo

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/docker

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/git

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/github

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/k8s

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/lint

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/make

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/remote

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/search

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/security

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/shared

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/test

##### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

---

### 0.14.1

#### @paretools/init

##### Patch Changes

- [#686](https://github.com/Dave-London/Pare/pull/686) [`00e5f23`](https://github.com/Dave-London/Pare/commit/00e5f236a63e2ef4dee04d13d00b5ff0678b1ae6) Thanks [@Dave-London](https://github.com/Dave-London)! - Add doctor tip after successful init — suggests running `npx @paretools/doctor` to verify setup

---

### 0.14.0

#### @paretools/bazel

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/build

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/bun

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/cargo

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/cmake

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/db

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/deno

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/docker

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/dotnet

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/git

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

##### Patch Changes

- [#680](https://github.com/Dave-London/Pare/pull/680) [`f6ae07c`](https://github.com/Dave-London/Pare/commit/f6ae07c18faed3b7d2bef17b1268dcdb4dce46ce) Thanks [@Dave-London](https://github.com/Dave-London)! - Rename checkout tool parameter from `ref` to `branch` for better discoverability by AI agents

#### @paretools/github

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/go

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/http

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/infra

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/jvm

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/k8s

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/lint

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/make

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/nix

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/npm

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/process

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/python

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/remote

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/ruby

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/search

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/security

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/shared

##### Patch Changes

- [#685](https://github.com/Dave-London/Pare/pull/685) [`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb) Thanks [@Dave-London](https://github.com/Dave-London)! - Add dev-mode runtime validation for compactDualOutput and strippedCompactDualOutput. When an optional `outputSchema` (Zod) is passed and `NODE_ENV !== 'production'` (or `PARE_DEBUG` is set), the structured output is validated against the schema before returning. Mismatches throw a descriptive error with field paths, catching compact-map / schema bugs during development and testing rather than in production.

#### @paretools/swift

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

#### @paretools/test

##### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

---

### 0.13.1

#### @paretools/bazel

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/build

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/bun

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/cargo

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/cmake

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/db

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/deno

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/docker

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/dotnet

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/git

##### Patch Changes

- [#668](https://github.com/Dave-London/Pare/pull/668) [`b63707c`](https://github.com/Dave-London/Pare/commit/b63707cbecdb34067c38ea6e3370a1eab0e76e46) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix cherry-pick commits array coercion (#667), checkout branch-from-tag via git switch (#666), and add 12 missing servers to init registry and presets (#660)

- [#671](https://github.com/Dave-London/Pare/pull/671) [`dd560eb`](https://github.com/Dave-London/Pare/commit/dd560eb4c586b29e473145fbd0ad9237bd4e11a1) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix checkout: use git checkout --detach instead of git switch --detach to support tag refs on all git versions (#669)

- [#664](https://github.com/Dave-London/Pare/pull/664) [`d5cef2e`](https://github.com/Dave-London/Pare/commit/d5cef2e8dcdb4b4d2b32082c294cb1cc8ea05800) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): accept string branch name in `forceDelete` param, matching `delete` behavior

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/github

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/go

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/http

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/infra

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/init

##### Patch Changes

- [#668](https://github.com/Dave-London/Pare/pull/668) [`b63707c`](https://github.com/Dave-London/Pare/commit/b63707cbecdb34067c38ea6e3370a1eab0e76e46) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix cherry-pick commits array coercion (#667), checkout branch-from-tag via git switch (#666), and add 12 missing servers to init registry and presets (#660)

#### @paretools/jvm

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- [#658](https://github.com/Dave-London/Pare/pull/658) [`42a68a5`](https://github.com/Dave-London/Pare/commit/42a68a5e386bc2a09d38e2dde6775749fc05a41f) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix output schema validation errors in jvm compact mode (gradle-tasks, gradle-dependencies, maven-dependencies) and clarify process run command parameter description

#### @paretools/k8s

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/lint

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/make

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/nix

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/npm

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/process

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- [#658](https://github.com/Dave-London/Pare/pull/658) [`42a68a5`](https://github.com/Dave-London/Pare/commit/42a68a5e386bc2a09d38e2dde6775749fc05a41f) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix output schema validation errors in jvm compact mode (gradle-tasks, gradle-dependencies, maven-dependencies) and clarify process run command parameter description

#### @paretools/python

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/remote

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/ruby

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/search

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/security

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/shared

##### Patch Changes

- [#672](https://github.com/Dave-London/Pare/pull/672) [`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: register stub resource handlers to suppress spurious -32603 errors in OpenCode

  Some MCP clients (e.g. OpenCode) fire a `resources/read` request after every tool call that returns `structuredContent`. Because Pare servers register no resource handlers, the SDK responded with `-32601 Method Not Found` (displayed as `-32603` by OpenCode). Now `createServer()` registers empty `resources/list` and `resources/read` handlers so these requests receive a clean `-32602 InvalidParams` ("Resource not found") response instead.

- [#663](https://github.com/Dave-London/Pare/pull/663) [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(shared): eliminate shell:true default to resolve CodeQL alert #16

  Default `shell` to `false` on all platforms. On Windows, `.cmd`/`.bat` wrappers
  are automatically detected and spawned via `cmd.exe` with `windowsVerbatimArguments`
  (cross-spawn pattern), avoiding shell command injection from environment-resolved paths.

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- [#641](https://github.com/Dave-London/Pare/pull/641) [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d) Thanks [@Dave-London](https://github.com/Dave-London)! - Resolve CLI commands to absolute paths before spawning to prevent shell interpretation of PATH (fixes CodeQL alert #15)

- [#643](https://github.com/Dave-London/Pare/pull/643) [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485) Thanks [@Dave-London](https://github.com/Dave-London)! - Add strict input validation to reject unknown tool parameters instead of silently ignoring them

#### @paretools/swift

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

#### @paretools/test

##### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

---

### 0.13.0

#### @paretools/bazel

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/build

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/bun

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/cargo

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/cmake

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/db

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/deno

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/docker

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/dotnet

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/git

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/github

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/go

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/http

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/infra

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/init

##### Patch Changes

- [#614](https://github.com/Dave-London/Pare/pull/614) [`7e2e014`](https://github.com/Dave-London/Pare/commit/7e2e014ec471b03855d186f1a9158e85afc8bc3c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add package name allowlist for doctor health checks and backup creation for config file modifications

#### @paretools/jvm

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/k8s

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

##### Patch Changes

- [#636](https://github.com/Dave-London/Pare/pull/636) [`2d89f8c`](https://github.com/Dave-London/Pare/commit/2d89f8c3f67d0ccc50cf44b8de63fb7ba355d5e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix helm integration test timeout on Windows by disabling shell mode

#### @paretools/lint

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/make

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/nix

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/npm

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/process

##### Minor Changes

- [#632](https://github.com/Dave-London/Pare/pull/632) [`9d43efa`](https://github.com/Dave-London/Pare/commit/9d43efadd7bf33ac73e43b28617924d0824788f9) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `reload` tool for triggering MCP server rebuild and tool list refresh during development

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/python

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/remote

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/ruby

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/search

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/security

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/shared

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/swift

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

#### @paretools/test

##### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

---

### 0.12.0

#### @paretools/build

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/cargo

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/docker

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/git

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/github

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/go

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/http

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/k8s

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/lint

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/make

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/npm

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/process

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/python

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/search

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/security

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/shared

##### Minor Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/test

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

---

### 0.11.1

#### @paretools/bazel

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/bun

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/cmake

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/db

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/deno

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/dotnet

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/infra

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/jvm

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/remote

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/ruby

##### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

---

### 0.11.0

#### @paretools/bazel

##### Minor Changes

- [#594](https://github.com/Dave-London/Pare/pull/594) [`dffa0d1`](https://github.com/Dave-London/Pare/commit/dffa0d1357467bf7745fc07159b4f2a1c61ef6a2) Thanks [@Dave-London](https://github.com/Dave-London)! - Add bazel tool with build, test, query, info, run, clean, and fetch actions

#### @paretools/build

##### Minor Changes

- [#579](https://github.com/Dave-London/Pare/pull/579) [`e8c2a88`](https://github.com/Dave-London/Pare/commit/e8c2a88e5909ca08547138c57cbb6fa889c0495c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add two new build tools: lerna and rollup

#### @paretools/bun

##### Minor Changes

- [#582](https://github.com/Dave-London/Pare/pull/582) [`cff1489`](https://github.com/Dave-London/Pare/commit/cff14891f6cf18c1f4d00f980e3e81817f5ca46a) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/bun — Structured Bun runtime operations (8 tools)

#### @paretools/cmake

##### Minor Changes

- [#593](https://github.com/Dave-London/Pare/pull/593) [`a53d171`](https://github.com/Dave-London/Pare/commit/a53d171cd62f336bc2350e56833132060c34d307) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cmake tool with configure, build, test, list-presets, install, and clean actions

#### @paretools/db

##### Minor Changes

- [#587](https://github.com/Dave-London/Pare/pull/587) [`1a94aaa`](https://github.com/Dave-London/Pare/commit/1a94aaa16356d8f4f003da11c191388f9fbed388) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/db — Structured database CLI operations (9 tools)

#### @paretools/deno

##### Minor Changes

- [#581](https://github.com/Dave-London/Pare/pull/581) [`0805cf6`](https://github.com/Dave-London/Pare/commit/0805cf6689524d2886dd0ad09cff20e72ac66d17) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/deno — Structured Deno runtime operations (7 tools)

#### @paretools/dotnet

##### Minor Changes

- [#583](https://github.com/Dave-London/Pare/pull/583) [`e55e22f`](https://github.com/Dave-London/Pare/commit/e55e22ff5350a3d5e493699c412ed2ea7b50fcbf) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/dotnet — Structured .NET CLI operations (8 tools)

#### @paretools/git

##### Minor Changes

- [#577](https://github.com/Dave-London/Pare/pull/577) [`b22bb4a`](https://github.com/Dave-London/Pare/commit/b22bb4acc850a7a1da4b851997c3fd4fb2ada395) Thanks [@Dave-London](https://github.com/Dave-London)! - Add four new git tools: submodule, archive, clean, and config

#### @paretools/github

##### Minor Changes

- [#578](https://github.com/Dave-London/Pare/pull/578) [`7cafb03`](https://github.com/Dave-London/Pare/commit/7cafb035d661b1a56371346eb143c00d4560ab9d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add three new GitHub tools: repo-view, repo-clone, and discussion-list

#### @paretools/infra

##### Minor Changes

- [#584](https://github.com/Dave-London/Pare/pull/584) [`3acab13`](https://github.com/Dave-London/Pare/commit/3acab1356e85bbea759b8b7fe7d4bfc2daf8359a) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/infra — Structured Terraform operations (8 tools)

- [#592](https://github.com/Dave-London/Pare/pull/592) [`3610e74`](https://github.com/Dave-London/Pare/commit/3610e74f5ee06b60115f7ab0165d8d5939f375fb) Thanks [@Dave-London](https://github.com/Dave-London)! - Add vagrant tool with status, global-status, up, halt, and destroy actions

#### @paretools/jvm

##### Minor Changes

- [#588](https://github.com/Dave-London/Pare/pull/588) [`1fda26f`](https://github.com/Dave-London/Pare/commit/1fda26fb548762b3ba0ab1df209178267619ea42) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/jvm — Structured Gradle and Maven operations (8 tools)

#### @paretools/remote

##### Minor Changes

- [#586](https://github.com/Dave-London/Pare/pull/586) [`1fc786a`](https://github.com/Dave-London/Pare/commit/1fc786ac6436e199cb36d6f7a27ec952ac9bd452) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/remote — Structured SSH and rsync operations (4 tools)

#### @paretools/ruby

##### Minor Changes

- [#585](https://github.com/Dave-London/Pare/pull/585) [`bd1c277`](https://github.com/Dave-London/Pare/commit/bd1c277e1ba9c2251e821eaa01e58a59ea13db76) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/ruby — Structured Ruby and Bundler operations (8 tools)

#### @paretools/search

##### Minor Changes

- [#580](https://github.com/Dave-London/Pare/pull/580) [`b1839f7`](https://github.com/Dave-London/Pare/commit/b1839f76f401308d9cbd2746f47ebb4f31c2a5c4) Thanks [@Dave-London](https://github.com/Dave-London)! - Add yq tool for YAML/JSON/XML/TOML processing

#### @paretools/shared

##### Minor Changes

- [#589](https://github.com/Dave-London/Pare/pull/589) [`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85) Thanks [@Dave-London](https://github.com/Dave-London)! - Add structured error categorization for agent recovery

##### Patch Changes

- [#573](https://github.com/Dave-London/Pare/pull/573) [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd) Thanks [@Dave-London](https://github.com/Dave-London)! - Add centralized Zod input schemas for common tool parameters (compactInput, projectPathInput, repoPathInput, cwdPathInput, fixInput, pathInput, configInput, filePatternsInput) to reduce duplication across server packages

---

### 0.10.2

#### @paretools/build

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/cargo

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/docker

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/git

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/github

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/go

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/http

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/k8s

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/lint

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/make

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/npm

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/process

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/python

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/search

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/security

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/shared

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/test

##### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

---

### 0.10.1

#### @paretools/build

##### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

#### @paretools/git

##### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

#### @paretools/github

##### Patch Changes

- [#566](https://github.com/Dave-London/Pare/pull/566) [`64ce493`](https://github.com/Dave-London/Pare/commit/64ce493e39850ca97b9efbc7ac80d4ec7a410965) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

#### @paretools/search

##### Patch Changes

- [#563](https://github.com/Dave-London/Pare/pull/563) [`da586bc`](https://github.com/Dave-London/Pare/commit/da586bc60f5a67ea7adaa189b6b451668cbdb2e5) Thanks [@Dave-London](https://github.com/Dave-London)! - Add pre-validation of regex patterns in search, count, and find tools. Invalid regex patterns now return a clear structured error message instead of silently returning empty results. The validation is skipped when fixedStrings mode (search/count) or glob mode (find) is active.

#### @paretools/security

##### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

#### @paretools/shared

##### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

#### @paretools/test

##### Patch Changes

- [#566](https://github.com/Dave-London/Pare/pull/566) [`64ce493`](https://github.com/Dave-London/Pare/commit/64ce493e39850ca97b9efbc7ac80d4ec7a410965) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

---

### 0.10.0

#### @paretools/build

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

#### @paretools/cargo

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

#### @paretools/docker

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

#### @paretools/git

##### Patch Changes

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix branch compact mode garbling names for worktree branches (+ marker parsed incorrectly)

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix worktree list Zod error by replacing z.union() with unified z.object() output schema

#### @paretools/github

##### Minor Changes

- [#528](https://github.com/Dave-London/Pare/pull/528) [`65697bf`](https://github.com/Dave-London/Pare/commit/65697bff5f751ff8990e154512ed5c58f54710e6) Thanks [@Dave-London](https://github.com/Dave-London)! - Add label-list and label-create tools for repository label management. Fix run-view bug where --log/--log-failed flags conflicted with --json, causing JSON parse crashes.

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix shell escaping for pr-merge commitBody by using --body-file - with stdin instead of --body CLI arg

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix release-create to use --notes-file stdin for shell-safe body handling

- [#552](https://github.com/Dave-London/Pare/pull/552) [`a618e9f`](https://github.com/Dave-London/Pare/commit/a618e9f733b179583355ad32f8558a7fd866661e) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

#### @paretools/make

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

#### @paretools/npm

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

#### @paretools/shared

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: use synchronous `execFileSync` for Windows `taskkill` in `killProcessGroup()` to prevent orphan processes accumulating after timeouts

#### @paretools/test

##### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- [#552](https://github.com/Dave-London/Pare/pull/552) [`a618e9f`](https://github.com/Dave-London/Pare/commit/a618e9f733b179583355ad32f8558a7fd866661e) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

---

### 0.9.0

#### @paretools/build

##### Minor Changes

- [#500](https://github.com/Dave-London/Pare/pull/500) [`0880b7e`](https://github.com/Dave-London/Pare/commit/0880b7e0b8ee60bfa353626fa19c5ce506a66f8d) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(build): add env params, improve parsers, normalize output fields (P1)
  - Add `env` parameter to build and webpack tools
  - Improve error/warning detection heuristics
  - Add `define` and `metafile` params to esbuild
  - Distinguish local vs remote cache in Nx output
  - Normalize duration to milliseconds in Turbo output
  - Normalize file sizes to bytes in Vite output
  - Add `profile` param to webpack

- [#468](https://github.com/Dave-London/Pare/pull/468) [`27ecc7d`](https://github.com/Dave-London/Pare/commit/27ecc7de8d77bb82a95ae016b0992d1581d5b32b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap params and output schema enhancements across all build tools:
  - build: exitCode in output schema, timeout param, stdout/stderr/outputLines in schema
  - esbuild: target, external, sourcemap enum expansion, tsconfig, drop
  - nx: configuration, head, projects, exclude
  - tsc: declaration/declarationDir, pretty (--pretty false for parser normalization)
  - turbo: args with assertNoFlagInjection, outputLogs enum
  - vite-build: outDir, config, sourcemap, base, ssr
  - webpack: entry, target, devtool, analyze

- [#445](https://github.com/Dave-London/Pare/pull/445) [`fffa56f`](https://github.com/Dave-London/Pare/commit/fffa56f85a13d6434604a52e93a219eac2c6d170) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity gap items across all build tools:
  - build: Add `assertNoFlagInjection` on `args[]` elements; document command allowlist in description
  - esbuild: Add `splitting`, `legalComments`, and `logLevel` params
  - nx: Add `parallel`, `skipNxCache`, `nxBail`, `verbose`, `dryRun`, `outputStyle`, and `graph` params
  - tsc: Add `incremental`, `skipLibCheck`, and `emitDeclarationOnly` params; document compact-mode field loss
  - turbo: Add `force`, `continue`, `dryRun`, `affected`, `graph`, `logOrder`, and `profile` params
  - vite-build: Add `manifest`, `minify`, `logLevel`, `emptyOutDir`, and `reportCompressedSize` params
  - webpack: Add `bail` and `cache` params; append `--no-color` to prevent ANSI in text fallback

#### @paretools/cargo

##### Minor Changes

- [#482](https://github.com/Dave-London/Pare/pull/482) [`edad7f1`](https://github.com/Dave-London/Pare/commit/edad7f15e190a5f64c0a8e466f553fe698ec2623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo): add structured warnings to doc, clarify fmt success semantics, capture test failure output, parse tree and update into structured data

- [#479](https://github.com/Dave-London/Pare/pull/479) [`e5fb487`](https://github.com/Dave-London/Pare/commit/e5fb487f577ef0434787f7e1ea3fab51f988e867) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(cargo): fix dry-run output parsing, CVSS severity extraction, and fmt file change detection

- [#499](https://github.com/Dave-London/Pare/pull/499) [`fedc800`](https://github.com/Dave-London/Pare/commit/fedc800db713a73f357a21927e5f21475cc6d0f4) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo): improve add/audit/build/clippy/fmt/remove/run/test/update output (P1)
  - Add dependency type to add and remove output
  - Add cargo audit fix support
  - Include CVSS score/vector in audit vulnerabilities
  - Use build-finished event for authoritative success
  - Capture clippy suggestion text from JSON children
  - Add lint level configuration to clippy
  - Use --files-with-diff for more reliable fmt check
  - Distinguish compilation vs runtime failure in run
  - Add JSON message format for test compilation diagnostics
  - Improve update compact mode with update count

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#471](https://github.com/Dave-London/Pare/pull/471) [`47bd066`](https://github.com/Dave-London/Pare/commit/47bd066438916ade8a0f8d3a73f136471dbc604d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Cargo tools:
  - add: add package, rename, registry, locked/frozen/offline params; add error message to output schema
  - audit: add success field, ignore, deny, targetArch/Os, file, db/url params; add advisory date; compact preserves informational/unknown counts
  - build: add package, features, allFeatures, noDefaultFeatures, target, profile, locked/frozen/offline, manifestPath params
  - check: add features, allFeatures, noDefaultFeatures, target, locked/frozen/offline params
  - clippy: add success field, package, fix (with allow-dirty), features, locked/frozen/offline params
  - doc: add package, features, target, locked/frozen/offline params; add outputDir to schema
  - fmt: add package, edition, config, configPath, emit params
  - remove: add dryRun, package, locked/frozen/offline, manifestPath params; add error message to output schema
  - run: add bin, example, features, timeout, profile, target, locked/frozen/offline params
  - test: add package, features, testArgs, locked/frozen/offline params
  - tree: add success field (return error instead of throwing), invert, edges, features, format, target, locked/frozen/offline params
  - update: add precise, locked/frozen/offline, manifestPath params

- [#443](https://github.com/Dave-London/Pare/pull/443) [`142ffca`](https://github.com/Dave-London/Pare/commit/142ffca66886535308e8e0a5e5d7827a01c94bb1) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Cargo tools (XS complexity gaps)

#### @paretools/docker

##### Minor Changes

- [#502](https://github.com/Dave-London/Pare/pull/502) [`303bc5d`](https://github.com/Dave-London/Pare/commit/303bc5d5580a8ab97bc68959efbebffa494a5640) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(docker): expand output schemas, improve parsers and error handling across tools (P1)
  - #97: Improve build error parsing with structured errors (line numbers, Dockerfile context)
  - #98: Support multiple tags — `tag` accepts `string | string[]` for multiple `-t` flags
  - #99: Populate per-service `duration` in compose-build output
  - #100: Enrich compose-down with per-container `{name, action}` details
  - #101: Separate volume/network removal counts from container counts
  - #102: Add `follow` param mapping to `-f` for bounded log streaming
  - #103: Improve timestamp parsing for timezone offsets and nanoseconds
  - #104: Add log level extraction from common patterns (bracket, level=, prefix)
  - #105: Parse `Health` field and add `health` to compose-ps schema
  - #106: Add `running`/`stopped` count fields to compose-ps
  - #107: Enrich compose-up with per-service state details
  - #108: Add output truncation with `limit` param and `isTruncated` to exec
  - #109: Rename `filter` to `reference` in images tool to avoid confusion
  - #110: Parse `CreatedAt` as ISO timestamp in images output
  - #111: Add `networkSettings` (IP, ports) to inspect schema
  - #112: Add `mounts` field to inspect schema
  - #113: Separate stdout/stderr capture in logs output
  - #114: Clarify tail vs limit dual-truncation in logs docs
  - #115: Add `labels` field to network-ls schema
  - #116: Add `ipv6`, `internal`, `attachable` booleans to network-ls
  - #117: Capture `labels` as `Record<string, string>` in ps
  - #118: Capture `networks` as `string[]` in ps
  - #119: Fix digest-only pull parsing — set `tag` to digest ref
  - #120: Add `size` output field from pull summary
  - #121: Return structured error with `exitCode`, `stderr`, `errorCategory` in run
  - #122: Capture stdout/stderr for non-detached runs
  - #123: Add `memoryUsageBytes` and `memoryLimitBytes` numeric fields to stats
  - #124: Add structured I/O fields: `netIn`, `netOut`, `blockRead`, `blockWrite` to stats
  - #125: Add `labels` field to volume-ls schema

- [#459](https://github.com/Dave-London/Pare/pull/459) [`20b6c8f`](https://github.com/Dave-London/Pare/commit/20b6c8f98e08852a4cccfd9e0109a280951490fc) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for Docker tools
  - build: Add buildArgs, target, platform, label, cacheFrom, cacheTo, secret, ssh params
  - compose-build: Add file, ssh, builder params
  - compose-down: Add rmi enum param, services positional args
  - compose-logs: Add until param, file param for compose file targeting
  - compose-ps: Add file, services, status, filter params; state field changed to enum
  - compose-up: Add pull enum param (always/missing/never)
  - exec: Add user, envFile params; add duration to output schema
  - images: Add digest field to output schema
  - inspect: Add type enum, size param; add healthStatus, env, restartPolicy to output
  - logs: Add until param for time-bounded queries
  - network-ls: Add filter param (string or string[]); add createdAt to output; preserve id in compact
  - ps: Add filter param; preserve full container ID (no truncation)
  - pull: Preserve digest in compact output
  - run: Add workdir, network, platform, entrypoint, user, restart, memory, hostname, shmSize, pull, envFile params
  - stats: Add path param; preserve memoryUsage in compact output
  - volume-ls: Add filter param (string or string[]); add createdAt to output; preserve mountpoint in compact
  - compose-logs compact: Preserve timestamps in head/tail entries

- [#447](https://github.com/Dave-London/Pare/pull/447) [`32e14af`](https://github.com/Dave-London/Pare/commit/32e14af1b7fa41da945517aa71496d427c206e97) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Docker tools (XS complexity gaps)

- [#486](https://github.com/Dave-London/Pare/pull/486) [`982d087`](https://github.com/Dave-London/Pare/commit/982d0877fecb03d2aa1bed95b45426a44d719623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github,docker): add gist path validation, issue-create body stdin, docker/images filter, docker/inspect image support

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

##### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

#### @paretools/git

##### Minor Changes

- [#470](https://github.com/Dave-London/Pare/pull/470) [`449e4e8`](https://github.com/Dave-London/Pare/commit/449e4e8fb80a285226f04d61be5801d03d5c0162) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): implement S-complexity gaps — add validated params, enums, and output schema enhancements

- [#484](https://github.com/Dave-London/Pare/pull/484) [`02f25c1`](https://github.com/Dave-London/Pare/commit/02f25c15f341f0e6f9c239f6cba98e356543b33c) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for 10 git tools with structured fields:
  - git/add: `files` now returns `Array<{file, status}>` instead of `string[]`
  - git/branch: populate `upstream` field from `-vv` output
  - git/cherry-pick: add `state` field ("completed", "conflict", "in-progress")
  - git/diff: add `binary: boolean` field for binary file detection
  - git/merge: add `state` field ("completed", "conflict", "already-up-to-date", "fast-forward")
  - git/rebase: add `state` field ("completed", "conflict", "in-progress")
  - git/reflog: add `totalAvailable` field for total entry count
  - git/reset: add `previousRef`/`newRef` fields
  - git/restore: add post-restore verification (`verified`, `verifiedFiles`)
  - git/worktree: add `locked`/`prunable` fields

- [#478](https://github.com/Dave-London/Pare/pull/478) [`86d7b94`](https://github.com/Dave-London/Pare/commit/86d7b9474a7b700809ff0bd8fdbbca1e4f4bf12e) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): add P0 parser bug fixes and error handling improvements
  - Normalize reflog action field values across git versions
  - Add structured error output for checkout conflicts/failures
  - Add structured error output for push failures (rejected, non-fast-forward)
  - Handle nothing-to-stash gracefully with clear reason field
  - Handle stash pop/apply conflicts with structured conflict info

- [#489](https://github.com/Dave-London/Pare/pull/489) [`3128b43`](https://github.com/Dave-London/Pare/commit/3128b437a12158c573fef7fcc563ea365e29673c) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): add bisect/run, remote/add, remote/remove, tag/create, tag/delete actions and reset --hard safety guard

- [#503](https://github.com/Dave-London/Pare/pull/503) [`79585b3`](https://github.com/Dave-London/Pare/commit/79585b37aa1c310d8a44b21a1b2518a06d0a567c) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): improve add, blame, commit, log, pull, remote, reset, show, stash output (P1)
  - Add newlyStaged count to add output
  - Use full 40-char hashes in blame
  - Improve commit hash extraction for special branch names
  - Add fullMessage field to log output
  - Add parsed refs to log-graph entries
  - Add conflict and changed file parsing to pull
  - Add remote rename, set-url, prune, show subcommands
  - Add files+mode validation to reset
  - Guard against @@ delimiter corruption in show
  - Add stash show action and stash-list content summary

- [#450](https://github.com/Dave-London/Pare/pull/450) [`a7ed64b`](https://github.com/Dave-London/Pare/commit/a7ed64b6c70aa475d36b9e372f2ecf817e93df6c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all git tools (XS complexity gaps)

##### Patch Changes

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

#### @paretools/github

##### Minor Changes

- [#462](https://github.com/Dave-London/Pare/pull/462) [`e494cb2`](https://github.com/Dave-London/Pare/commit/e494cb233dd873b7752de5254abacbddaa45d659) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): implement S-complexity gaps — add validated params, enums, and output schema enhancements

- [#486](https://github.com/Dave-London/Pare/pull/486) [`982d087`](https://github.com/Dave-London/Pare/commit/982d0877fecb03d2aa1bed95b45426a44d719623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github,docker): add gist path validation, issue-create body stdin, docker/images filter, docker/inspect image support

- [#480](https://github.com/Dave-London/Pare/pull/480) [`ec8311c`](https://github.com/Dave-London/Pare/commit/ec8311c1fcbc31ac1b72baa20e4dd528c27d3e76) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): add HTTP status to api, deduplicate pr-checks, add binary field to pr-diff, expand pr-merge state and run-view metadata

- [#474](https://github.com/Dave-London/Pare/pull/474) [`8223d10`](https://github.com/Dave-London/Pare/commit/8223d107360a27170f4e907ebc0e8477a6d284ce) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): improve issue-close URL parsing robustness and handle pr-checks exit code 8 (pending checks)

- [#496](https://github.com/Dave-London/Pare/pull/496) [`7629857`](https://github.com/Dave-London/Pare/commit/7629857cc00ecce9f089eccc95212afae04c36ee) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github): improve api, gist, issue, pr, run tools output (P1)
  - Preserve API error body in api tool
  - Add GraphQL support to api tool
  - Add content-based gist creation
  - Detect already-closed issues in issue-close
  - Parse review event from pr-review output
  - Add error classification to pr-review
  - Add reviews details to pr-view
  - Expand run-list with headSha, event, startedAt, attempt
  - Add rerun attempt tracking to run-rerun

- [#449](https://github.com/Dave-London/Pare/pull/449) [`492097f`](https://github.com/Dave-London/Pare/commit/492097f3375fabd095177ce1b6f62be7cb6a59b9) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all GitHub tools (XS complexity gaps)

##### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

- [#506](https://github.com/Dave-London/Pare/pull/506) [`6500911`](https://github.com/Dave-London/Pare/commit/65009118148110678f4aa5aee7fe8f30f2de85bf) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(github): replace z.union with z.string for number params to fix MCP SDK validation

- [#510](https://github.com/Dave-London/Pare/pull/510) [`c29206d`](https://github.com/Dave-London/Pare/commit/c29206d03cfc8c2653a239a839adc89ce24b7508) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix pr-checks failing due to unsupported `isRequired` and `conclusion` JSON fields, and rename `pr` parameter to `number` in pr-checks and pr-diff for consistency with other PR tools.

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

#### @paretools/go

##### Minor Changes

- [#476](https://github.com/Dave-London/Pare/pull/476) [`37908b5`](https://github.com/Dave-London/Pare/commit/37908b587d75dd234ac81be96774ccb982460d40) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(go): capture non-file build errors, fix fmt files-changed detection, populate test failure output, surface package-level test failures

- [#488](https://github.com/Dave-London/Pare/pull/488) [`c7be01b`](https://github.com/Dave-London/Pare/commit/c7be01bdad905c115533b9292f118a7bbbba7615) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): add go/get version resolution, go/list modules mode, go/run output limits, go/vet JSON parsing

- [#495](https://github.com/Dave-London/Pare/pull/495) [`811edb3`](https://github.com/Dave-London/Pare/commit/811edb3dfcf7eb24b721c0cb118bd40e87d6c286) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): improve env, fmt, generate, get, list, vet, golangci-lint, mod-tidy output (P1)
  - Improve env compact mode for filtered queries
  - Capture fmt stderr parse errors
  - Parse generate per-directive output
  - Add per-package status to get output
  - Capture golangci-lint Replacement/fix data
  - Capture list Error field per package
  - Distinguish mod-tidy "already tidy" from "made changes"
  - Add analyzer name to vet diagnostics

- [#460](https://github.com/Dave-London/Pare/pull/460) [`e314903`](https://github.com/Dave-London/Pare/commit/e314903cfd90724224b6ca39468867895f09e7e7) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Go tools:
  - build: add tags, ldflags, output, buildmode, gcflags params
  - env: add JSON parse error handling with success field, fix filtered vars mode
  - generate: add run, skip, tags params
  - get: add update enum param (all | patch)
  - golangci-lint: add newFromRev, enable/disable, timeout, buildTags, concurrency, maxIssuesPerLinter, maxSameIssues, presets params; add resultsTruncated schema field
  - list: add success field to schema, tags param, testGoFiles to package schema
  - mod-tidy: add goVersion, compat params
  - run: add tags, timeout, exec, maxOutput params; clarify buildArgs interaction with assertNoFlagInjection
  - test: add timeout, count, cover, coverprofile, tags, parallel, shuffle params
  - vet: add success field to schema, analyzers, tags, contextLines, vettool params

- [#452](https://github.com/Dave-London/Pare/pull/452) [`6878a0f`](https://github.com/Dave-London/Pare/commit/6878a0f4facb838648e062c4aea9170e7b674782) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Go tools (XS complexity gaps)

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

#### @paretools/http

##### Minor Changes

- [#493](https://github.com/Dave-London/Pare/pull/493) [`6fd4b65`](https://github.com/Dave-London/Pare/commit/6fd4b6517c0acfe14c32c558801b5a96f6cf91c0) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(http): add expanded timing, HEAD compact mode, and POST form param (P1)
  - Add detailed timing breakdown (namelookup, connect, starttransfer, etc.) to all HTTP tools
  - Preserve key headers in HEAD compact mode (content-length, cache-control, etag, etc.)
  - Add `form` parameter to POST for multipart form data uploads

- [#457](https://github.com/Dave-London/Pare/pull/457) [`8e7238d`](https://github.com/Dave-London/Pare/commit/8e7238d30493d14b102421930613e105613f4338) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap parameters to HTTP tools:
  - **All tools**: `connectTimeout` (--connect-timeout), `basicAuth` (-u), `proxy` (-x)
  - **get**: `queryParams` (URL-encoded query convenience), `httpVersion`, `resolve` (--resolve)
  - **head**: Switch from `-X HEAD` to `-I` for correct HEAD behavior, `httpVersion`, `resolve`, `contentLength` parsed output field
  - **post**: `preserveMethodOnRedirect` (--post301/302/303), `dataUrlencode` (--data-urlencode), `httpVersion`
  - **request**: `httpVersion` (--http1.0/1.1/2), `cookie` (-b), `resolve` (--resolve)

- [#446](https://github.com/Dave-London/Pare/pull/446) [`228e3ff`](https://github.com/Dave-London/Pare/commit/228e3fff075175b40691dd8502799fa7290db64a) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - get: insecure, retry, compressed
  - head: insecure, retry
  - post: insecure, accept, compressed
  - request: insecure, retry, compressed

#### @paretools/k8s

##### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#481](https://github.com/Dave-London/Pare/pull/481) [`9251407`](https://github.com/Dave-London/Pare/commit/9251407ad98f72d8ecc772cc5ec34a0c4d97f961) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(k8s): parse apply output into structured resources, parse describe Events and Conditions into structured arrays

- [#492](https://github.com/Dave-London/Pare/pull/492) [`99490d9`](https://github.com/Dave-London/Pare/commit/99490d9fc1515a33b130253062397ad38756e97a) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(k8s): expand resource metadata, add helm history and template actions (P1)
  - Add annotations, ownerReferences, finalizers, resourceVersion, uid to K8sResourceSchema
  - Add helm `history` action for release revision history
  - Add helm `template` action for local chart template rendering

- [#463](https://github.com/Dave-London/Pare/pull/463) [`ca57bb6`](https://github.com/Dave-London/Pare/commit/ca57bb6af44d3b2d540f5266b64339086402a9e8) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap parameters to K8s tools:
  - **get**: `fieldSelector`, `context`, `kubeconfig`, `sortBy`, `filename`, `subresource`
  - **describe**: Make `name` optional, add `selector`, `context`, `kubeconfig`
  - **apply**: Multi-file support (`string | string[]`), `validate` enum, `waitTimeout`, `fieldManager`, `context`, `selector`, `cascade` enum
  - **helm**: `version`, `waitTimeout`, multi-values (`string | string[]`), `filter`, `statusRevision`, `repo`, `description`
  - **logs**: `sinceTime`, `selector`, `context`, `podRunningTimeout`

- [#451](https://github.com/Dave-London/Pare/pull/451) [`1d0ee7b`](https://github.com/Dave-London/Pare/commit/1d0ee7b1b608b7ed0eb9c79e2979bdcfe65c79f8) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - apply: serverSide, wait, recursive, kustomize, prune, force, forceConflicts
  - describe: allNamespaces, showEvents
  - get: ignoreNotFound, chunkSize
  - helm: dryRun, wait, atomic, createNamespace, installOnUpgrade, reuseValues, allNamespaces, showResources, noHooks, skipCrds
  - logs: timestamps, allContainers, limitBytes, prefix, ignoreErrors

#### @paretools/lint

##### Minor Changes

- [#497](https://github.com/Dave-London/Pare/pull/497) [`2ec20a0`](https://github.com/Dave-London/Pare/commit/2ec20a023476ecd525a41611d79f9bad9d3578af) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(lint): improve biome, prettier, and shellcheck parsers (P1)
  - Improve biome-check line number extraction from JSON output (support both v2+ start/end format and legacy sourceCode format)
  - Improve biome-format parser to use --reporter=json for accurate changed/unchanged file counts
  - Use --list-different for more accurate prettier-format change counting
  - Validate shellcheck file patterns and automatically expand directories to shell script files

- [#458](https://github.com/Dave-London/Pare/pull/458) [`58e1520`](https://github.com/Dave-London/Pare/commit/58e1520b65f1ddff8859543193c6e03603cbef07) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap params and output schema enhancements across all lint tools:
  - biome-check: since, configPath, linterEnabled/formatterEnabled, maxDiagnostics, skip
  - biome-format: since, configPath
  - format-check: config, ignorePath, parser
  - hadolint: config, requireLabel, shell, errorRules/warningRules/infoRules severity overrides
  - lint (eslint): maxWarnings, config, fixType, rule
  - oxlint: config, deny/warn/allow, plugins, tsconfig, ignorePath
  - prettier-format: config
  - shellcheck: exclude, enable, include, rcfile, sourcePath
  - stylelint: maxWarnings, config, ignorePath
  - Output schema: column in diagnostics (eslint, stylelint, oxlint, shellcheck, hadolint, biome), fixableErrorCount/fixableWarningCount (eslint), wikiUrl for hadolint DL rules

- [#453](https://github.com/Dave-London/Pare/pull/453) [`21dfa99`](https://github.com/Dave-London/Pare/commit/21dfa99862afa575360eca1eb1dda71f767a349f) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity gap items across all lint tools:
  - biome-check: Add `apply`, `applyUnsafe`, `diagnosticLevel`, `changed`, and `staged` params
  - biome-format: Add `changed`, `staged`, `indentStyle`, `lineWidth`, `quoteStyle`, `semicolons`, and `lineEnding` params
  - format-check: Add `ignoreUnknown`, `cache`, `noConfig`, and `logLevel` params
  - hadolint: Add `failureThreshold`, `noFail`, `strictLabels`, and `verbose` params
  - lint (eslint): Add `quiet`, `noIgnore`, `cache`, and `fixDryRun` params
  - oxlint: Add `fix`, `quiet`, `fixSuggestions`, `threads`, and `noIgnore` params
  - prettier-format: Add `ignoreUnknown`, `cache`, `noConfig`, `logLevel`, and `endOfLine` params
  - shellcheck: Add `shell`, `externalSources`, `checkSourced`, and `norc` params
  - stylelint: Add `quiet`, `allowEmptyInput`, `cache`, `reportNeedlessDisables`, and `ignoreDisables` params

#### @paretools/make

##### Minor Changes

- [#491](https://github.com/Dave-London/Pare/pull/491) [`6645090`](https://github.com/Dave-London/Pare/commit/66450909dde407c74341ff352c84a23e0e1d0668) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(make): add just JSON dump, phony targets, dependencies, and timeout detection (P1)
  - Use `just --dump-format json` for more reliable recipe parsing
  - Extract `.PHONY` targets and add `isPhony` field to target entries
  - Add `dependencies` field to target entries
  - Add `timedOut` detection to run tool output

- [#466](https://github.com/Dave-London/Pare/pull/466) [`7699f73`](https://github.com/Dave-London/Pare/commit/7699f730bf2e4e5edb16fa9f529db018edd91685) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for make tools:

  **list**: Add `file` param (maps to `make -f` / `just --justfile`) for non-default makefiles/justfiles. Add `filter` param for client-side regex filtering on target names.

  **run**: Add `file` param (maps to `make -f` / `just --justfile`) for non-default makefiles/justfiles. Add `env` param (Record<string, string>) for environment variable passthrough to target execution.

- [#456](https://github.com/Dave-London/Pare/pull/456) [`c2474af`](https://github.com/Dave-London/Pare/commit/c2474af3659a57685c1324e621be7c4fdbab64bc) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - run: dryRun, jobs, silent, keepGoing, alwaysMake, verbose, trace, question
  - list: includeSubmodules, unsorted

- [#475](https://github.com/Dave-London/Pare/pull/475) [`f94ec73`](https://github.com/Dave-London/Pare/commit/f94ec730e6adcd0a77774e1e849dd82b8404d201) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): add stderr to init output schema for error visibility
  fix(make): parse make target descriptions from ## comment convention

#### @paretools/npm

##### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#475](https://github.com/Dave-London/Pare/pull/475) [`f94ec73`](https://github.com/Dave-London/Pare/commit/f94ec730e6adcd0a77774e1e849dd82b8404d201) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): add stderr to init output schema for error visibility
  fix(make): parse make target descriptions from ## comment convention

- [#498](https://github.com/Dave-London/Pare/pull/498) [`e78ddea`](https://github.com/Dave-London/Pare/commit/e78ddeab1679fbd767251da9e6346ebda318d4ce) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(npm): improve install/list output, add nvm modes, add timeout detection (P1)
  - Improve install output with specific package details (best-effort parsing)
  - Fix pnpm workspace array handling in list tool (merges all workspace projects)
  - Add dependency type field to list output (dependency/devDependency/optionalDependency)
  - Add nvm ls-remote and exec actions
  - Add LTS tagging to nvm version output
  - Add timeout detection to run tool
  - Add best-effort test result parsing to test tool (jest/vitest/mocha/tap)

- [#465](https://github.com/Dave-London/Pare/pull/465) [`8be4ff2`](https://github.com/Dave-London/Pare/commit/8be4ff272de5657041e2d1927c8a33f171ea4745) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for npm tools:

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

- [#444](https://github.com/Dave-London/Pare/pull/444) [`10583b5`](https://github.com/Dave-London/Pare/commit/10583b55d936c426d71b986f2895d1d0171191b2) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity missing flags and security fixes across all npm tools:
  - **init**: `force` (--force), `private` (yarn --private)
  - **install**: `saveDev` (--save-dev), `frozenLockfile` (--frozen-lockfile / npm ci), `dryRun` (--dry-run), `production` (--omit=dev / --prod / --production), `legacyPeerDeps` (--legacy-peer-deps), `force` (--force), `noAudit` (--no-audit), `exact` (--save-exact)
  - **list**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `global` (--global), security fix for `filter` param
  - **outdated**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `compatible` (--compatible), `devOnly` (--dev), security fix for `filter` param
  - **run**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
  - **test**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
  - **search**: `preferOnline` (--prefer-online)
  - **audit**: `packageLockOnly` (--package-lock-only)

#### @paretools/process

##### Minor Changes

- [#490](https://github.com/Dave-London/Pare/pull/490) [`0cee3e2`](https://github.com/Dave-London/Pare/commit/0cee3e2c9052ceb9167cfd121c4a8065ff1fe665) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(process): add truncated detection, shell mode, and stripEnv options (P1)
  - Add `truncated` boolean to output schema for maxBuffer detection
  - Add `shell` parameter for shell-mode execution with security warnings
  - Add `stripEnv` parameter for minimal environment isolation

- [#464](https://github.com/Dave-London/Pare/pull/464) [`d0083a0`](https://github.com/Dave-London/Pare/commit/d0083a04c0118bcd7cc821b59d370d7d7f0bb16b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for the process run tool:
  - Add `stdin` param for piping input data to commands (e.g., jq, grep)
  - Add `maxBuffer` param to control maximum stdout+stderr buffer size
  - Add `killSignal` param (enum) to control signal sent on timeout
  - Add `maxOutputLines` param to truncate output by line count (agent-friendly)
  - Add `encoding` param (enum) for non-UTF-8 output support
  - Add `stdoutTruncatedLines` and `stderrTruncatedLines` output fields

#### @paretools/python

##### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

- [#477](https://github.com/Dave-London/Pare/pull/477) [`1101a13`](https://github.com/Dave-London/Pare/commit/1101a1366e87f9e1d0f484c5bb218adde2718607) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python): fix pip-audit redundant arg, pip-install dry-run parsing, pyenv current detection, ruff-format check mode parsing, black exit code distinction, and uv-install resolution error parsing

- [#501](https://github.com/Dave-London/Pare/pull/501) [`15f7c52`](https://github.com/Dave-London/Pare/commit/15f7c52b5f984f5fb6004284baa9cad036545742) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(python): improve mypy, pip, poetry, pyenv, pytest, ruff output (P1)
  - Switch mypy to JSON output for reliable parsing
  - Separate notes from warnings in mypy output
  - Add severity/aliases to pip-audit vulnerabilities
  - Surface pip-list parse errors
  - Support multiple packages in pip-show
  - Tighten poetry show regex
  - Add pyenv uninstall action
  - Add warnings count to pytest output
  - Capture ruff-check fix applicability

- [#461](https://github.com/Dave-London/Pare/pull/461) [`5e6cee4`](https://github.com/Dave-London/Pare/commit/5e6cee45b7f740ffa7851ee0d4ac29f4792d9c8f) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Python tools:
  - pip-audit: Add `success` output field, `ignoreVuln`, `vulnerabilityService`, and `indexUrl` params
  - pip-list: Add `success` output field, `location` and `editableProject` per-package fields, `exclude` param
  - pip-show: Add `success`, `requiredBy`, `authorEmail`, `metadataVersion`, `classifiers` output fields; fix key-value parser to split on first `: ` only
  - pip-install: Add `constraint`, `editable`, `indexUrl`, `extraIndexUrl`, `target`, `report` params
  - pytest: Add `keyword`, `tracebackStyle`, `coverage`, `parallel`, `configFile` params
  - ruff-check: Add `success` and `url` output fields, `select`, `ignore`, `config`, `targetVersion`, `exclude` params
  - ruff-format: Add `config`, `targetVersion`, `exclude`, `range`, `quoteStyle` params
  - mypy: Add `configFile`, `pythonVersion`, `exclude`, `followImports`, `module`, `package`, `installTypes` params
  - black: Add `config` param
  - conda: Add `prefix` and `packageFilter` params
  - poetry: Add `description` to show output, `group` and `format` params
  - uv-install: Add `editable`, `constraint`, `indexUrl`, `python`, `extras` params
  - uv-run: Add `withPackages`, `python`, `envFile` params

- [#448](https://github.com/Dave-London/Pare/pull/448) [`2a0c827`](https://github.com/Dave-London/Pare/commit/2a0c82706c7917f490affd3ed89945f5c2aa9532) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Python tools (XS complexity gaps)

#### @paretools/search

##### Minor Changes

- [#467](https://github.com/Dave-London/Pare/pull/467) [`fc131b3`](https://github.com/Dave-London/Pare/commit/fc131b3cd1d5248f143e62bc2eb6efcaf04bad3b) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for search tools:

  **count**: Add `maxResults` param for per-file list truncation. Add `type` param (maps to `--type`) for file type filtering. Add `sort` param (`path` or `count`) for client-side result sorting.

  **find**: Add `exclude` param (maps to `--exclude`) for pattern exclusion. Add `size` param (maps to `--size`) for file size filtering. Add `changedWithin` param (maps to `--changed-within`) for recent file discovery. Extend `type` enum with `executable` and `empty`. Normalize `ext` output to strip leading dot (matches input format).

  **search**: Add `type` param (maps to `--type`) for file type filtering. Add `sort` param (maps to `--sort`) for rg-native result sorting.

  **jq**: Add `arg` param (maps to `--arg`) for named string variables. Add `argjson` param (maps to `--argjson`) for named JSON variables.

- [#442](https://github.com/Dave-London/Pare/pull/442) [`cd736d4`](https://github.com/Dave-London/Pare/commit/cd736d4d1039e849dd40f424f246b50aa07efd3e) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - count: countMatches, fixedStrings, wordRegexp, invertMatch, hidden, includeZero, maxDepth, noIgnore
  - find: maxDepth, hidden, absolutePath, fullPath, glob, noIgnore, follow
  - jq: nullInput, slurp, compactOutput, rawInput, exitStatus, indent, joinOutput, assertNoFlagInjection on expression
  - search: maxCount, fixedStrings, wordRegexp, invertMatch, multiline, hidden, maxDepth, followSymlinks, noIgnore

#### @paretools/security

##### Minor Changes

- [#472](https://github.com/Dave-London/Pare/pull/472) [`2df220c`](https://github.com/Dave-London/Pare/commit/2df220c53ccb367442e58ffb6464321ad9baec62) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for security tools
  - gitleaks: Add redact (default: true), config, baselinePath, logOpts, enableRule params
  - semgrep: Change config to accept string | string[] for repeatable --config; add exclude, include, excludeRule, baselineCommit params
  - trivy: Change severity to accept single value or array/CSV; add scanners, vulnType, skipDirs, skipFiles, platform, ignorefile params

- [#454](https://github.com/Dave-London/Pare/pull/454) [`537e0d6`](https://github.com/Dave-London/Pare/commit/537e0d6708ae1197aaaedcb8ca2d22f8e28b1d0d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters from XS-complexity audit gaps
  - trivy: assertNoFlagInjection on target, exitCode, skipDbUpdate
  - semgrep: dataflowTraces, autofix, dryrun, maxTargetBytes, jobs
  - gitleaks: followSymlinks, maxTargetMegabytes, logLevel, exitCode

#### @paretools/shared

##### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

- [#473](https://github.com/Dave-London/Pare/pull/473) [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915) Thanks [@Dave-London](https://github.com/Dave-London)! - Raise default runner and test timeouts from 60s/120s to 180s to fix Windows CI flakiness

#### @paretools/test

##### Minor Changes

- [#485](https://github.com/Dave-London/Pare/pull/485) [`4a28353`](https://github.com/Dave-London/Pare/commit/4a283534680f6a3c6362ff329e5785464b4f3527) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(test): add bail, testNamePattern, workers params to run and failUnder to coverage

- [#494](https://github.com/Dave-London/Pare/pull/494) [`6b292bb`](https://github.com/Dave-London/Pare/commit/6b292bbee33ed85e4311361f23d7847b05ce58c1) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(test): add meetsThreshold, playwright flaky detection, and timeout param (P1)
  - Add `meetsThreshold` boolean to coverage output when `failUnder` is specified
  - Add `flaky` count to Playwright test results from JSON stats
  - Add `timeout` parameter to test run tool with per-framework mapping

- [#469](https://github.com/Dave-London/Pare/pull/469) [`5b0090f`](https://github.com/Dave-London/Pare/commit/5b0090f38625a8b0366eb80e516f603bc6356a30) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for test tools
  - coverage: Add args, source, exclude, filter params with per-framework flag mapping
  - playwright: Add grep, browser, shard, trace (enum), config params
  - run: Add shard, config params with per-framework flag mapping

- [#455](https://github.com/Dave-London/Pare/pull/455) [`0b94417`](https://github.com/Dave-London/Pare/commit/0b94417c988376c93204acd54e9108b7416610b3) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity missing flags across all test tools:
  - **playwright**: `workers` (--workers), `retries` (--retries), `maxFailures` (--max-failures), `timeout` (--timeout), `lastFailed` (--last-failed), `onlyChanged` (--only-changed), `forbidOnly` (--forbid-only), `passWithNoTests` (--pass-with-no-tests)
  - **run**: `onlyChanged` (--lf / --onlyChanged / --changed), `exitFirst` (-x / --bail=1 / -b), `passWithNoTests` (--passWithNoTests)
  - **coverage**: `branch` (--cov-branch), `all` (--coverage.all / --all)

##### Patch Changes

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

---

### 0.8.5

#### @paretools/shared

##### Patch Changes

- [#431](https://github.com/Dave-London/Pare/pull/431) [`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a) Thanks [@Dave-London](https://github.com/Dave-London)! - Align @paretools/shared version with all server packages

---

### 0.8.3

#### @paretools/build

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/cargo

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/docker

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/git

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/go

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/lint

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/npm

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/python

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/shared

##### Patch Changes

- [#428](https://github.com/Dave-London/Pare/pull/428) [`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210) Thanks [@Dave-London](https://github.com/Dave-London)! - Align shared package version with server packages at 0.8.3

#### @paretools/test

##### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

---

### 0.8.2

#### @paretools/build

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add turbo and nx monorepo build tools.

#### @paretools/cargo

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

#### @paretools/docker

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add compose-logs, compose-build, and docker-stats tools.

#### @paretools/git

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add log-graph, reflog, bisect, and worktree tools. Fix file path case mismatch on Windows.

#### @paretools/github

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add run-rerun, pr-checks, pr-diff, gh-api, gist-create, release-create, and release-list tools.

#### @paretools/go

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

#### @paretools/http

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Document tool schemas for http and make tools.

#### @paretools/k8s

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).

#### @paretools/lint

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shellcheck (shell script linter) and hadolint (Dockerfile linter) tools.

#### @paretools/make

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Document tool schemas for http and make tools.

#### @paretools/npm

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add pnpm and yarn package manager support. Add nvm tool for Node.js version management.

#### @paretools/process

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).

#### @paretools/python

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add conda, pyenv, and poetry tools for Python environment and dependency management.

#### @paretools/search

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

#### @paretools/shared

##### Patch Changes

- [#421](https://github.com/Dave-London/Pare/pull/421) [`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: include assertAllowedRoot and assertAllowedByPolicy exports that were missing from v0.8.1

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/test

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add playwright tool for running Playwright tests with structured JSON results.

---

### 0.8.1

#### @paretools/build

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/cargo

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/docker

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/git

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/github

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/go

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/http

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/lint

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/make

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/npm

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/python

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/search

##### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/shared

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/test

##### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

---

### 0.8.0

#### @paretools/build

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/cargo

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/docker

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/git

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/github

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/go

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/http

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/lint

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/make

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/npm

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/python

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/search

##### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

##### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

#### @paretools/shared

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/test

##### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

---

### 0.7.0

#### @paretools/build

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/cargo

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/docker

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/git

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/github

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/go

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/http

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/lint

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/make

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/npm

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/python

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/search

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/shared

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/test

##### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

---

### 0.6.0

#### @paretools/build

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/cargo

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/docker

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/git

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/go

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/lint

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/npm

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/python

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/shared

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/test

##### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

---

### 0.5.0

#### @paretools/build

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/cargo

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/docker

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/git

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/go

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/lint

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/npm

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/python

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/shared

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/test

##### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

---

### 0.3.0

#### @paretools/build

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/cargo

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/docker

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/git

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/go

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/lint

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/npm

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/python

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/shared

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/test

##### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

---

### 0.2.0

#### @paretools/build

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/cargo

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/docker

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/git

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/go

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/init

##### Minor Changes

- [#599](https://github.com/Dave-London/Pare/pull/599) [`cbc81e0`](https://github.com/Dave-London/Pare/commit/cbc81e020d641156625a646bd565e79ab4b18530) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(init): add `@paretools/init` setup CLI and `pare-doctor` health check
  - `npx @paretools/init` — interactive setup that auto-detects AI clients, offers presets, and writes config
  - `npx @paretools/doctor` — health check that spawns configured servers and verifies MCP connectivity
  - Supports 11 clients: Claude Code, Claude Desktop, Cursor, VS Code/Copilot, Windsurf, Zed, Cline, Roo Code, OpenAI Codex, Continue.dev, Gemini CLI
  - 6 presets: web, python, rust, go, devops, full
  - Platform-aware: auto-wraps npx with `cmd /c` on Windows
  - Additive merge: never removes existing non-Pare config entries

#### @paretools/lint

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/npm

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/python

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/shared

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/test

##### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

---

### 0.1.1

#### @paretools/security

##### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).

<!-- END AGGREGATED CHANGELOG -->
