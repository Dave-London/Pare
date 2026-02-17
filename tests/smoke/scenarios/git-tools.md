# Smoke Test Scenarios: All Git Tools (except status)

This file contains scenario mappings for all 23 git tools in `@paretools/git`, excluding `status` which is covered in `git-status.md`.

---

## Tool: `add`

### Implementation: `packages/server-git/src/tools/add.ts`

### Schema: `GitAddSchema`

### Input params

| Param              | Type         | Required | Notes                                                             |
| ------------------ | ------------ | -------- | ----------------------------------------------------------------- |
| `path`             | string       | no       | Repository path                                                   |
| `files`            | string[]     | no       | File paths to stage (required unless all/update/pathspecFromFile) |
| `all`              | boolean      | no       | Stage all changes (-A)                                            |
| `dryRun`           | boolean      | no       | Preview staging without changes                                   |
| `update`           | boolean      | no       | Stage only tracked file modifications (-u)                        |
| `force`            | boolean      | no       | Allow staging ignored files (-f)                                  |
| `intentToAdd`      | boolean      | no       | Record intent to add (-N)                                         |
| `ignoreRemoval`    | boolean      | no       | Add new/modified but not deletions                                |
| `renormalize`      | boolean      | no       | Re-apply clean filters                                            |
| `ignoreErrors`     | boolean      | no       | Continue past individual failures                                 |
| `pathspecFromFile` | string       | no       | Read pathspec from file                                           |
| `chmod`            | "+x" \| "-x" | no       | Override file permission bits                                     |

### Scenarios

| #   | Scenario                         | Params                                            | Expected Output                                               | Priority | Status  |
| --- | -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- | -------- | ------- |
| 1   | Stage specific files             | `{ path, files: ["a.ts"] }`                       | `staged >= 1`, `files` contains entry with `file: "a.ts"`     | P0       | pending |
| 2   | Stage all changes                | `{ path, all: true }`                             | `staged` matches total changed files, `files` array populated | P0       | pending |
| 3   | No files and no all throws error | `{ path }`                                        | Error: "Either 'files' must be provided..."                   | P0       | pending |
| 4   | Flag injection in file path      | `{ path, files: ["--exec=evil"] }`                | `assertNoFlagInjection` throws                                | P0       | pending |
| 5   | Stage multiple files             | `{ path, files: ["a.ts", "b.ts"] }`               | `staged >= 2`, both files in output                           | P0       | pending |
| 6   | Not a git repo                   | `{ path: "/tmp/not-a-repo", files: ["x"] }`       | Error thrown                                                  | P0       | pending |
| 7   | Stage with update (tracked only) | `{ path, update: true }`                          | Only tracked file modifications staged, untracked excluded    | P1       | pending |
| 8   | Dry run                          | `{ path, files: ["a.ts"], dryRun: true }`         | Files previewed but not actually staged                       | P1       | pending |
| 9   | Force staging ignored file       | `{ path, files: [".env"], force: true }`          | Ignored file staged successfully                              | P1       | pending |
| 10  | Intent to add                    | `{ path, files: ["new.ts"], intentToAdd: true }`  | File recorded with intent-to-add                              | P1       | pending |
| 11  | newlyStaged tracking             | `{ path, files: ["a.ts"] }` (a.ts already staged) | `newlyStaged: 0` or reflects pre-staged state                 | P1       | pending |
| 12  | pathspecFromFile                 | `{ path, pathspecFromFile: "filelist.txt" }`      | Files listed in file are staged                               | P2       | pending |
| 13  | chmod +x                         | `{ path, files: ["script.sh"], chmod: "+x" }`     | File staged with executable bit                               | P2       | pending |
| 14  | ignoreRemoval                    | `{ path, all: true, ignoreRemoval: true }`        | Deleted files not staged                                      | P2       | pending |
| 15  | Schema validation                | all scenarios                                     | Output validates against `GitAddSchema`                       | P0       | pending |

**Summary: P0=6, P1=5, P2=4, Total=15**

---

## Tool: `bisect`

### Implementation: `packages/server-git/src/tools/bisect.ts`

### Schema: `GitBisectSchema`

### Input params

| Param         | Type               | Required | Notes                                              |
| ------------- | ------------------ | -------- | -------------------------------------------------- |
| `path`        | string             | no       | Repository path                                    |
| `action`      | enum               | yes      | start, good, bad, reset, status, skip, run, replay |
| `bad`         | string             | no       | Bad commit ref (for start)                         |
| `good`        | string \| string[] | no       | Good commit ref(s) (for start)                     |
| `command`     | string             | no       | Script for automated bisect (for run)              |
| `replayFile`  | string             | no       | Bisect log file (for replay)                       |
| `paths`       | string[]           | no       | Restrict to paths                                  |
| `noCheckout`  | boolean            | no       | Bisect without checkout                            |
| `firstParent` | boolean            | no       | Follow first parent only                           |
| `termOld`     | string             | no       | Custom old/good term                               |
| `termNew`     | string             | no       | Custom new/bad term                                |

### Scenarios

| #   | Scenario                       | Params                                                                                     | Expected Output                                               | Priority | Status  |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------- | ------- |
| 1   | Start bisect with bad and good | `{ path, action: "start", bad: "HEAD", good: "abc123" }`                                   | `action: "start"`, `current` populated, `remaining` estimated | P0       | pending |
| 2   | Mark commit as good            | `{ path, action: "good" }`                                                                 | `action: "good"`, bisect advances                             | P0       | pending |
| 3   | Mark commit as bad             | `{ path, action: "bad" }`                                                                  | `action: "bad"`, bisect narrows                               | P0       | pending |
| 4   | Reset bisect session           | `{ path, action: "reset" }`                                                                | `action: "reset"`, session cleared                            | P0       | pending |
| 5   | Start without bad/good throws  | `{ path, action: "start" }`                                                                | Error: "Both 'bad' and 'good' commit refs are required"       | P0       | pending |
| 6   | Flag injection in bad ref      | `{ path, action: "start", bad: "--exec=evil", good: "abc" }`                               | `assertNoFlagInjection` throws                                | P0       | pending |
| 7   | Bisect run with command        | `{ path, action: "run", command: "npm test" }`                                             | `action: "run"`, result with identified commit                | P1       | pending |
| 8   | Run without command throws     | `{ path, action: "run" }`                                                                  | Error: "'command' parameter is required"                      | P1       | pending |
| 9   | Bisect status                  | `{ path, action: "status" }`                                                               | `action: "status"`, current session info                      | P1       | pending |
| 10  | Skip current commit            | `{ path, action: "skip" }`                                                                 | `action: "skip"`, bisect advances                             | P1       | pending |
| 11  | Replay from file               | `{ path, action: "replay", replayFile: "bisect.log" }`                                     | `action: "replay"`                                            | P2       | pending |
| 12  | Paths restriction              | `{ path, action: "start", bad: "HEAD", good: "abc", paths: ["src/"] }`                     | Bisect restricted to src/ changes                             | P2       | pending |
| 13  | Custom terms                   | `{ path, action: "start", bad: "HEAD", good: "abc", termOld: "fixed", termNew: "broken" }` | Custom terms applied                                          | P2       | pending |
| 14  | Schema validation              | all scenarios                                                                              | Output validates against `GitBisectSchema`                    | P0       | pending |

**Summary: P0=7, P1=4, P2=3, Total=14**

---

## Tool: `blame`

### Implementation: `packages/server-git/src/tools/blame.ts`

### Schema: `GitBlameSchema`

### Input params

| Param              | Type     | Required | Notes                                |
| ------------------ | -------- | -------- | ------------------------------------ |
| `path`             | string   | no       | Repository path                      |
| `file`             | string   | yes      | File path to blame                   |
| `startLine`        | number   | no       | Start line for range                 |
| `endLine`          | number   | no       | End line for range                   |
| `funcname`         | string   | no       | Blame by function name               |
| `rev`              | string   | no       | Blame from specific commit           |
| `ignoreRevsFile`   | string   | no       | File listing revisions to ignore     |
| `ignoreRev`        | string[] | no       | Specific commits to ignore           |
| `since`            | string   | no       | Limit blame to date range            |
| `detectMoves`      | boolean  | no       | Detect moved lines (-M)              |
| `detectCopies`     | boolean  | no       | Detect copied lines (-C)             |
| `ignoreWhitespace` | boolean  | no       | Ignore whitespace (-w)               |
| `reverse`          | boolean  | no       | Find when lines were removed         |
| `showStats`        | boolean  | no       | Include work-amount statistics       |
| `compact`          | boolean  | no       | Prefer compact output (default true) |

### Scenarios

| #   | Scenario                     | Params                                                      | Expected Output                                          | Priority | Status  |
| --- | ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- | -------- | ------- |
| 1   | Blame entire file            | `{ path, file: "src/index.ts" }`                            | `commits` array with grouped lines, `file`, `totalLines` | P0       | pending |
| 2   | File not found               | `{ path, file: "nonexistent.ts" }`                          | Error: "git blame failed"                                | P0       | pending |
| 3   | Flag injection in file param | `{ path, file: "--exec=evil" }`                             | `assertNoFlagInjection` throws                           | P0       | pending |
| 4   | Line range blame             | `{ path, file: "src/index.ts", startLine: 1, endLine: 10 }` | Only lines 1-10 in output                                | P1       | pending |
| 5   | Blame at specific rev        | `{ path, file: "src/index.ts", rev: "HEAD~5" }`             | Blame reflects state at rev                              | P1       | pending |
| 6   | Flag injection in rev        | `{ path, file: "x.ts", rev: "--exec=evil" }`                | `assertNoFlagInjection` throws                           | P0       | pending |
| 7   | Compact vs full output       | `{ path, file: "x.ts", compact: false }`                    | Full blame with all fields                               | P1       | pending |
| 8   | Ignore whitespace            | `{ path, file: "x.ts", ignoreWhitespace: true }`            | Whitespace-only changes attributed to original author    | P2       | pending |
| 9   | Detect moves                 | `{ path, file: "x.ts", detectMoves: true }`                 | Moved lines attributed to original commit                | P2       | pending |
| 10  | Function name blame          | `{ path, file: "x.ts", funcname: "myFunction" }`            | Only lines in function body                              | P2       | pending |
| 11  | Schema validation            | all scenarios                                               | Output validates against `GitBlameSchema`                | P0       | pending |

