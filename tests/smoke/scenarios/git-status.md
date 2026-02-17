# Smoke Test Scenarios: git.status

## Tool: `@paretools/git` → `status`

## Implementation: `packages/server-git/src/tools/status.ts`

## Parser: `parseStatus` (v1), `parseStatusV2` (v2)

## Schema: `GitStatusSchema`

## Input params

| Param              | Type                                      | Required | Notes                    |
| ------------------ | ----------------------------------------- | -------- | ------------------------ |
| `path`             | string                                    | no       | Repository path          |
| `pathspec`         | string[]                                  | no       | Filter to specific paths |
| `untrackedFiles`   | "no" \| "normal" \| "all"                 | no       | Untracked display mode   |
| `ignoreSubmodules` | "none" \| "untracked" \| "dirty" \| "all" | no       | Submodule filter         |
| `showStash`        | boolean                                   | no       | Include stash count      |
| `renames`          | boolean                                   | no       | Enable rename detection  |
| `noRenames`        | boolean                                   | no       | Disable rename detection |
| `noLockIndex`      | boolean                                   | no       | Skip index lock          |
| `showIgnored`      | boolean                                   | no       | Include ignored files    |
| `porcelainVersion` | "v1" \| "v2"                              | no       | Default: v1              |

## Scenarios

### Happy path / core functionality

| #   | Scenario                                    | Params     | Expected Output                                                                        | Priority | Status   |
| --- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- | -------- | -------- |
| 1   | Clean repo, no changes                      | `{ path }` | `{ clean: true, staged: [], modified: [], deleted: [], untracked: [], conflicts: [] }` | P0       | recorded |
| 2   | Staged files (added)                        | `{ path }` | `staged: [{ file, status: "added" }]`, `clean: false`                                  | P0       | recorded |
| 3   | Staged files (modified)                     | `{ path }` | `staged: [{ file, status: "modified" }]`                                               | P0       | recorded |
| 4   | Staged files (deleted)                      | `{ path }` | `staged: [{ file, status: "deleted" }]`                                                | P0       | recorded |
| 5   | Staged rename                               | `{ path }` | `staged: [{ file: "new", status: "renamed", oldFile: "old" }]`                         | P0       | recorded |
| 6   | Worktree modified files                     | `{ path }` | `modified: ["file.txt"]`, staged empty                                                 | P0       | recorded |
| 7   | Worktree deleted files                      | `{ path }` | `deleted: ["file.txt"]`                                                                | P0       | recorded |
| 8   | Untracked files                             | `{ path }` | `untracked: ["new-file.txt"]`                                                          | P0       | recorded |
| 9   | Mixed state (staged + modified + untracked) | `{ path }` | All arrays populated, `clean: false`                                                   | P0       | recorded |
| 10  | Both staged and worktree modified (MM)      | `{ path }` | File in both `staged` and `modified`                                                   | P0       | recorded |

### Branch & upstream