**Summary: P0=5, P1=3, P2=3, Total=11**

---

## Tool: `branch`

### Implementation: `packages/server-git/src/tools/branch.ts`

### Schema: `GitBranchSchema`

### Input params

| Param               | Type    | Required | Notes                       |
| ------------------- | ------- | -------- | --------------------------- |
| `path`              | string  | no       | Repository path             |
| `create`            | string  | no       | Create new branch           |
| `startPoint`        | string  | no       | Start point for creation    |
| `delete`            | string  | no       | Delete branch               |
| `rename`            | string  | no       | Rename current branch       |
| `setUpstream`       | string  | no       | Set tracking branch         |
| `sort`              | string  | no       | Sort branch list            |
| `contains`          | string  | no       | Filter by containing commit |
| `pattern`           | string  | no       | Filter by pattern           |
| `all`               | boolean | no       | Include remote branches     |
| `forceDelete`       | boolean | no       | Force-delete unmerged (-D)  |
| `merged`            | boolean | no       | Filter merged branches      |
| `noMerged`          | boolean | no       | Filter unmerged branches    |
| `remotes`           | boolean | no       | List remote branches only   |
| `verbose`           | boolean | no       | Verbose listing             |
| `force`             | boolean | no       | Force branch creation       |
| `switchAfterCreate` | boolean | no       | Switch to created branch    |
| `compact`           | boolean | no       | Prefer compact output       |

### Scenarios

| #   | Scenario                     | Params                                              | Expected Output                                  | Priority | Status  |
| --- | ---------------------------- | --------------------------------------------------- | ------------------------------------------------ | -------- | ------- |
| 1   | List branches                | `{ path }`                                          | `branches` array, `current` set to active branch | P0       | pending |
| 2   | Create branch                | `{ path, create: "feature-x" }`                     | Branch created, appears in listing               | P0       | pending |
| 3   | Delete branch                | `{ path, delete: "feature-x" }`                     | Branch deleted, removed from listing             | P0       | pending |
| 4   | Flag injection in create     | `{ path, create: "--exec=evil" }`                   | `assertNoFlagInjection` throws                   | P0       | pending |
| 5   | Not a git repo               | `{ path: "/tmp/not-a-repo" }`                       | Error thrown                                     | P0       | pending |
| 6   | Create and switch            | `{ path, create: "feat", switchAfterCreate: true }` | Branch created, `current` now "feat"             | P1       | pending |
| 7   | Create with start point      | `{ path, create: "feat", startPoint: "HEAD~3" }`    | Branch created from specified ref                | P1       | pending |
| 8   | Rename current branch        | `{ path, rename: "new-name" }`                      | Branch renamed, `current` reflects new name      | P1       | pending |
| 9   | List all (including remotes) | `{ path, all: true }`                               | Remote branches included in listing              | P1       | pending |
| 10  | Filter merged branches       | `{ path, merged: true }`                            | Only merged branches returned                    | P1       | pending |
| 11  | Set upstream                 | `{ path, setUpstream: "origin/main" }`              | Upstream tracking configured                     | P1       | pending |
| 12  | Force delete unmerged        | `{ path, delete: "feat", forceDelete: true }`       | Unmerged branch deleted                          | P2       | pending |
| 13  | Sort by date                 | `{ path, sort: "-committerdate" }`                  | Branches sorted by commit date                   | P2       | pending |
| 14  | Contains filter              | `{ path, contains: "abc123" }`                      | Only branches containing commit                  | P2       | pending |
| 15  | Compact vs full output       | `{ path, compact: false }`                          | Full branch data with upstream, lastCommit       | P2       | pending |
| 16  | Schema validation            | all scenarios                                       | Output validates against `GitBranchSchema`       | P0       | pending |

**Summary: P0=6, P1=5, P2=5, Total=16**

---

## Tool: `checkout`

### Implementation: `packages/server-git/src/tools/checkout.ts`

### Schema: `GitCheckoutSchema`

### Input params

| Param         | Type    | Required | Notes                              |
| ------------- | ------- | -------- | ---------------------------------- |
| `path`        | string  | no       | Repository path                    |
| `ref`         | string  | yes      | Branch, tag, or commit to checkout |
| `create`      | boolean | no       | Create new branch (-b)             |
| `startPoint`  | string  | no       | Start point for new branch         |
| `orphan`      | string  | no       | Create orphan branch               |
| `force`       | boolean | no       | Force checkout (-f)                |
| `track`       | boolean | no       | Set up tracking                    |
| `forceCreate` | boolean | no       | Force-create branch (-B)           |
| `detach`      | boolean | no       | Detach HEAD                        |
| `useSwitch`   | boolean | no       | Use git switch (default true)      |

### Scenarios

| #   | Scenario                           | Params                                                      | Expected Output                                        | Priority | Status  |
| --- | ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | -------- | ------- |
| 1   | Switch to existing branch          | `{ path, ref: "main" }`                                     | `success: true`, `ref: "main"`, `previousRef` set      | P0       | pending |
| 2   | Create and switch to new branch    | `{ path, ref: "feat", create: true }`                       | `success: true`, `created: true`, `ref: "feat"`        | P0       | pending |
| 3   | Checkout nonexistent ref           | `{ path, ref: "nonexistent" }`                              | `success: false`, `errorType` set                      | P0       | pending |
| 4   | Flag injection in ref              | `{ path, ref: "--exec=evil" }`                              | `assertNoFlagInjection` throws                         | P0       | pending |
| 5   | Detach HEAD at commit              | `{ path, ref: "abc123", detach: true }`                     | `success: true`, `detached: true`                      | P1       | pending |
| 6   | Orphan branch creation             | `{ path, ref: "x", orphan: "orphan-branch" }`               | `success: true`, `created: true`                       | P1       | pending |
| 7   | Force checkout with dirty tree     | `{ path, ref: "main", force: true }`                        | `success: true`, local changes discarded               | P1       | pending |
| 8   | Create with start point            | `{ path, ref: "feat", create: true, startPoint: "HEAD~3" }` | Branch created from start point                        | P1       | pending |
| 9   | Force create existing branch       | `{ path, ref: "existing", forceCreate: true }`              | Branch reset and checked out                           | P1       | pending |
| 10  | modifiedFiles populated            | `{ path, ref: "other-branch" }`                             | `modifiedFiles` lists files differing between branches | P2       | pending |
| 11  | useSwitch: false uses git checkout | `{ path, ref: "main", useSwitch: false }`                   | Same result but via git checkout command               | P2       | pending |
| 12  | Schema validation                  | all scenarios                                               | Output validates against `GitCheckoutSchema`           | P0       | pending |

**Summary: P0=5, P1=5, P2=2, Total=12**

---

## Tool: `cherry-pick`

### Implementation: `packages/server-git/src/tools/cherry-pick.ts`

### Schema: `GitCherryPickSchema`

### Input params

| Param                  | Type     | Required | Notes                              |
| ---------------------- | -------- | -------- | ---------------------------------- |
| `path`                 | string   | no       | Repository path                    |
| `commits`              | string[] | no       | Commit hashes to cherry-pick       |
| `abort`                | boolean  | no       | Abort in-progress cherry-pick      |
| `continue`             | boolean  | no       | Continue after conflict resolution |
| `skip`                 | boolean  | no       | Skip current cherry-pick           |
| `quit`                 | boolean  | no       | Quit without reverting             |
| `noCommit`             | boolean  | no       | Apply without committing (-n)      |
| `mainline`             | number   | no       | Parent number for merge commits    |
| `appendCherryPickLine` | boolean  | no       | Append cherry-pick reference (-x)  |
| `allowEmpty`           | boolean  | no       | Allow empty commits                |
| `signoff`              | boolean  | no       | Add Signed-off-by                  |
| `keepRedundantCommits` | boolean  | no       | Keep redundant/empty commits       |
| `strategy`             | string   | no       | Merge strategy                     |
| `strategyOption`       | string   | no       | Strategy-specific option           |

### Scenarios

| #   | Scenario                       | Params                                        | Expected Output                                              | Priority | Status  |
| --- | ------------------------------ | --------------------------------------------- | ------------------------------------------------------------ | -------- | ------- |
| 1   | Cherry-pick single commit      | `{ path, commits: ["abc123"] }`               | `success: true`, `applied: ["abc123"]`, `conflicts: []`      | P0       | pending |
| 2   | Cherry-pick with conflict      | `{ path, commits: ["conflicting"] }`          | `success: false`, `state: "conflict"`, `conflicts` populated | P0       | pending |
| 3   | No commits and no action flags | `{ path }`                                    | Error: "commits array is required"                           | P0       | pending |
| 4   | Flag injection in commits      | `{ path, commits: ["--exec=evil"] }`          | `assertNoFlagInjection` throws                               | P0       | pending |
| 5   | Abort cherry-pick              | `{ path, abort: true }`                       | `success: true`, cherry-pick aborted                         | P0       | pending |
| 6   | Continue after conflict        | `{ path, continue: true }`                    | Cherry-pick continues                                        | P1       | pending |
| 7   | Skip current commit            | `{ path, skip: true }`                        | Current commit skipped                                       | P1       | pending |
| 8   | No-commit mode                 | `{ path, commits: ["abc"], noCommit: true }`  | Changes applied but not committed                            | P1       | pending |
| 9   | Cherry-pick multiple commits   | `{ path, commits: ["abc", "def"] }`           | Multiple commits applied                                     | P1       | pending |
| 10  | Cherry-pick merge commit       | `{ path, commits: ["merge"], mainline: 1 }`   | Merge commit cherry-picked with parent 1                     | P2       | pending |
| 11  | Strategy option                | `{ path, commits: ["abc"], strategy: "ort" }` | Strategy applied                                             | P2       | pending |
| 12  | Schema validation              | all scenarios                                 | Output validates against `GitCherryPickSchema`               | P0       | pending |

**Summary: P0=6, P1=4, P2=2, Total=12**

---

## Tool: `commit`

### Implementation: `packages/server-git/src/tools/commit.ts`

### Schema: `GitCommitSchema`

### Input params

| Param          | Type     | Required | Notes                         |
| -------------- | -------- | -------- | ----------------------------- |
| `path`         | string   | no       | Repository path               |
| `message`      | string   | yes      | Commit message                |
| `amend`        | boolean  | no       | Amend previous commit         |
| `noVerify`     | boolean  | no       | Bypass hooks                  |
| `allowEmpty`   | boolean  | no       | Allow empty commit            |
| `all`          | boolean  | no       | Auto-stage tracked files (-a) |
| `signoff`      | boolean  | no       | Add Signed-off-by             |
| `noEdit`       | boolean  | no       | Keep message with amend       |
| `dryRun`       | boolean  | no       | Preview commit                |
| `gpgSign`      | boolean  | no       | GPG sign commit               |
| `resetAuthor`  | boolean  | no       | Reset author on amend         |
| `trailer`      | string[] | no       | Trailer strings               |
| `author`       | string   | no       | Override author               |
| `date`         | string   | no       | Override author date          |
| `fixup`        | string   | no       | Create fixup commit           |
| `cleanup`      | string   | no       | Message whitespace handling   |
| `reuseMessage` | string   | no       | Reuse message from commit     |

### Scenarios

| #   | Scenario                         | Params                                                            | Expected Output                                     | Priority | Status  |
| --- | -------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- | -------- | ------- |
| 1   | Basic commit with staged changes | `{ path, message: "feat: add feature" }`                          | `hash`, `hashShort`, `message`, `filesChanged >= 1` | P0       | pending |
| 2   | Commit with nothing staged       | `{ path, message: "empty" }`                                      | Error: "git commit failed" (nothing to commit)      | P0       | pending |
| 3   | Flag injection in message        | `{ path, message: "--exec=evil" }`                                | `assertNoFlagInjection` throws                      | P0       | pending |
| 4   | Allow empty commit               | `{ path, message: "empty", allowEmpty: true }`                    | `hash`, `filesChanged: 0`                           | P0       | pending |
| 5   | Not a git repo                   | `{ path: "/tmp/not-a-repo", message: "x" }`                       | Error thrown                                        | P0       | pending |
| 6   | Amend commit                     | `{ path, message: "amended", amend: true }`                       | Previous commit amended, new hash                   | P1       | pending |
| 7   | Commit all tracked changes       | `{ path, message: "all", all: true }`                             | Modified tracked files auto-staged and committed    | P1       | pending |
| 8   | With trailers                    | `{ path, message: "feat", trailer: ["Co-authored-by: X <x@x>"] }` | Trailer appended to commit                          | P1       | pending |
| 9   | Signoff                          | `{ path, message: "feat", signoff: true }`                        | Signed-off-by trailer added                         | P1       | pending |
| 10  | Custom author                    | `{ path, message: "feat", author: "Test <test@test.com>" }`       | Author overridden                                   | P2       | pending |
| 11  | Dry run                          | `{ path, message: "feat", dryRun: true }`                         | Preview without committing                          | P2       | pending |
| 12  | Fixup commit                     | `{ path, message: "x", fixup: "HEAD~1" }`                         | Fixup commit created                                | P2       | pending |
| 13  | Schema validation                | all scenarios                                                     | Output validates against `GitCommitSchema`          | P0       | pending |

**Summary: P0=6, P1=4, P2=3, Total=13**

---

## Tool: `diff`

### Implementation: `packages/server-git/src/tools/diff.ts`

### Schema: `GitDiffSchema`

### Input params

| Param               | Type     | Required | Notes                             |
| ------------------- | -------- | -------- | --------------------------------- |
| `path`              | string   | no       | Repository path                   |
| `staged`            | boolean  | no       | Show staged changes (--cached)    |
| `ref`               | string   | no       | Compare against ref               |
| `file`              | string   | no       | Limit to specific file            |
| `files`             | string[] | no       | Limit to multiple files           |
| `full`              | boolean  | no       | Include patch content             |
| `atomicFull`        | boolean  | no       | Single invocation for stats+patch |
| `diffFilter`        | string   | no       | Filter by change type             |
| `algorithm`         | enum     | no       | Diff algorithm                    |
| `findRenames`       | number   | no       | Rename detection threshold        |
| `ignoreWhitespace`  | boolean  | no       | Ignore whitespace (-w)            |
| `contextLines`      | number   | no       | Context lines (-U)                |
| `nameStatus`        | boolean  | no       | Show name with status             |
| `ignoreSpaceChange` | boolean  | no       | Ignore space amount changes       |
| `reverse`           | boolean  | no       | Reverse diff direction            |
| `wordDiff`          | boolean  | no       | Word-level diff                   |
| `relative`          | boolean  | no       | Show relative paths               |
| `ignoreBlankLines`  | boolean  | no       | Ignore blank line changes         |
| `compact`           | boolean  | no       | Prefer compact output             |

### Scenarios

| #   | Scenario                         | Params                                   | Expected Output                               | Priority | Status  |
| --- | -------------------------------- | ---------------------------------------- | --------------------------------------------- | -------- | ------- |
| 1   | Unstaged changes in working tree | `{ path }`                               | `files` array with changes, `totalFiles >= 1` | P0       | pending |
| 2   | Staged changes                   | `{ path, staged: true }`                 | `files` reflect staged changes                | P0       | pending |
| 3   | No changes (clean)               | `{ path }` (clean repo)                  | `files: []`, `totalFiles: 0`                  | P0       | pending |
| 4   | Flag injection in ref            | `{ path, ref: "--exec=evil" }`           | `assertNoFlagInjection` throws                | P0       | pending |
| 5   | Flag injection in file           | `{ path, file: "--exec=evil" }`          | `assertNoFlagInjection` throws                | P0       | pending |
| 6   | Not a git repo                   | `{ path: "/tmp/not-a-repo" }`            | Error thrown                                  | P0       | pending |
| 7   | Diff against ref                 | `{ path, ref: "main" }`                  | Files changed since ref                       | P1       | pending |
| 8   | Single file diff                 | `{ path, file: "src/index.ts" }`         | Only that file in output                      | P1       | pending |
| 9   | Multiple file diff               | `{ path, files: ["a.ts", "b.ts"] }`      | Only specified files in output                | P1       | pending |
| 10  | Full patch mode                  | `{ path, full: true }`                   | `chunks` populated with headers and lines     | P1       | pending |
| 11  | Atomic full mode                 | `{ path, full: true, atomicFull: true }` | Same result, single git call                  | P1       | pending |
| 12  | Ignore whitespace                | `{ path, ignoreWhitespace: true }`       | Whitespace-only changes excluded              | P1       | pending |
| 13  | Diff filter (added only)         | `{ path, ref: "main", diffFilter: "A" }` | Only added files returned                     | P1       | pending |
| 14  | Binary file handling             | `{ path }` (binary changed)              | `binary: true` on binary file entry           | P1       | pending |
| 15  | Context lines                    | `{ path, full: true, contextLines: 0 }`  | No context lines in hunks                     | P2       | pending |
| 16  | Rename detection threshold       | `{ path, findRenames: 50 }`              | Renames detected at 50% threshold             | P2       | pending |
| 17  | Algorithm selection              | `{ path, algorithm: "histogram" }`       | Diff computed with histogram algorithm        | P2       | pending |
| 18  | Word diff                        | `{ path, wordDiff: true }`               | Word-level changes                            | P2       | pending |
| 19  | Compact vs full output           | `{ path, compact: false }`               | Full output with all fields                   | P2       | pending |
| 20  | Schema validation                | all scenarios                            | Output validates against `GitDiffSchema`      | P0       | pending |

**Summary: P0=7, P1=7, P2=6, Total=20**

---

## Tool: `log`

### Implementation: `packages/server-git/src/tools/log.ts`

### Schema: `GitLogSchema`

### Input params