| #   | Scenario                         | Params     | Expected Output                                                | Priority | Status   |
| --- | -------------------------------- | ---------- | -------------------------------------------------------------- | -------- | -------- |
| 11  | On branch with upstream tracking | `{ path }` | `branch: "main"`, `upstream: "origin/main"`                    | P0       | recorded |
| 12  | Ahead of upstream                | `{ path }` | `ahead: N > 0`                                                 | P0       | recorded |
| 13  | Behind upstream                  | `{ path }` | `behind: N > 0`                                                | P0       | recorded |
| 14  | Ahead and behind                 | `{ path }` | Both `ahead` and `behind` > 0                                  | P1       | recorded |
| 15  | Detached HEAD                    | `{ path }` | `branch` is HEAD sha or "(HEAD detached at ...)"`              | P1       | recorded |
| 16  | No upstream configured           | `{ path }` | `upstream: undefined`, `ahead: undefined`, `behind: undefined` | P1       | recorded |
| 17  | New branch, no commits           | `{ path }` | `branch: "new-branch"`, no upstream                            | P2       | recorded |

### Conflicts

| #   | Scenario                 | Params     | Expected Output               | Priority | Status   |
| --- | ------------------------ | ---------- | ----------------------------- | -------- | -------- |
| 18  | Merge conflict (UU)      | `{ path }` | `conflicts: ["file.txt"]`     | P0       | recorded |
| 19  | Both added conflict (AA) | `{ path }` | `conflicts: ["file.txt"]`     | P1       | recorded |
| 20  | Multiple conflict types  | `{ path }` | Multiple files in `conflicts` | P1       | recorded |

### Optional params — untrackedFiles

| #   | Scenario                           | Params                               | Expected Output                                      | Priority | Status |
| --- | ---------------------------------- | ------------------------------------ | ---------------------------------------------------- | -------- | ------ |
| 21  | untrackedFiles: "no"               | `{ path, untrackedFiles: "no" }`     | `untracked: []` even with untracked files present    | P1       | mocked |
| 22  | untrackedFiles: "all"              | `{ path, untrackedFiles: "all" }`    | Individual files within untracked directories listed | P1       | mocked |
| 23  | untrackedFiles: "normal" (default) | `{ path, untrackedFiles: "normal" }` | Same as default behavior                             | P2       | mocked |

### Optional params — pathspec

| #   | Scenario                             | Params                                 | Expected Output                 | Priority | Status |
| --- | ------------------------------------ | -------------------------------------- | ------------------------------- | -------- | ------ |
| 24  | Pathspec single dir                  | `{ path, pathspec: ["src/"] }`         | Only files under src/ in output | P1       | mocked |
| 25  | Pathspec single file                 | `{ path, pathspec: ["file.txt"] }`     | Only that file in output        | P1       | mocked |
| 26  | Pathspec no matches                  | `{ path, pathspec: ["nonexistent/"] }` | All arrays empty, `clean: true` | P2       | mocked |
| 27  | Pathspec with flag injection attempt | `{ path, pathspec: ["--exec=evil"] }`  | `assertNoFlagInjection` throws  | P0       | mocked |

### Optional params — other flags

| #   | Scenario                       | Params                              | Expected Output                                       | Priority | Status |
| --- | ------------------------------ | ----------------------------------- | ----------------------------------------------------- | -------- | ------ |
| 28  | showStash: true (with stashes) | `{ path, showStash: true }`         | `stashCount: N > 0` in output (if schema supports it) | P1       | mocked |
| 29  | showStash: true (no stashes)   | `{ path, showStash: true }`         | `stashCount: 0` or field absent                       | P2       | mocked |
| 30  | noLockIndex: true              | `{ path, noLockIndex: true }`       | Same output, `--no-lock-index` in args                | P2       | mocked |
| 31  | showIgnored: true              | `{ path, showIgnored: true }`       | Ignored files included in output                      | P2       | mocked |
| 32  | renames: true                  | `{ path, renames: true }`           | `--renames` in args                                   | P2       | mocked |
| 33  | noRenames: true                | `{ path, noRenames: true }`         | `--no-renames` in args, renames not detected          | P2       | mocked |
| 34  | ignoreSubmodules: "all"        | `{ path, ignoreSubmodules: "all" }` | Submodule changes excluded                            | P2       | mocked |

### Porcelain v2

| #   | Scenario                              | Params                             | Expected Output                               | Priority | Status   |
| --- | ------------------------------------- | ---------------------------------- | --------------------------------------------- | -------- | -------- |
| 35  | porcelainVersion: "v2" clean repo     | `{ path, porcelainVersion: "v2" }` | Same schema shape, parsed from v2 format      | P1       | recorded |
| 36  | porcelainVersion: "v2" with changes   | `{ path, porcelainVersion: "v2" }` | staged/modified/etc populated from v2 format  | P1       | recorded |
| 37  | porcelainVersion: "v2" with conflicts | `{ path, porcelainVersion: "v2" }` | Conflicts detected from `u ` prefix lines     | P1       | recorded |
| 38  | porcelainVersion: "v2" with renames   | `{ path, porcelainVersion: "v2" }` | Rename with oldFile from tab-separated fields | P2       | recorded |

### Error paths

| #   | Scenario         | Params                         | Expected Output                   | Priority | Status   |
| --- | ---------------- | ------------------------------ | --------------------------------- | -------- | -------- |
| 39  | Not a git repo   | `{ path: "/tmp/not-a-repo" }`  | Error thrown: "git status failed" | P0       | recorded |
| 40  | Nonexistent path | `{ path: "/tmp/nonexistent" }` | Error thrown                      | P1       | mocked   |

### Schema validation

| #   | Scenario                                                | Params | Expected Output    | Priority | Status |
| --- | ------------------------------------------------------- | ------ | ------------------ | -------- | ------ |
| 41  | Every scenario output validates against GitStatusSchema | all    | Zod parse succeeds | P0       | mocked |

## Known bugs found during smoke testing

- **S38**: v2 rename parser swaps old/new filenames — `splitByTab[1]` (new path per git spec) is used as `oldFile`, `splitByTab[2]` (orig path) is used as `file`. Test matches current behavior to detect regressions.

## Summary

| Priority  | Count  | Mocked | Recorded | Complete |
| --------- | ------ | ------ | -------- | -------- |
| P0        | 13     | 13     | 13       | 0        |
| P1        | 16     | 16     | 10       | 0        |
| P2        | 12     | 12     | 3        | 0        |
| **Total** | **41** | **41** | **26**   | **0**    |