| Param         | Type    | Required | Notes                           |
| ------------- | ------- | -------- | ------------------------------- |
| `path`        | string  | no       | Repository path                 |
| `maxCount`    | number  | no       | Number of commits (default 10)  |
| `ref`         | string  | no       | Branch/tag/commit to start from |
| `author`      | string  | no       | Filter by author                |
| `committer`   | string  | no       | Filter by committer             |
| `since`       | string  | no       | Filter after date               |
| `until`       | string  | no       | Filter before date              |
| `grep`        | string  | no       | Filter by message pattern       |
| `filePath`    | string  | no       | Filter commits affecting file   |
| `dateFormat`  | string  | no       | Date format                     |
| `diffFilter`  | string  | no       | Filter by change type           |
| `noMerges`    | boolean | no       | Exclude merge commits           |
| `skip`        | number  | no       | Skip N commits                  |
| `follow`      | boolean | no       | Follow file renames             |
| `firstParent` | boolean | no       | Follow first parent only        |
| `all`         | boolean | no       | Show all refs                   |
| `pickaxe`     | string  | no       | Search for code changes (-S)    |
| `compact`     | boolean | no       | Prefer compact output           |

### Scenarios

| #   | Scenario                 | Params                                               | Expected Output                               | Priority | Status  |
| --- | ------------------------ | ---------------------------------------------------- | --------------------------------------------- | -------- | ------- |
| 1   | Default log (10 commits) | `{ path }`                                           | `commits` array length <= 10, `total` matches | P0       | pending |
| 2   | Custom maxCount          | `{ path, maxCount: 3 }`                              | `commits` length <= 3                         | P0       | pending |
| 3   | Empty repo or no commits | `{ path }` (empty repo)                              | `commits: []`, `total: 0`                     | P0       | pending |
| 4   | Flag injection in ref    | `{ path, ref: "--exec=evil" }`                       | `assertNoFlagInjection` throws                | P0       | pending |
| 5   | Flag injection in author | `{ path, author: "--exec=evil" }`                    | `assertNoFlagInjection` throws                | P0       | pending |
| 6   | Not a git repo           | `{ path: "/tmp/not-a-repo" }`                        | Error thrown                                  | P0       | pending |
| 7   | Filter by author         | `{ path, author: "dave" }`                           | Only commits by author "dave"                 | P1       | pending |
| 8   | Filter by ref            | `{ path, ref: "main" }`                              | Commits from main branch                      | P1       | pending |
| 9   | Since/until date range   | `{ path, since: "2024-01-01", until: "2024-12-31" }` | Commits within date range                     | P1       | pending |
| 10  | Grep message pattern     | `{ path, grep: "fix:" }`                             | Only commits with "fix:" in message           | P1       | pending |
| 11  | File path filter         | `{ path, filePath: "src/index.ts" }`                 | Only commits affecting that file              | P1       | pending |
| 12  | No merges                | `{ path, noMerges: true }`                           | Merge commits excluded                        | P1       | pending |
| 13  | Skip for pagination      | `{ path, skip: 5, maxCount: 5 }`                     | Commits 6-10                                  | P1       | pending |
| 14  | First parent only        | `{ path, firstParent: true }`                        | Only first-parent commits                     | P2       | pending |
| 15  | All refs                 | `{ path, all: true }`                                | Commits from all branches                     | P2       | pending |
| 16  | Custom date format       | `{ path, dateFormat: "iso" }`                        | Dates in ISO format                           | P2       | pending |
| 17  | Pickaxe search           | `{ path, pickaxe: "function" }`                      | Commits adding/removing "function"            | P2       | pending |
| 18  | Compact vs full output   | `{ path, compact: false }`                           | Full commit data with hash, author, date      | P2       | pending |
| 19  | Schema validation        | all scenarios                                        | Output validates against `GitLogSchema`       | P0       | pending |

**Summary: P0=7, P1=6, P2=6, Total=19**

---

## Tool: `log-graph`

### Implementation: `packages/server-git/src/tools/log-graph.ts`

### Schema: `GitLogGraphSchema`

### Input params

| Param                  | Type    | Required | Notes                          |
| ---------------------- | ------- | -------- | ------------------------------ |
| `path`                 | string  | no       | Repository path                |
| `maxCount`             | number  | no       | Number of commits (default 20) |
| `ref`                  | string  | no       | Branch/tag/commit              |
| `all`                  | boolean | no       | Show all branches              |
| `since`                | string  | no       | Filter by date                 |
| `author`               | string  | no       | Filter by author               |
| `filePath`             | string  | no       | Filter to specific file        |
| `firstParent`          | boolean | no       | First parent only              |
| `noMerges`             | boolean | no       | Exclude merge commits          |
| `simplifyByDecoration` | boolean | no       | Show only decorated commits    |
| `branches`             | boolean | no       | Show all branches              |
| `remotes`              | boolean | no       | Show remote branches           |
| `compact`              | boolean | no       | Prefer compact output          |

### Scenarios

| #   | Scenario               | Params                                 | Expected Output                                             | Priority | Status  |
| --- | ---------------------- | -------------------------------------- | ----------------------------------------------------------- | -------- | ------- |
| 1   | Default graph          | `{ path }`                             | `commits` with `graph`, `hashShort`, `message` fields       | P0       | pending |
| 2   | Empty repo             | `{ path }` (empty)                     | `commits: []`, `total: 0`                                   | P0       | pending |
| 3   | Flag injection in ref  | `{ path, ref: "--exec=evil" }`         | `assertNoFlagInjection` throws                              | P0       | pending |
| 4   | Not a git repo         | `{ path: "/tmp/not-a-repo" }`          | Error thrown                                                | P0       | pending |
| 5   | All branches           | `{ path, all: true }`                  | Graph includes all branches                                 | P1       | pending |
| 6   | Merge commit detection | `{ path }` (with merges)               | `isMerge: true` on merge commits, `parents` with 2+ entries | P1       | pending |
| 7   | Since filter           | `{ path, since: "2024-01-01" }`        | Graph filtered by date                                      | P1       | pending |
| 8   | First parent only      | `{ path, firstParent: true }`          | Simplified linear graph                                     | P2       | pending |
| 9   | Simplify by decoration | `{ path, simplifyByDecoration: true }` | Only decorated commits                                      | P2       | pending |
| 10  | Compact vs full output | `{ path, compact: false }`             | Full entries with `parents`, `parsedRefs`, `isMerge`        | P2       | pending |
| 11  | Schema validation      | all scenarios                          | Output validates against `GitLogGraphSchema`                | P0       | pending |

**Summary: P0=5, P1=3, P2=3, Total=11**

---

## Tool: `merge`

### Implementation: `packages/server-git/src/tools/merge.ts`

### Schema: `GitMergeSchema`

### Input params

| Param                     | Type    | Required | Notes                        |
| ------------------------- | ------- | -------- | ---------------------------- |
| `path`                    | string  | no       | Repository path              |
| `branch`                  | string  | yes      | Branch to merge              |
| `noFf`                    | boolean | no       | Force merge commit (--no-ff) |
| `abort`                   | boolean | no       | Abort in-progress merge      |
| `continue`                | boolean | no       | Continue after conflicts     |
| `quit`                    | boolean | no       | Quit without reverting       |
| `message`                 | string  | no       | Custom merge message         |
| `strategy`                | string  | no       | Merge strategy               |
| `strategyOption`          | string  | no       | Strategy option              |
| `ffOnly`                  | boolean | no       | Fast-forward only            |
| `squash`                  | boolean | no       | Squash merge                 |
| `noCommit`                | boolean | no       | Merge without committing     |
| `allowUnrelatedHistories` | boolean | no       | Allow unrelated histories    |
| `signoff`                 | boolean | no       | Add Signed-off-by            |
| `autostash`               | boolean | no       | Auto stash around merge      |
| `noVerify`                | boolean | no       | Bypass pre-merge hooks       |

### Scenarios

| #   | Scenario                   | Params                                                      | Expected Output                                              | Priority | Status  |
| --- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | -------- | ------- |
| 1   | Fast-forward merge         | `{ path, branch: "feature" }`                               | `merged: true`, `state: "fast-forward"`, `fastForward: true` | P0       | pending |
| 2   | Merge with conflict        | `{ path, branch: "conflicting" }`                           | `merged: false`, `state: "conflict"`, `conflicts` populated  | P0       | pending |
| 3   | Already up to date         | `{ path, branch: "main" }` (on main)                        | `state: "already-up-to-date"`                                | P0       | pending |
| 4   | Flag injection in branch   | `{ path, branch: "--exec=evil" }`                           | `assertNoFlagInjection` throws                               | P0       | pending |
| 5   | Abort merge                | `{ path, branch: "x", abort: true }`                        | Merge aborted                                                | P0       | pending |
| 6   | No-ff merge                | `{ path, branch: "feature", noFf: true }`                   | `merged: true`, merge commit created even if ff possible     | P1       | pending |
| 7   | Squash merge               | `{ path, branch: "feature", squash: true }`                 | Changes applied but not committed                            | P1       | pending |
| 8   | ff-only with non-ff branch | `{ path, branch: "diverged", ffOnly: true }`                | `merged: false`, `state: "failed"`                           | P1       | pending |
| 9   | Custom merge message       | `{ path, branch: "feat", message: "Merge feat" }`           | Commit message matches                                       | P1       | pending |
| 10  | Continue after conflict    | `{ path, branch: "x", continue: true }`                     | Merge continues                                              | P1       | pending |
| 11  | Allow unrelated histories  | `{ path, branch: "orphan", allowUnrelatedHistories: true }` | Merge succeeds                                               | P2       | pending |
| 12  | Strategy option            | `{ path, branch: "feat", strategy: "ort" }`                 | Strategy applied                                             | P2       | pending |
| 13  | No-commit merge            | `{ path, branch: "feat", noCommit: true }`                  | Merged but not committed                                     | P2       | pending |
| 14  | Schema validation          | all scenarios                                               | Output validates against `GitMergeSchema`                    | P0       | pending |

**Summary: P0=6, P1=5, P2=3, Total=14**

---

## Tool: `pull`

### Implementation: `packages/server-git/src/tools/pull.ts`

### Schema: `GitPullSchema`

### Input params

| Param            | Type    | Required | Notes                          |
| ---------------- | ------- | -------- | ------------------------------ |
| `path`           | string  | no       | Repository path                |
| `remote`         | string  | no       | Remote name (default "origin") |
| `branch`         | string  | no       | Branch to pull                 |
| `rebase`         | boolean | no       | Use rebase instead of merge    |
| `rebaseMode`     | enum    | no       | Rebase behavior control        |
| `strategy`       | string  | no       | Merge strategy                 |
| `strategyOption` | string  | no       | Strategy option                |
| `ffOnly`         | boolean | no       | Fast-forward only              |
| `autostash`      | boolean | no       | Auto stash around pull         |
| `noCommit`       | boolean | no       | Pull without committing        |
| `depth`          | number  | no       | Shallow fetch depth            |
| `noVerify`       | boolean | no       | Bypass hooks                   |
| `squash`         | boolean | no       | Squash pull                    |

### Scenarios

| #   | Scenario                    | Params                            | Expected Output                            | Priority | Status  |
| --- | --------------------------- | --------------------------------- | ------------------------------------------ | -------- | ------- |
| 1   | Pull with changes available | `{ path }`                        | `success: true`, `filesChanged >= 1`       | P0       | pending |
| 2   | Already up to date          | `{ path }`                        | `success: true`, `upToDate: true`          | P0       | pending |
| 3   | Pull with conflict          | `{ path }` (conflicting)          | `success: false`, `conflicts` populated    | P0       | pending |
| 4   | Flag injection in remote    | `{ path, remote: "--exec=evil" }` | `assertNoFlagInjection` throws             | P0       | pending |
| 5   | No remote configured        | `{ path }` (no remote)            | Error thrown                               | P0       | pending |
| 6   | Pull with rebase            | `{ path, rebase: true }`          | `success: true`, rebased instead of merged | P1       | pending |
| 7   | Fast-forward only           | `{ path, ffOnly: true }`          | Fails if non-ff                            | P1       | pending |
| 8   | Specific branch             | `{ path, branch: "develop" }`     | Pull from develop branch                   | P1       | pending |
| 9   | Autostash                   | `{ path, autostash: true }`       | Local changes stashed and restored         | P1       | pending |
| 10  | Shallow depth               | `{ path, depth: 1 }`              | Shallow fetch                              | P2       | pending |
| 11  | Squash pull                 | `{ path, squash: true }`          | Changes squashed                           | P2       | pending |
| 12  | Schema validation           | all scenarios                     | Output validates against `GitPullSchema`   | P0       | pending |

**Summary: P0=6, P1=4, P2=2, Total=12**

---

## Tool: `push`

### Implementation: `packages/server-git/src/tools/push.ts`

### Schema: `GitPushSchema`

### Input params

| Param            | Type     | Required | Notes                          |
| ---------------- | -------- | -------- | ------------------------------ |
| `path`           | string   | no       | Repository path                |
| `remote`         | string   | no       | Remote name (default "origin") |
| `branch`         | string   | no       | Branch to push                 |
| `refspec`        | string   | no       | Explicit refspec               |
| `force`          | boolean  | no       | Force push                     |
| `setUpstream`    | boolean  | no       | Set upstream (-u)              |
| `dryRun`         | boolean  | no       | Preview push                   |
| `forceWithLease` | boolean  | no       | Safe force push                |
| `tags`           | boolean  | no       | Push all tags                  |
| `followTags`     | boolean  | no       | Push annotated tags            |
| `delete`         | boolean  | no       | Delete remote branch           |
| `noVerify`       | boolean  | no       | Bypass pre-push hook           |
| `atomic`         | boolean  | no       | Atomic push                    |
| `pushOption`     | string[] | no       | Push options (-o)              |

### Scenarios

| #   | Scenario                         | Params                                            | Expected Output                                   | Priority | Status  |
| --- | -------------------------------- | ------------------------------------------------- | ------------------------------------------------- | -------- | ------- |
| 1   | Push to remote                   | `{ path }`                                        | `success: true`, `remote: "origin"`, `branch` set | P0       | pending |
| 2   | Push rejected (non-fast-forward) | `{ path }` (behind remote)                        | `success: false`, `errorType: "rejected"`         | P0       | pending |
| 3   | Flag injection in remote         | `{ path, remote: "--exec=evil" }`                 | `assertNoFlagInjection` throws                    | P0       | pending |
| 4   | No remote configured             | `{ path }` (no remote)                            | Error or `success: false`                         | P0       | pending |
| 5   | Set upstream on push             | `{ path, setUpstream: true }`                     | `success: true`, upstream tracking set            | P1       | pending |
| 6   | Force push                       | `{ path, force: true }`                           | `success: true`, forced                           | P1       | pending |
| 7   | Force with lease                 | `{ path, forceWithLease: true }`                  | Safe force push                                   | P1       | pending |
| 8   | Push tags                        | `{ path, tags: true }`                            | All tags pushed                                   | P1       | pending |
| 9   | Delete remote branch             | `{ path, branch: "old", delete: true }`           | Remote branch deleted                             | P1       | pending |
| 10  | Dry run                          | `{ path, dryRun: true }`                          | Preview without pushing                           | P2       | pending |
| 11  | Push with refspec                | `{ path, refspec: "HEAD:refs/heads/main" }`       | Explicit refspec used                             | P2       | pending |
| 12  | New branch creation              | `{ path, branch: "new-feat", setUpstream: true }` | `created: true`                                   | P1       | pending |
| 13  | Schema validation                | all scenarios                                     | Output validates against `GitPushSchema`          | P0       | pending |

**Summary: P0=5, P1=6, P2=2, Total=13**

---

## Tool: `rebase`

### Implementation: `packages/server-git/src/tools/rebase.ts`

### Schema: `GitRebaseSchema`

### Input params

| Param            | Type    | Required | Notes                                                    |
| ---------------- | ------- | -------- | -------------------------------------------------------- |
| `path`           | string  | no       | Repository path                                          |
| `branch`         | string  | no       | Target branch (required unless abort/continue/skip/quit) |
| `onto`           | string  | no       | Rebase onto different base                               |
| `abort`          | boolean | no       | Abort in-progress rebase                                 |
| `continue`       | boolean | no       | Continue after conflicts                                 |
| `skip`           | boolean | no       | Skip current commit                                      |
| `quit`           | boolean | no       | Quit without reverting                                   |
| `strategy`       | string  | no       | Merge strategy                                           |
| `strategyOption` | string  | no       | Strategy option                                          |
| `exec`           | string  | no       | Run command after each commit                            |
| `empty`          | enum    | no       | Empty commit handling                                    |
| `autostash`      | boolean | no       | Auto stash around rebase                                 |
| `autosquash`     | boolean | no       | Auto-apply fixup/squash                                  |
| `forceRebase`    | boolean | no       | Force even if up-to-date                                 |
| `rebaseMerges`   | boolean | no       | Preserve merge commits                                   |
| `updateRefs`     | boolean | no       | Update dependent branches                                |
| `signoff`        | boolean | no       | Add Signed-off-by                                        |

### Scenarios

| #   | Scenario                      | Params                                         | Expected Output                                              | Priority | Status  |
| --- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | -------- | ------- |
| 1   | Simple rebase onto branch     | `{ path, branch: "main" }`                     | `success: true`, `state: "completed"`, `rebasedCommits` set  | P0       | pending |
| 2   | Rebase with conflict          | `{ path, branch: "main" }` (conflicting)       | `success: false`, `state: "conflict"`, `conflicts` populated | P0       | pending |
| 3   | Branch not provided throws    | `{ path }`                                     | Error: "branch is required for rebase"                       | P0       | pending |
| 4   | Flag injection in branch      | `{ path, branch: "--exec=evil" }`              | `assertNoFlagInjection` throws                               | P0       | pending |
| 5   | Abort rebase                  | `{ path, abort: true }`                        | Rebase aborted, state restored                               | P0       | pending |
| 6   | Continue after conflict       | `{ path, continue: true }`                     | Rebase continues                                             | P1       | pending |
| 7   | Skip current commit           | `{ path, skip: true }`                         | Commit skipped, rebase advances                              | P1       | pending |
| 8   | Rebase with onto              | `{ path, branch: "main", onto: "develop" }`    | Rebased onto develop                                         | P1       | pending |
| 9   | Autostash                     | `{ path, branch: "main", autostash: true }`    | Local changes preserved                                      | P1       | pending |
| 10  | Verification (verified field) | `{ path, branch: "main" }`                     | `verified: true` on success                                  | P1       | pending |
| 11  | Force rebase (up-to-date)     | `{ path, branch: "main", forceRebase: true }`  | Rebase performed even if unnecessary                         | P2       | pending |
| 12  | Rebase merges                 | `{ path, branch: "main", rebaseMerges: true }` | Merge commits preserved                                      | P2       | pending |
| 13  | Exec command                  | `{ path, branch: "main", exec: "npm test" }`   | Command run after each commit                                | P2       | pending |
| 14  | Schema validation             | all scenarios                                  | Output validates against `GitRebaseSchema`                   | P0       | pending |

**Summary: P0=6, P1=5, P2=3, Total=14**

---

## Tool: `reflog`

### Implementation: `packages/server-git/src/tools/reflog.ts`

### Schema: `GitReflogSchema`

### Input params

| Param        | Type    | Required | Notes                          |
| ------------ | ------- | -------- | ------------------------------ |
| `path`       | string  | no       | Repository path                |
| `action`     | enum    | no       | show (default) or exists       |
| `maxCount`   | number  | no       | Entries to return (default 20) |
| `ref`        | string  | no       | Which ref to show              |
| `grepReflog` | string  | no       | Filter by message pattern      |
| `since`      | string  | no       | Filter after date              |
| `until`      | string  | no       | Filter before date             |
| `skip`       | number  | no       | Skip N entries                 |
| `all`        | boolean | no       | Show all refs                  |
| `reverse`    | boolean | no       | Reverse order                  |
| `compact`    | boolean | no       | Prefer compact output          |

### Scenarios

| #   | Scenario              | Params                            | Expected Output                            | Priority | Status  |
| --- | --------------------- | --------------------------------- | ------------------------------------------ | -------- | ------- |
| 1   | Default reflog (HEAD) | `{ path }`                        | `entries` array, `total`, `totalAvailable` | P0       | pending |
| 2   | Empty reflog          | `{ path }` (new repo, no actions) | `entries: []`, `total: 0`                  | P0       | pending |
| 3   | Flag injection in ref | `{ path, ref: "--exec=evil" }`    | `assertNoFlagInjection` throws             | P0       | pending |
| 4   | Not a git repo        | `{ path: "/tmp/not-a-repo" }`     | Error thrown                               | P0       | pending |
| 5   | Reflog exists check   | `{ path, action: "exists" }`      | `total: 1` (exists) or `total: 0` (not)    | P1       | pending |
| 6   | Custom maxCount       | `{ path, maxCount: 5 }`           | `entries` length <= 5                      | P1       | pending |
| 7   | Specific ref          | `{ path, ref: "main" }`           | Entries for main branch                    | P1       | pending |
| 8   | Grep filter           | `{ path, grepReflog: "commit" }`  | Only entries matching "commit"             | P1       | pending |
| 9   | Since filter          | `{ path, since: "2024-01-01" }`   | Entries after date                         | P2       | pending |
| 10  | Reverse order         | `{ path, reverse: true }`         | Entries in chronological order             | P2       | pending |
| 11  | Skip for pagination   | `{ path, skip: 5 }`               | Entries 6+                                 | P2       | pending |
| 12  | Schema validation     | all scenarios                     | Output validates against `GitReflogSchema` | P0       | pending |

**Summary: P0=5, P1=4, P2=3, Total=12**

---

## Tool: `remote`

### Implementation: `packages/server-git/src/tools/remote.ts`

### Schema: `GitRemoteSchema`

### Input params

| Param     | Type    | Required | Notes                                                   |
| --------- | ------- | -------- | ------------------------------------------------------- |
| `path`    | string  | no       | Repository path                                         |
| `action`  | enum    | no       | list, add, remove, rename, set-url, prune, show, update |
| `name`    | string  | no       | Remote name (required for most actions)                 |
| `url`     | string  | no       | Remote URL (required for add, set-url)                  |
| `oldName` | string  | no       | Old name (for rename)                                   |
| `newName` | string  | no       | New name (for rename)                                   |
| `compact` | boolean | no       | Prefer compact output                                   |

### Scenarios

| #   | Scenario                | Params                                                               | Expected Output                                  | Priority | Status  |
| --- | ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------ | -------- | ------- |
| 1   | List remotes            | `{ path }`                                                           | `remotes` array, `total >= 1`                    | P0       | pending |
| 2   | Add remote              | `{ path, action: "add", name: "upstream", url: "https://..." }`      | `success: true`, `action: "add"`                 | P0       | pending |
| 3   | Remove remote           | `{ path, action: "remove", name: "upstream" }`                       | `success: true`, `action: "remove"`              | P0       | pending |
| 4   | Add without name throws | `{ path, action: "add", url: "https://..." }`                        | Error: "name parameter is required"              | P0       | pending |
| 5   | Flag injection in name  | `{ path, action: "add", name: "--exec=evil", url: "x" }`             | `assertNoFlagInjection` throws                   | P0       | pending |
| 6   | Show remote details     | `{ path, action: "show", name: "origin" }`                           | `showDetails` with fetchUrl, pushUrl, headBranch | P1       | pending |
| 7   | Rename remote           | `{ path, action: "rename", oldName: "origin", newName: "upstream" }` | `success: true`, `action: "rename"`              | P1       | pending |
| 8   | Set-url                 | `{ path, action: "set-url", name: "origin", url: "https://new" }`    | `success: true`, `action: "set-url"`             | P1       | pending |
| 9   | Prune remote            | `{ path, action: "prune", name: "origin" }`                          | `success: true`, `prunedBranches` array          | P1       | pending |
| 10  | Update remote           | `{ path, action: "update" }`                                         | `success: true`, `action: "update"`              | P1       | pending |
| 11  | No remotes configured   | `{ path }` (no remotes)                                              | `remotes: []`, `total: 0`                        | P1       | pending |
| 12  | Rename without oldName  | `{ path, action: "rename", newName: "x" }`                           | Error: "oldName parameter is required"           | P2       | pending |
| 13  | Compact vs full output  | `{ path, compact: false }`                                           | Full remote data with protocol, trackedBranches  | P2       | pending |
| 14  | Schema validation       | all scenarios                                                        | Output validates against `GitRemoteSchema`       | P0       | pending |

**Summary: P0=6, P1=6, P2=2, Total=14**

---

## Tool: `reset`

### Implementation: `packages/server-git/src/tools/reset.ts`

### Schema: `GitResetSchema`

### Input params

| Param               | Type     | Required | Notes                              |
| ------------------- | -------- | -------- | ---------------------------------- |
| `path`              | string   | no       | Repository path                    |
| `files`             | string[] | no       | File paths to unstage              |
| `ref`               | string   | no       | Ref to reset to (default HEAD)     |
| `mode`              | enum     | no       | soft, mixed, hard, merge, keep     |
| `confirm`           | boolean  | no       | Safety confirmation for hard reset |
| `intentToAdd`       | boolean  | no       | Keep paths as intent-to-add        |
| `recurseSubmodules` | boolean  | no       | Recurse into submodules            |

### Scenarios

| #   | Scenario                          | Params                                                 | Expected Output                                               | Priority | Status  |
| --- | --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | -------- | ------- |
| 1   | Unstage files (mixed reset HEAD)  | `{ path, files: ["a.ts"] }`                            | `success: true`, `ref: "HEAD"`, `filesAffected` contains file | P0       | pending |
| 2   | Soft reset                        | `{ path, ref: "HEAD~1", mode: "soft" }`                | `mode: "soft"`, HEAD moved back, changes kept staged          | P0       | pending |
| 3   | Hard reset without confirm throws | `{ path, ref: "HEAD~1", mode: "hard" }`                | Error: "Safety guard..."                                      | P0       | pending |
| 4   | Hard reset with confirm           | `{ path, ref: "HEAD~1", mode: "hard", confirm: true }` | `success: true`, `mode: "hard"`, changes discarded            | P0       | pending |
| 5   | Flag injection in ref             | `{ path, ref: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                | P0       | pending |
| 6   | Invalid ref                       | `{ path, ref: "nonexistent" }`                         | `errorType: "invalid-ref"`                                    | P0       | pending |
| 7   | Mixed reset (default mode)        | `{ path, ref: "HEAD~1" }`                              | Changes unstaged but in working tree                          | P1       | pending |
| 8   | Reset specific files              | `{ path, files: ["a.ts", "b.ts"] }`                    | Only specified files unstaged                                 | P1       | pending |
| 9   | Flag injection in files           | `{ path, files: ["--exec=evil"] }`                     | `assertNoFlagInjection` throws                                | P0       | pending |
| 10  | previousRef and newRef tracking   | `{ path, ref: "HEAD~1", mode: "soft" }`                | `previousRef` and `newRef` populated                          | P1       | pending |
| 11  | Keep mode                         | `{ path, ref: "HEAD~1", mode: "keep" }`                | `mode: "keep"`                                                | P2       | pending |
| 12  | Merge mode                        | `{ path, ref: "HEAD~1", mode: "merge" }`               | `mode: "merge"`                                               | P2       | pending |
| 13  | Schema validation                 | all scenarios                                          | Output validates against `GitResetSchema`                     | P0       | pending |

**Summary: P0=8, P1=3, P2=2, Total=13**

---

## Tool: `restore`

### Implementation: `packages/server-git/src/tools/restore.ts`

### Schema: `GitRestoreSchema`

### Input params

| Param               | Type     | Required | Notes                           |
| ------------------- | -------- | -------- | ------------------------------- |
| `path`              | string   | no       | Repository path                 |
| `files`             | string[] | yes      | File paths to restore           |
| `staged`            | boolean  | no       | Restore staged changes          |
| `source`            | string   | no       | Restore from specific ref       |
| `ours`              | boolean  | no       | Restore ours during conflicts   |
| `theirs`            | boolean  | no       | Restore theirs during conflicts |
| `worktree`          | boolean  | no       | Restore working tree files      |
| `merge`             | boolean  | no       | Recreate conflicted merge       |
| `ignoreUnmerged`    | boolean  | no       | Ignore unmerged entries         |
| `noOverlay`         | boolean  | no       | Remove extra files              |
| `conflict`          | string   | no       | Set conflict style              |
| `recurseSubmodules` | boolean  | no       | Recurse into submodules         |

### Scenarios

| #   | Scenario                       | Params                                             | Expected Output                                             | Priority | Status  |
| --- | ------------------------------ | -------------------------------------------------- | ----------------------------------------------------------- | -------- | ------- |
| 1   | Restore working tree file      | `{ path, files: ["modified.ts"] }`                 | `restored` contains file, `staged: false`, `source: "HEAD"` | P0       | pending |
| 2   | Restore staged file            | `{ path, files: ["staged.ts"], staged: true }`     | `staged: true`, file unstaged                               | P0       | pending |
| 3   | No files provided throws       | `{ path, files: [] }`                              | Error: "'files' must be provided"                           | P0       | pending |
| 4   | Flag injection in files        | `{ path, files: ["--exec=evil"] }`                 | `assertNoFlagInjection` throws                              | P0       | pending |
| 5   | Nonexistent file               | `{ path, files: ["nonexistent.ts"] }`              | `errorType: "pathspec"`                                     | P0       | pending |
| 6   | Restore from specific source   | `{ path, files: ["a.ts"], source: "HEAD~3" }`      | `source: "HEAD~3"`, file restored from that ref             | P1       | pending |
| 7   | Flag injection in source       | `{ path, files: ["a.ts"], source: "--exec=evil" }` | `assertNoFlagInjection` throws                              | P0       | pending |
| 8   | Verification of restoration    | `{ path, files: ["a.ts"] }`                        | `verified: true`, `verifiedFiles` populated                 | P1       | pending |
| 9   | Restore ours during conflict   | `{ path, files: ["conflict.ts"], ours: true }`     | Ours version restored                                       | P2       | pending |
| 10  | Restore theirs during conflict | `{ path, files: ["conflict.ts"], theirs: true }`   | Theirs version restored                                     | P2       | pending |
| 11  | Schema validation              | all scenarios                                      | Output validates against `GitRestoreSchema`                 | P0       | pending |

**Summary: P0=7, P1=2, P2=2, Total=11**

---

## Tool: `show`

### Implementation: `packages/server-git/src/tools/show.ts`

### Schema: `GitShowSchema`

### Input params

| Param              | Type    | Required | Notes                         |
| ------------------ | ------- | -------- | ----------------------------- |
| `path`             | string  | no       | Repository path               |
| `ref`              | string  | no       | Commit/tag/ref (default HEAD) |
| `dateFormat`       | string  | no       | Date format                   |
| `diffFilter`       | string  | no       | Filter diff by change type    |
| `patch`            | boolean | no       | Include patch content         |
| `ignoreWhitespace` | boolean | no       | Ignore whitespace             |
| `nameStatus`       | boolean | no       | Show name with status         |
| `showSignature`    | boolean | no       | GPG signature verification    |
| `notes`            | boolean | no       | Include git notes             |
| `compact`          | boolean | no       | Prefer compact output         |

### Scenarios

| #   | Scenario               | Params                            | Expected Output                                        | Priority | Status  |
| --- | ---------------------- | --------------------------------- | ------------------------------------------------------ | -------- | ------- |
| 1   | Show HEAD commit       | `{ path }`                        | `hash`, `author`, `date`, `message`, `diff` with files | P0       | pending |
| 2   | Show specific commit   | `{ path, ref: "abc123" }`         | Commit details for specified ref                       | P0       | pending |
| 3   | Invalid ref            | `{ path, ref: "nonexistent" }`    | Error thrown                                           | P0       | pending |
| 4   | Flag injection in ref  | `{ path, ref: "--exec=evil" }`    | `assertNoFlagInjection` throws                         | P0       | pending |
| 5   | Show tag object        | `{ path, ref: "v1.0" }`           | `objectType: "tag"`, tag metadata                      | P1       | pending |
| 6   | Show tree object       | `{ path, ref: "HEAD^{tree}" }`    | `objectType: "tree"`, tree content                     | P1       | pending |
| 7   | Show blob object       | `{ path, ref: "HEAD:README.md" }` | `objectType: "blob"`, file content                     | P1       | pending |
| 8   | Include patch          | `{ path, patch: true }`           | Diff includes full patch content                       | P1       | pending |
| 9   | Custom date format     | `{ path, dateFormat: "iso" }`     | Dates in ISO format                                    | P1       | pending |
| 10  | Diff filter            | `{ path, diffFilter: "M" }`       | Only modified files in diff                            | P2       | pending |
| 11  | Compact vs full output | `{ path, compact: false }`        | Full show data                                         | P2       | pending |
| 12  | Schema validation      | all scenarios                     | Output validates against `GitShowSchema`               | P0       | pending |

**Summary: P0=5, P1=5, P2=2, Total=12**

---

## Tool: `stash`

### Implementation: `packages/server-git/src/tools/stash.ts`

### Schema: `GitStashSchema`

### Input params

| Param              | Type     | Required | Notes                                       |
| ------------------ | -------- | -------- | ------------------------------------------- |
| `path`             | string   | no       | Repository path                             |
| `action`           | enum     | yes      | push, pop, apply, drop, clear, show, branch |
| `message`          | string   | no       | Stash message (push only)                   |
| `index`            | number   | no       | Stash index for pop/apply/drop/show         |
| `includeUntracked` | boolean  | no       | Stash untracked files (-u)                  |
| `staged`           | boolean  | no       | Stash only staged changes                   |
| `keepIndex`        | boolean  | no       | Keep staged in index                        |
| `pathspec`         | string[] | no       | Stash specific files                        |
| `all`              | boolean  | no       | Include ignored files                       |
| `reinstateIndex`   | boolean  | no       | Reinstate staged on apply                   |
| `patch`            | boolean  | no       | Include patch in show output                |
| `branchName`       | string   | no       | Branch name for branch action               |

### Scenarios

| #   | Scenario                  | Params                                                   | Expected Output                                   | Priority | Status  |
| --- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------- | -------- | ------- |
| 1   | Push (stash changes)      | `{ path, action: "push" }`                               | `action: "push"`, `success: true`, `stashRef` set | P0       | pending |
| 2   | Pop stash                 | `{ path, action: "pop" }`                                | `action: "pop"`, `success: true`                  | P0       | pending |
| 3   | Push with no changes      | `{ path, action: "push" }` (clean)                       | `success: false`, no changes to stash             | P0       | pending |
| 4   | Flag injection in message | `{ path, action: "push", message: "--exec=evil" }`       | `assertNoFlagInjection` throws                    | P0       | pending |
| 5   | Apply stash               | `{ path, action: "apply" }`                              | `action: "apply"`, `success: true`                | P0       | pending |
| 6   | Drop stash                | `{ path, action: "drop", index: 0 }`                     | `action: "drop"`, `success: true`                 | P1       | pending |
| 7   | Clear all stashes         | `{ path, action: "clear" }`                              | `action: "clear"`, `success: true`                | P1       | pending |
| 8   | Show stash                | `{ path, action: "show", index: 0 }`                     | `action: "show"`, `diffStat` populated            | P1       | pending |
| 9   | Push with message         | `{ path, action: "push", message: "WIP: feature" }`      | Stash created with message                        | P1       | pending |
| 10  | Push include untracked    | `{ path, action: "push", includeUntracked: true }`       | Untracked files stashed                           | P1       | pending |
| 11  | Push staged only          | `{ path, action: "push", staged: true }`                 | Only staged changes stashed                       | P1       | pending |
| 12  | Stash branch              | `{ path, action: "branch", branchName: "stash-branch" }` | `branchName: "stash-branch"`, branch created      | P2       | pending |
| 13  | Pop with conflict         | `{ path, action: "pop" }` (conflicting)                  | `success: false`, `conflictFiles` populated       | P2       | pending |
| 14  | Show with patch           | `{ path, action: "show", patch: true }`                  | `patch` content included                          | P2       | pending |
| 15  | Schema validation         | all scenarios                                            | Output validates against `GitStashSchema`         | P0       | pending |

**Summary: P0=6, P1=6, P2=3, Total=15**

---

## Tool: `stash-list`

### Implementation: `packages/server-git/src/tools/stash-list.ts`

### Schema: `GitStashListSchema`

### Input params

| Param            | Type    | Required | Notes                        |
| ---------------- | ------- | -------- | ---------------------------- |
| `path`           | string  | no       | Repository path              |
| `maxCount`       | number  | no       | Limit entries                |
| `grep`           | string  | no       | Filter by message            |
| `since`          | string  | no       | Filter by date               |
| `dateFormat`     | string  | no       | Date format                  |
| `stat`           | boolean | no       | Include diffstat             |
| `includeSummary` | boolean | no       | Include file count per stash |
| `compact`        | boolean | no       | Prefer compact output        |

### Scenarios

| #   | Scenario                    | Params                           | Expected Output                               | Priority | Status  |
| --- | --------------------------- | -------------------------------- | --------------------------------------------- | -------- | ------- |
| 1   | List stashes (with stashes) | `{ path }`                       | `stashes` array, `total >= 1`                 | P0       | pending |
| 2   | List stashes (empty)        | `{ path }` (no stashes)          | `stashes: []`, `total: 0`                     | P0       | pending |
| 3   | Not a git repo              | `{ path: "/tmp/not-a-repo" }`    | Error thrown                                  | P0       | pending |
| 4   | Flag injection in grep      | `{ path, grep: "--exec=evil" }`  | `assertNoFlagInjection` throws                | P0       | pending |
| 5   | With maxCount               | `{ path, maxCount: 3 }`          | `stashes` length <= 3                         | P1       | pending |
| 6   | Grep filter                 | `{ path, grep: "WIP" }`          | Only stashes with "WIP" in message            | P1       | pending |
| 7   | Include summary             | `{ path, includeSummary: true }` | `files` and `summary` populated per stash     | P1       | pending |
| 8   | Since filter                | `{ path, since: "2024-01-01" }`  | Only stashes after date                       | P2       | pending |
| 9   | Custom date format          | `{ path, dateFormat: "short" }`  | Dates in short format                         | P2       | pending |
| 10  | Compact vs full output      | `{ path, compact: false }`       | Full stash data                               | P2       | pending |
| 11  | Schema validation           | all scenarios                    | Output validates against `GitStashListSchema` | P0       | pending |

**Summary: P0=5, P1=3, P2=3, Total=11**

---

## Tool: `tag`

### Implementation: `packages/server-git/src/tools/tag.ts`

### Schema: `GitTagSchema`

### Input params

| Param      | Type    | Required | Notes                                 |
| ---------- | ------- | -------- | ------------------------------------- |
| `path`     | string  | no       | Repository path                       |
| `action`   | enum    | no       | list, create, delete (default list)   |
| `name`     | string  | no       | Tag name (required for create/delete) |
| `message`  | string  | no       | Message for annotated tags            |
| `commit`   | string  | no       | Commit to tag                         |
| `pattern`  | string  | no       | Filter pattern                        |
| `contains` | string  | no       | Filter by containing commit           |
| `pointsAt` | string  | no       | Filter by pointing at commit          |
| `sortBy`   | string  | no       | Sort tag list                         |
| `force`    | boolean | no       | Force tag creation                    |
| `sign`     | boolean | no       | Sign with GPG                         |
| `verify`   | boolean | no       | Verify signature                      |
| `merged`   | boolean | no       | Filter merged tags                    |
| `noMerged` | boolean | no       | Filter unmerged tags                  |
| `compact`  | boolean | no       | Prefer compact output                 |

### Scenarios

| #   | Scenario                   | Params                                                         | Expected Output                                         | Priority | Status  |
| --- | -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | -------- | ------- |
| 1   | List tags                  | `{ path }`                                                     | `tags` array, `total` count                             | P0       | pending |
| 2   | Create lightweight tag     | `{ path, action: "create", name: "v1.0" }`                     | `success: true`, `action: "create"`, `annotated: false` | P0       | pending |
| 3   | Create annotated tag       | `{ path, action: "create", name: "v1.0", message: "Release" }` | `success: true`, `annotated: true`                      | P0       | pending |
| 4   | Delete tag                 | `{ path, action: "delete", name: "v1.0" }`                     | `success: true`, `action: "delete"`                     | P0       | pending |
| 5   | Create without name throws | `{ path, action: "create" }`                                   | Error: "name parameter is required"                     | P0       | pending |
| 6   | Flag injection in name     | `{ path, action: "create", name: "--exec=evil" }`              | `assertNoFlagInjection` throws                          | P0       | pending |
| 7   | No tags in repo            | `{ path }` (no tags)                                           | `tags: []`, `total: 0`                                  | P0       | pending |
| 8   | Tag at specific commit     | `{ path, action: "create", name: "v1.0", commit: "abc123" }`   | `commit: "abc123"`                                      | P1       | pending |
| 9   | Pattern filter             | `{ path, pattern: "v1.*" }`                                    | Only matching tags                                      | P1       | pending |
| 10  | Contains filter            | `{ path, contains: "abc123" }`                                 | Only tags containing commit                             | P1       | pending |
| 11  | Sort by date               | `{ path, sortBy: "-creatordate" }`                             | Tags sorted by creation date                            | P1       | pending |
| 12  | Force overwrite tag        | `{ path, action: "create", name: "v1.0", force: true }`        | Existing tag overwritten                                | P2       | pending |
| 13  | Compact vs full output     | `{ path, compact: false }`                                     | Full tag data with date, message, tagType               | P2       | pending |
| 14  | Schema validation          | all scenarios                                                  | Output validates against `GitTagSchema`                 | P0       | pending |

**Summary: P0=8, P1=4, P2=2, Total=14**

---

## Tool: `worktree`

### Implementation: `packages/server-git/src/tools/worktree.ts`

### Schema: `GitWorktreeOutputSchema`

### Input params

| Param          | Type     | Required | Notes                                                   |
| -------------- | -------- | -------- | ------------------------------------------------------- |
| `path`         | string   | no       | Repository path                                         |
| `action`       | enum     | no       | list, add, remove, lock, unlock, prune, move, repair    |
| `worktreePath` | string   | no       | Path for worktree (required for add/remove/lock/unlock) |
| `branch`       | string   | no       | Branch to checkout in worktree                          |
| `createBranch` | boolean  | no       | Create new branch on add                                |
| `base`         | string   | no       | Base ref for new branch                                 |
| `force`        | boolean  | no       | Force removal                                           |
| `forceAdd`     | boolean  | no       | Allow checked-out branch on add                         |
| `detach`       | boolean  | no       | Detach HEAD on add                                      |
| `noCheckout`   | boolean  | no       | Skip checkout on add                                    |
| `forceBranch`  | boolean  | no       | Create/reset branch on add (-B)                         |
| `guessRemote`  | boolean  | no       | Auto-detect remote tracking                             |
| `listVerbose`  | boolean  | no       | Verbose list output                                     |
| `reason`       | string   | no       | Reason for locking                                      |
| `newPath`      | string   | no       | Target for move                                         |
| `repairPaths`  | string[] | no       | Paths to repair                                         |
| `compact`      | boolean  | no       | Prefer compact output                                   |

### Scenarios

| #   | Scenario                       | Params                                                                               | Expected Output                                     | Priority | Status  |
| --- | ------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------- | -------- | ------- |
| 1   | List worktrees                 | `{ path }`                                                                           | `worktrees` array, `total >= 1` (main worktree)     | P0       | pending |
| 2   | Add worktree                   | `{ path, action: "add", worktreePath: "../wt-test", branch: "main" }`                | `success: true`, `action: "add"`, `path` set        | P0       | pending |
| 3   | Remove worktree                | `{ path, action: "remove", worktreePath: "../wt-test" }`                             | `success: true`, `action: "remove"`                 | P0       | pending |
| 4   | Add without path throws        | `{ path, action: "add" }`                                                            | Error: "'worktreePath' is required"                 | P0       | pending |
| 5   | Flag injection in worktreePath | `{ path, action: "add", worktreePath: "--exec=evil" }`                               | `assertNoFlagInjection` throws                      | P0       | pending |
| 6   | Add with new branch            | `{ path, action: "add", worktreePath: "../wt", branch: "feat", createBranch: true }` | Branch created, worktree added                      | P1       | pending |
| 7   | Lock worktree                  | `{ path, action: "lock", worktreePath: "../wt" }`                                    | `success: true`, `action: "lock"`                   | P1       | pending |
| 8   | Unlock worktree                | `{ path, action: "unlock", worktreePath: "../wt" }`                                  | `success: true`, `action: "unlock"`                 | P1       | pending |
| 9   | Prune worktrees                | `{ path, action: "prune" }`                                                          | `success: true`, `action: "prune"`                  | P1       | pending |
| 10  | Move worktree                  | `{ path, action: "move", worktreePath: "../wt", newPath: "../wt2" }`                 | `success: true`, `action: "move"`, `targetPath` set | P1       | pending |
| 11  | Force remove dirty worktree    | `{ path, action: "remove", worktreePath: "../wt", force: true }`                     | `success: true`, dirty worktree removed             | P1       | pending |
| 12  | Repair worktrees               | `{ path, action: "repair" }`                                                         | `success: true`, `action: "repair"`                 | P2       | pending |
| 13  | Lock with reason               | `{ path, action: "lock", worktreePath: "../wt", reason: "in use" }`                  | Reason recorded                                     | P2       | pending |
| 14  | Verbose list                   | `{ path, listVerbose: true }`                                                        | Locked/prunable details included                    | P2       | pending |
| 15  | Compact vs full output         | `{ path, compact: false }`                                                           | Full worktree data                                  | P2       | pending |
| 16  | Schema validation              | all scenarios                                                                        | Output validates against `GitWorktreeOutputSchema`  | P0       | pending |

**Summary: P0=6, P1=6, P2=4, Total=16**

---

## Grand Summary

| Tool        | P0      | P1      | P2     | Total   |
| ----------- | ------- | ------- | ------ | ------- |
| add         | 6       | 5       | 4      | 15      |
| bisect      | 7       | 4       | 3      | 14      |
| blame       | 5       | 3       | 3      | 11      |
| branch      | 6       | 5       | 5      | 16      |
| checkout    | 5       | 5       | 2      | 12      |
| cherry-pick | 6       | 4       | 2      | 12      |
| commit      | 6       | 4       | 3      | 13      |
| diff        | 7       | 7       | 6      | 20      |
| log         | 7       | 6       | 6      | 19      |
| log-graph   | 5       | 3       | 3      | 11      |
| merge       | 6       | 5       | 3      | 14      |
| pull        | 6       | 4       | 2      | 12      |
| push        | 5       | 6       | 2      | 13      |
| rebase      | 6       | 5       | 3      | 14      |
| reflog      | 5       | 4       | 3      | 12      |
| remote      | 6       | 6       | 2      | 14      |
| reset       | 8       | 3       | 2      | 13      |
| restore     | 7       | 2       | 2      | 11      |
| show        | 5       | 5       | 2      | 12      |
| stash       | 6       | 6       | 3      | 15      |
| stash-list  | 5       | 3       | 3      | 11      |
| tag         | 8       | 4       | 2      | 14      |
| worktree    | 6       | 6       | 4      | 16      |
| **Total**   | **137** | **103** | **70** | **310** |
