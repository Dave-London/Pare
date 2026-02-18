# Smoke Test Scenarios: All GitHub Tools (excluding pr-checks)

This file contains scenario mappings for all 23 remaining GitHub tools.
Reference: `tests/smoke/scenarios/github-pr-checks.md` for format precedent.

---

## Table of Contents

1. [api](#1-api)
2. [gist-create](#2-gist-create)
3. [issue-close](#3-issue-close)
4. [issue-comment](#4-issue-comment)
5. [issue-create](#5-issue-create)
6. [issue-list](#6-issue-list)
7. [issue-update](#7-issue-update)
8. [issue-view](#8-issue-view)
9. [pr-comment](#9-pr-comment)
10. [pr-create](#10-pr-create)
11. [pr-diff](#11-pr-diff)
12. [pr-list](#12-pr-list)
13. [pr-merge](#13-pr-merge)
14. [pr-review](#14-pr-review)
15. [pr-update](#15-pr-update)
16. [pr-view](#16-pr-view)
17. [release-create](#17-release-create)
18. [release-list](#18-release-list)
19. [run-list](#19-run-list)
20. [run-rerun](#20-run-rerun)
21. [run-view](#21-run-view)
22. [label-list](#22-label-list)
23. [label-create](#23-label-create)

---

## 1. api

### Tool: `@paretools/github` -> `api`

### Implementation: `packages/server-github/src/tools/api.ts`

### Schema: `ApiResultSchema`

### Input params

| Param         | Type                            | Required | Notes                                     |
| ------------- | ------------------------------- | -------- | ----------------------------------------- |
| `endpoint`    | string                          | yes      | GitHub API endpoint path                  |
| `method`      | enum: GET/POST/PATCH/DELETE/PUT | no       | Default: GET                              |
| `body`        | Record<string, unknown>         | no       | JSON request body (sent via stdin)        |
| `fields`      | Record<string, string>          | no       | Key-value pairs as --raw-field            |
| `typedFields` | Record<string, string>          | no       | Key-value pairs as --field (typed)        |
| `paginate`    | boolean                         | no       | Enable pagination                         |
| `jq`          | string                          | no       | jq filter expression                      |
| `slurp`       | boolean                         | no       | Combine paginated pages into single array |
| `include`     | boolean                         | no       | Include response headers                  |
| `silent`      | boolean                         | no       | Suppress response body                    |
| `verbose`     | boolean                         | no       | Full HTTP debug output                    |
| `headers`     | Record<string, string>          | no       | Custom HTTP headers                       |
| `hostname`    | string                          | no       | GitHub Enterprise hostname                |
| `cache`       | string                          | no       | Cache TTL (e.g. '5m')                     |
| `preview`     | string                          | no       | API preview feature name                  |
| `inputFile`   | string                          | no       | Read body from file                       |
| `query`       | string                          | no       | GraphQL query string                      |
| `variables`   | Record<string, unknown>         | no       | GraphQL variables                         |
| `path`        | string                          | no       | Repository path                           |

### Scenarios

| #   | Scenario                       | Params                                                                                       | Expected Output                                                          | Priority | Status |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- | ------ |
| 1   | GET endpoint happy path        | `{ endpoint: "repos/owner/repo" }`                                                           | `status: 200`, `statusCode: 200`, `body` is parsed JSON, `method: "GET"` | P0       | mocked |
| 2   | POST with body                 | `{ endpoint: "repos/owner/repo/issues", method: "POST", body: { title: "Test" } }`           | `status: 200`, `method: "POST"`, body sent via stdin                     | P0       | mocked |
| 3   | Non-existent endpoint (404)    | `{ endpoint: "repos/nonexistent/repo" }`                                                     | Error result with appropriate statusCode, `errorBody` populated          | P0       | mocked |
| 4   | Flag injection on endpoint     | `{ endpoint: "--exec=evil" }`                                                                | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 5   | Flag injection on jq           | `{ endpoint: "repos/o/r", jq: "--exec=evil" }`                                               | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 6   | Flag injection on hostname     | `{ endpoint: "repos/o/r", hostname: "--exec=evil" }`                                         | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 7   | Flag injection on cache        | `{ endpoint: "repos/o/r", cache: "--exec=evil" }`                                            | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 8   | Flag injection on preview      | `{ endpoint: "repos/o/r", preview: "--exec=evil" }`                                          | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 9   | Flag injection on inputFile    | `{ endpoint: "repos/o/r", inputFile: "--exec=evil" }`                                        | `assertNoFlagInjection` throws                                           | P0       | mocked |
| 10  | Empty response body            | `{ endpoint: "repos/o/r", method: "DELETE" }`                                                | Graceful handling, body is null/empty                                    | P0       | mocked |
| 11  | GraphQL query                  | `{ query: "{ viewer { login } }" }`                                                          | `method: "POST"`, `endpoint: "graphql"`, body contains data              | P1       | mocked |
| 12  | GraphQL with variables         | `{ query: "query($owner:String!){...}", variables: { owner: "test" } }`                      | Variables passed as -f flags                                             | P1       | mocked |
| 13  | Pagination with slurp          | `{ endpoint: "repos/o/r/issues", paginate: true, slurp: true }`                              | Combined array result                                                    | P1       | mocked |
| 14  | jq filter                      | `{ endpoint: "repos/o/r", jq: ".name" }`                                                     | Filtered response body                                                   | P1       | mocked |
| 15  | Custom headers                 | `{ endpoint: "repos/o/r", headers: { "Accept": "application/vnd.github.raw" } }`             | Headers passed as -H flags                                               | P1       | mocked |
| 16  | Fields (raw-field)             | `{ endpoint: "repos/o/r/labels", method: "POST", fields: { name: "bug", color: "ff0000" } }` | Fields sent as --raw-field pairs                                         | P1       | mocked |
| 17  | Typed fields                   | `{ endpoint: "repos/o/r", typedFields: { per_page: "100" } }`                                | Fields sent as --field pairs                                             | P1       | mocked |
| 18  | PATCH method                   | `{ endpoint: "repos/o/r", method: "PATCH", body: { description: "updated" } }`               | `method: "PATCH"`, body sent                                             | P1       | mocked |
| 19  | Response headers parsing       | `{ endpoint: "repos/o/r", include: true }`                                                   | `responseHeaders` populated, `statusCode` parsed                         | P1       | mocked |
| 20  | GraphQL errors in 200 response | `{ query: "{ invalid }" }`                                                                   | `graphqlErrors` array populated                                          | P1       | mocked |
| 21  | Pagination metadata            | `{ endpoint: "repos/o/r/issues", paginate: false }`                                          | `pagination.hasNext` field present                                       | P1       | mocked |
| 22  | Silent mode                    | `{ endpoint: "repos/o/r", silent: true }`                                                    | No body in response                                                      | P2       | mocked |
| 23  | Verbose mode                   | `{ endpoint: "repos/o/r", verbose: true }`                                                   | Debug output included                                                    | P2       | mocked |
| 24  | Cache TTL                      | `{ endpoint: "repos/o/r", cache: "5m" }`                                                     | Cache flag passed to CLI                                                 | P2       | mocked |
| 25  | Body from inputFile            | `{ endpoint: "repos/o/r", inputFile: "/tmp/body.json" }`                                     | --input flag used                                                        | P2       | mocked |
| 26  | Hostname for GHE               | `{ endpoint: "repos/o/r", hostname: "github.example.com" }`                                  | --hostname flag passed                                                   | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 10     |
| P1        | 11     |
| P2        | 5      |
| **Total** | **26** |

---

## 2. gist-create

### Tool: `@paretools/github` -> `gist-create`

### Implementation: `packages/server-github/src/tools/gist-create.ts`

### Schema: `GistCreateResultSchema`

### Input params

| Param         | Type                   | Required | Notes                                                    |
| ------------- | ---------------------- | -------- | -------------------------------------------------------- |
| `files`       | string[]               | no       | File paths to include (either files or content required) |
| `content`     | Record<string, string> | no       | Inline content as filename-to-content map                |
| `description` | string                 | no       | Gist description                                         |
| `public`      | boolean                | no       | Default: false (secret)                                  |
| `path`        | string                 | no       | Working directory                                        |

### Scenarios

| #   | Scenario                              | Params                                             | Expected Output                                            | Priority | Status |
| --- | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | -------- | ------ |
| 1   | Single file happy path                | `{ files: ["test.py"] }`                           | `id` populated, `url` is valid gist URL, `public: false`   | P0       | mocked |
| 2   | Inline content happy path             | `{ content: { "script.py": "print(1)" } }`         | `id` populated, temp files created and cleaned up          | P0       | mocked |
| 3   | Neither files nor content provided    | `{ }`                                              | Error: "Either files or content must be provided"          | P0       | mocked |
| 4   | Flag injection on description         | `{ files: ["f.txt"], description: "--exec=evil" }` | `assertNoFlagInjection` throws                             | P0       | mocked |
| 5   | Flag injection on files entry         | `{ files: ["--exec=evil"] }`                       | `assertNoFlagInjection` throws                             | P0       | mocked |
| 6   | Flag injection on content filename    | `{ content: { "--exec=evil": "data" } }`           | `assertNoFlagInjection` throws                             | P0       | mocked |
| 7   | Error: permission denied              | `{ files: ["f.txt"] }`                             | `errorType: "permission-denied"`, `errorMessage` populated | P0       | mocked |
| 8   | Public gist                           | `{ files: ["f.txt"], public: true }`               | `public: true`, --public flag passed                       | P1       | mocked |
| 9   | Multi-file gist                       | `{ files: ["a.py", "b.py", "c.py"] }`              | `fileCount: 3`, `files` array echoed                       | P1       | mocked |
| 10  | Multi-file inline content             | `{ content: { "a.py": "x", "b.py": "y" } }`        | Temp files created for each, cleanup succeeds              | P1       | mocked |
| 11  | Description echo in output            | `{ files: ["f.txt"], description: "My gist" }`     | `description: "My gist"` in output                         | P1       | mocked |
| 12  | Rate limit error                      | `{ files: ["f.txt"] }`                             | `errorType: "rate-limit"`                                  | P1       | mocked |
| 13  | File path validation (path traversal) | `{ files: ["../../etc/passwd"] }`                  | `assertSafeFilePath` throws                                | P0       | mocked |
| 14  | Temp file cleanup on error            | `{ content: { "f.py": "data" } }`                  | Temp directory cleaned up even on failure                  | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 5      |
| P2        | 1      |
| **Total** | **13** |

---

## 3. issue-close

### Tool: `@paretools/github` -> `issue-close`

### Implementation: `packages/server-github/src/tools/issue-close.ts`

### Schema: `IssueCloseResultSchema`

### Input params

| Param     | Type                            | Required | Notes               |
| --------- | ------------------------------- | -------- | ------------------- |
| `number`  | string                          | yes      | Issue number or URL |
| `comment` | string                          | no       | Closing comment     |
| `reason`  | enum: "completed"/"not planned" | no       | Close reason        |
| `repo`    | string                          | no       | OWNER/REPO format   |
| `path`    | string                          | no       | Repository path     |

### Scenarios

| #   | Scenario                                 | Params                                                  | Expected Output                                      | Priority                                           | Status |
| --- | ---------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------ | ------ |
| 1   | Close issue happy path                   | `{ number: "42" }`                                      | `state: "closed"`, `url` populated, `number` correct | P0                                                 | mocked |
| 2   | Close with comment                       | `{ number: "42", comment: "Fixed in PR #50" }`          | `commentUrl` populated                               | P0                                                 | mocked |
| 3   | Close with reason "not planned"          | `{ number: "42", reason: "not planned" }`               | `reason: "not planned"`                              | P0                                                 | mocked |
| 4   | Issue not found                          | `{ number: "999999" }`                                  | `errorType: "not-found"`, `errorMessage` populated   | P0                                                 | mocked |
| 5   | Already closed issue                     | `{ number: "42" }`                                      | `errorType: "already-closed"`, `alreadyClosed: true` | P0                                                 | mocked |
| 6   | Flag injection on number                 | `{ number: "--exec=evil" }`                             | `assertNoFlagInjection` throws                       | P0                                                 | mocked |
| 7   | Flag injection on comment                | `{ number: "42", comment: "--exec=evil" }`              | `assertNoFlagInjection` throws                       | P0                                                 | mocked |
| 8   | Flag injection on repo                   | `{ number: "42", repo: "--exec=evil" }`                 | `assertNoFlagInjection` throws                       | P0                                                 | mocked |
| 9   | Shell escaping in comment (#530 pattern) | `{ number: "42", comment: "Fixed: use `foo              | bar` (see docs)" }`                                  | Comment delivered intact, no shell escaping issues | P0     | mocked |
| 10  | Cross-repo close                         | `{ number: "42", repo: "owner/other-repo" }`            | --repo flag passed, closes in other repo             | P1                                                 | mocked |
| 11  | Close with reason "completed"            | `{ number: "42", reason: "completed" }`                 | `reason: "completed"`                                | P1                                                 | mocked |
| 12  | Permission denied                        | `{ number: "42" }`                                      | `errorType: "permission-denied"`                     | P1                                                 | mocked |
| 13  | Issue number as URL                      | `{ number: "https://github.com/owner/repo/issues/42" }` | Passes URL to gh CLI correctly                       | P2                                                 | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 3      |
| P2        | 1      |
| **Total** | **13** |

---

## 4. issue-comment

### Tool: `@paretools/github` -> `issue-comment`

### Implementation: `packages/server-github/src/tools/issue-comment.ts`

### Schema: `CommentResultSchema`

### Input params

| Param          | Type    | Required | Notes                                         |
| -------------- | ------- | -------- | --------------------------------------------- |
| `number`       | string  | yes      | Issue number or URL                           |
| `body`         | string  | yes      | Comment text                                  |
| `editLast`     | boolean | no       | Edit last comment                             |
| `deleteLast`   | boolean | no       | Delete last comment                           |
| `createIfNone` | boolean | no       | Create if no existing comment (with editLast) |
| `repo`         | string  | no       | OWNER/REPO format                             |
| `path`         | string  | no       | Repository path                               |

### Scenarios

| #   | Scenario                              | Params                                                              | Expected Output                                       | Priority                                    | Status |
| --- | ------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Create comment happy path             | `{ number: "42", body: "Looks good!" }`                             | `operation: "create"`, `url` populated, `body` echoed | P0                                          | mocked |
| 2   | Issue not found                       | `{ number: "999999", body: "test" }`                                | `errorType: "not-found"`                              | P0                                          | mocked |
| 3   | Flag injection on body                | `{ number: "42", body: "--exec=evil" }`                             | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 4   | Flag injection on number              | `{ number: "--exec=evil", body: "test" }`                           | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 5   | Flag injection on repo                | `{ number: "42", body: "test", repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 6   | Shell escaping in body (#530 pattern) | `{ number: "42", body: "Use `cmd                                    | grep` and $(var)" }`                                  | Body delivered intact via --body-file stdin | P0     | mocked |
| 7   | Body with markdown special chars      | `{ number: "42", body: "## Header\n- item\n```code```" }`           | Body preserved with markdown formatting               | P0                                          | mocked |
| 8   | Edit last comment                     | `{ number: "42", body: "Updated", editLast: true }`                 | `operation: "edit"`                                   | P1                                          | mocked |
| 9   | Delete last comment                   | `{ number: "42", body: "", deleteLast: true }`                      | `operation: "delete"`                                 | P1                                          | mocked |
| 10  | Edit with createIfNone                | `{ number: "42", body: "New", editLast: true, createIfNone: true }` | --create-if-none flag passed                          | P1                                          | mocked |
| 11  | Cross-repo comment                    | `{ number: "42", body: "test", repo: "owner/repo" }`                | --repo flag passed                                    | P1                                          | mocked |
| 12  | Permission denied                     | `{ number: "42", body: "test" }`                                    | `errorType: "permission-denied"`                      | P1                                          | mocked |
| 13  | Validation error (empty body edge)    | `{ number: "42", body: "" }`                                        | `errorType: "validation"` or graceful handling        | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 5      |
| P2        | 1      |
| **Total** | **13** |

---

## 5. issue-create

### Tool: `@paretools/github` -> `issue-create`

### Implementation: `packages/server-github/src/tools/issue-create.ts`

### Schema: `IssueCreateResultSchema`

### Input params

| Param       | Type     | Required | Notes                    |
| ----------- | -------- | -------- | ------------------------ |
| `title`     | string   | yes      | Issue title              |
| `body`      | string   | yes      | Issue body/description   |
| `labels`    | string[] | no       | Labels to apply          |
| `assignees` | string[] | no       | Assignee usernames       |
| `milestone` | string   | no       | Milestone name or number |
| `project`   | string   | no       | Project board name       |
| `template`  | string   | no       | Issue template file name |
| `repo`      | string   | no       | OWNER/REPO format        |
| `path`      | string   | no       | Repository path          |

### Scenarios

| #   | Scenario                                             | Params                                                   | Expected Output                                               | Priority                                    | Status |
| --- | ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Create issue happy path                              | `{ title: "Bug report", body: "Steps to reproduce..." }` | `number > 0`, `url` populated                                 | P0                                          | mocked |
| 2   | Create with labels                                   | `{ title: "Bug", body: "desc", labels: ["bug", "p0"] }`  | `labelsApplied: ["bug", "p0"]`                                | P0                                          | mocked |
| 3   | Flag injection on title                              | `{ title: "--exec=evil", body: "test" }`                 | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 4   | Flag injection on labels entry                       | `{ title: "t", body: "b", labels: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 5   | Flag injection on assignees entry                    | `{ title: "t", body: "b", assignees: ["--exec=evil"] }`  | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 6   | Flag injection on milestone                          | `{ title: "t", body: "b", milestone: "--exec=evil" }`    | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 7   | Flag injection on project                            | `{ title: "t", body: "b", project: "--exec=evil" }`      | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 8   | Flag injection on template                           | `{ title: "t", body: "b", template: "--exec=evil" }`     | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 9   | Flag injection on repo                               | `{ title: "t", body: "b", repo: "--exec=evil" }`         | `assertNoFlagInjection` throws                                | P0                                          | mocked |
| 10  | Shell escaping in body (#530 pattern)                | `{ title: "t", body: "Use `cmd                           | grep` and $(var)" }`                                          | Body delivered intact via --body-file stdin | P0     | mocked |
| 11  | Permission denied                                    | `{ title: "t", body: "b" }`                              | `errorType: "permission-denied"`                              | P0                                          | mocked |
| 12  | Validation error                                     | `{ title: "t", body: "b" }`                              | `errorType: "validation"`                                     | P0                                          | mocked |
| 13  | Create with assignees                                | `{ title: "t", body: "b", assignees: ["user1"] }`        | --assignee flag passed                                        | P1                                          | mocked |
| 14  | Create with milestone                                | `{ title: "t", body: "b", milestone: "v1.0" }`           | --milestone flag passed                                       | P1                                          | mocked |
| 15  | Create with project                                  | `{ title: "t", body: "b", project: "Board" }`            | --project flag passed                                         | P1                                          | mocked |
| 16  | Create with template                                 | `{ title: "t", body: "b", template: "bug_report.md" }`   | --template flag passed                                        | P1                                          | mocked |
| 17  | Cross-repo create                                    | `{ title: "t", body: "b", repo: "owner/repo" }`          | --repo flag passed                                            | P1                                          | mocked |
| 18  | Partial creation (issue created but metadata failed) | `{ title: "t", body: "b", labels: ["nonexistent"] }`     | `partial: true`, `errorType: "partial-created"`, `number > 0` | P1                                          | mocked |
| 19  | Body with long markdown content                      | `{ title: "t", body: "<very long body>" }`               | Body delivered intact, no truncation                          | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 12     |
| P1        | 6      |
| P2        | 1      |
| **Total** | **19** |

---

## 6. issue-list

### Tool: `@paretools/github` -> `issue-list`

### Implementation: `packages/server-github/src/tools/issue-list.ts`

### Schema: `IssueListResultSchema`

### Input params

| Param       | Type                  | Required | Notes                     |
| ----------- | --------------------- | -------- | ------------------------- |
| `state`     | enum: open/closed/all | no       | Default: open             |
| `limit`     | number                | no       | Default: 30               |
| `paginate`  | boolean               | no       | Fetch up to 1000          |
| `label`     | string                | no       | Filter by label (single)  |
| `labels`    | string[]              | no       | Filter by multiple labels |
| `assignee`  | string                | no       | Filter by assignee        |
| `search`    | string                | no       | GitHub search syntax      |
| `author`    | string                | no       | Filter by author          |
| `milestone` | string                | no       | Filter by milestone       |
| `mention`   | string                | no       | Filter by mentioned user  |
| `app`       | string                | no       | Filter by GitHub App      |
| `repo`      | string                | no       | OWNER/REPO format         |
| `path`      | string                | no       | Repository path           |
| `compact`   | boolean               | no       | Default: true             |

### Scenarios

| #   | Scenario                       | Params                                  | Expected Output                                                    | Priority | Status |
| --- | ------------------------------ | --------------------------------------- | ------------------------------------------------------------------ | -------- | ------ |
| 1   | List open issues (default)     | `{ }`                                   | `issues` array, `total >= 0`, each has number/state/title          | P0       | mocked |
| 2   | Empty issue list               | `{ label: "nonexistent-label-xyz" }`    | `issues: []`, `total: 0`                                           | P0       | mocked |
| 3   | Flag injection on label        | `{ label: "--exec=evil" }`              | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 4   | Flag injection on labels entry | `{ labels: ["--exec=evil"] }`           | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 5   | Flag injection on assignee     | `{ assignee: "--exec=evil" }`           | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 6   | Flag injection on search       | `{ search: "--exec=evil" }`             | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 7   | Flag injection on author       | `{ author: "--exec=evil" }`             | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 8   | Flag injection on milestone    | `{ milestone: "--exec=evil" }`          | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 9   | Flag injection on repo         | `{ repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 10  | Flag injection on mention      | `{ mention: "--exec=evil" }`            | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 11  | Flag injection on app          | `{ app: "--exec=evil" }`                | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 12  | Filter by state closed         | `{ state: "closed" }`                   | All issues have `state: "CLOSED"`                                  | P1       | mocked |
| 13  | Filter by label                | `{ label: "bug" }`                      | Filtered results contain the label                                 | P1       | mocked |
| 14  | Filter by assignee             | `{ assignee: "octocat" }`               | Filtered results                                                   | P1       | mocked |
| 15  | hasMore pagination detection   | `{ limit: 2 }`                          | `hasMore: true` when more issues exist, `totalAvailable` populated | P1       | mocked |
| 16  | Paginate all                   | `{ paginate: true }`                    | Up to 1000 issues, `hasMore: false`                                | P1       | mocked |
| 17  | Compact vs full output         | `{ compact: false }`                    | Full schema output (not compact)                                   | P1       | mocked |
| 18  | Cross-repo listing             | `{ repo: "owner/repo" }`                | --repo flag passed                                                 | P1       | mocked |
| 19  | Search filter                  | `{ search: "is:open label:bug" }`       | --search flag passed                                               | P1       | mocked |
| 20  | Multiple labels filter         | `{ labels: ["bug", "enhancement"] }`    | Multiple --label flags passed                                      | P2       | mocked |
| 21  | Author + milestone combo       | `{ author: "user", milestone: "v1.0" }` | Both filters applied                                               | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 11     |
| P1        | 8      |
| P2        | 2      |
| **Total** | **21** |

---

## 7. issue-update

### Tool: `@paretools/github` -> `issue-update`

### Implementation: `packages/server-github/src/tools/issue-update.ts`

### Schema: `EditResultSchema`

### Input params

| Param             | Type     | Required | Notes                     |
| ----------------- | -------- | -------- | ------------------------- |
| `number`          | string   | yes      | Issue number or URL       |
| `path`            | string   | no       | Repository path           |
| `title`           | string   | no       | New title                 |
| `body`            | string   | no       | New body (sent via stdin) |
| `addLabels`       | string[] | no       | Labels to add             |
| `removeLabels`    | string[] | no       | Labels to remove          |
| `addAssignees`    | string[] | no       | Assignees to add          |
| `removeAssignees` | string[] | no       | Assignees to remove       |
| `milestone`       | string   | no       | Set milestone             |
| `removeMilestone` | boolean  | no       | Remove milestone          |
| `addProjects`     | string[] | no       | Projects to add           |
| `removeProjects`  | string[] | no       | Projects to remove        |
| `repo`            | string   | no       | OWNER/REPO format         |

### Scenarios

| #   | Scenario                                | Params                                                                       | Expected Output                                   | Priority                                    | Status |
| --- | --------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Update title happy path                 | `{ number: "42", title: "New title" }`                                       | `updatedFields: ["title"]`, `url` populated       | P0                                          | mocked |
| 2   | Update body                             | `{ number: "42", body: "New body text" }`                                    | `updatedFields: ["body"]`, body sent via stdin    | P0                                          | mocked |
| 3   | Issue not found                         | `{ number: "999999", title: "x" }`                                           | `errorType: "not-found"`                          | P0                                          | mocked |
| 4   | Flag injection on number                | `{ number: "--exec=evil", title: "x" }`                                      | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 5   | Flag injection on title                 | `{ number: "42", title: "--exec=evil" }`                                     | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 6   | Flag injection on milestone             | `{ number: "42", milestone: "--exec=evil" }`                                 | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 7   | Flag injection on repo                  | `{ number: "42", repo: "--exec=evil" }`                                      | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 8   | Flag injection on addLabels entry       | `{ number: "42", addLabels: ["--exec=evil"] }`                               | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 9   | Flag injection on removeLabels entry    | `{ number: "42", removeLabels: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 10  | Flag injection on addAssignees entry    | `{ number: "42", addAssignees: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 11  | Flag injection on removeAssignees entry | `{ number: "42", removeAssignees: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 12  | Flag injection on addProjects entry     | `{ number: "42", addProjects: ["--exec=evil"] }`                             | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 13  | Flag injection on removeProjects entry  | `{ number: "42", removeProjects: ["--exec=evil"] }`                          | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 14  | Shell escaping in body (#530 pattern)   | `{ number: "42", body: "Use `cmd                                             | grep` and $(var)" }`                              | Body delivered intact via --body-file stdin | P0     | mocked |
| 15  | Add labels                              | `{ number: "42", addLabels: ["bug", "p0"] }`                                 | `operations: ["add-label"]`                       | P1                                          | mocked |
| 16  | Remove labels                           | `{ number: "42", removeLabels: ["wontfix"] }`                                | `operations: ["remove-label"]`                    | P1                                          | mocked |
| 17  | Add and remove assignees                | `{ number: "42", addAssignees: ["user1"], removeAssignees: ["user2"] }`      | `operations: ["add-assignee", "remove-assignee"]` | P1                                          | mocked |
| 18  | Set milestone                           | `{ number: "42", milestone: "v1.0" }`                                        | `operations: ["set-milestone"]`                   | P1                                          | mocked |
| 19  | Remove milestone                        | `{ number: "42", removeMilestone: true }`                                    | `operations: ["remove-milestone"]`                | P1                                          | mocked |
| 20  | Add project                             | `{ number: "42", addProjects: ["Board"] }`                                   | `operations: ["add-project"]`                     | P1                                          | mocked |
| 21  | Cross-repo update                       | `{ number: "42", title: "x", repo: "owner/repo" }`                           | --repo flag passed                                | P1                                          | mocked |
| 22  | Permission denied                       | `{ number: "42", title: "x" }`                                               | `errorType: "permission-denied"`                  | P1                                          | mocked |
| 23  | Multiple operations at once             | `{ number: "42", title: "New", addLabels: ["bug"], addAssignees: ["user"] }` | `updatedFields: ["title", "labels", "assignees"]` | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 14     |
| P1        | 8      |
| P2        | 1      |
| **Total** | **23** |

---

## 8. issue-view

### Tool: `@paretools/github` -> `issue-view`

### Implementation: `packages/server-github/src/tools/issue-view.ts`

### Schema: `IssueViewResultSchema`

### Input params

| Param      | Type    | Required | Notes               |
| ---------- | ------- | -------- | ------------------- |
| `number`   | string  | yes      | Issue number or URL |
| `comments` | boolean | no       | Include comments    |
| `repo`     | string  | no       | OWNER/REPO format   |
| `path`     | string  | no       | Repository path     |
| `compact`  | boolean | no       | Default: true       |

### Scenarios

| #   | Scenario                                 | Params                                                  | Expected Output                                                                 | Priority | Status |
| --- | ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- | ------ |
| 1   | View issue happy path                    | `{ number: "42" }`                                      | `number`, `state`, `title`, `labels`, `assignees`, `url`, `createdAt` populated | P0       | mocked |
| 2   | Issue not found                          | `{ number: "999999" }`                                  | Error thrown: "gh issue view failed"                                            | P0       | mocked |
| 3   | Flag injection on number                 | `{ number: "--exec=evil" }`                             | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 4   | Flag injection on repo                   | `{ number: "42", repo: "--exec=evil" }`                 | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 5   | Closed issue with stateReason            | `{ number: "42" }`                                      | `state: "CLOSED"`, `stateReason` populated (e.g. "completed")                   | P0       | mocked |
| 6   | Issue with body containing special chars | `{ number: "42" }`                                      | `body` preserved with backticks, pipes, etc.                                    | P0       | mocked |
| 7   | Include comments                         | `{ number: "42", comments: true }`                      | --comments flag passed                                                          | P1       | mocked |
| 8   | Compact vs full output                   | `{ number: "42", compact: false }`                      | Full schema output                                                              | P1       | mocked |
| 9   | Cross-repo view                          | `{ number: "42", repo: "owner/repo" }`                  | --repo flag passed                                                              | P1       | mocked |
| 10  | Issue with all metadata                  | `{ number: "42" }`                                      | `author`, `milestone`, `isPinned`, `projectItems` populated                     | P1       | mocked |
| 11  | Issue with null body                     | `{ number: "42" }`                                      | `body: null`, no crash                                                          | P1       | mocked |
| 12  | Issue number as URL                      | `{ number: "https://github.com/owner/repo/issues/42" }` | Passes URL correctly                                                            | P2       | mocked |
| 13  | Issue with empty labels and assignees    | `{ number: "42" }`                                      | `labels: []`, `assignees: []`                                                   | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 5      |
| P2        | 2      |
| **Total** | **13** |

---

## 9. pr-comment

### Tool: `@paretools/github` -> `pr-comment`

### Implementation: `packages/server-github/src/tools/pr-comment.ts`

### Schema: `CommentResultSchema`

### Input params

| Param          | Type    | Required | Notes                                         |
| -------------- | ------- | -------- | --------------------------------------------- |
| `number`       | string  | yes      | PR number, URL, or branch name                |
| `body`         | string  | yes      | Comment text                                  |
| `editLast`     | boolean | no       | Edit last comment                             |
| `deleteLast`   | boolean | no       | Delete last comment                           |
| `createIfNone` | boolean | no       | Create if no existing comment (with editLast) |
| `repo`         | string  | no       | OWNER/REPO format                             |
| `path`         | string  | no       | Repository path                               |

### Scenarios

| #   | Scenario                              | Params                                                               | Expected Output                                       | Priority                                    | Status |
| --- | ------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Create comment happy path             | `{ number: "123", body: "LGTM" }`                                    | `operation: "create"`, `url` populated, `body` echoed | P0                                          | mocked |
| 2   | PR not found                          | `{ number: "999999", body: "test" }`                                 | `errorType: "not-found"`                              | P0                                          | mocked |
| 3   | Flag injection on body                | `{ number: "123", body: "--exec=evil" }`                             | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 4   | Flag injection on number              | `{ number: "--exec=evil", body: "test" }`                            | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 5   | Flag injection on repo                | `{ number: "123", body: "test", repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                        | P0                                          | mocked |
| 6   | Shell escaping in body (#530 pattern) | `{ number: "123", body: "Run `npm test                               | grep fail` and $(echo hi)" }`                         | Body delivered intact via --body-file stdin | P0     | mocked |
| 7   | Body with backticks and pipes         | `{ number: "123", body: "```\ncode                                   | filter\n```" }`                                       | Body preserved intact                       | P0     | mocked |
| 8   | Edit last comment                     | `{ number: "123", body: "Updated", editLast: true }`                 | `operation: "edit"`                                   | P1                                          | mocked |
| 9   | Delete last comment                   | `{ number: "123", body: "", deleteLast: true }`                      | `operation: "delete"`                                 | P1                                          | mocked |
| 10  | Edit with createIfNone                | `{ number: "123", body: "New", editLast: true, createIfNone: true }` | --create-if-none flag passed                          | P1                                          | mocked |
| 11  | Cross-repo comment                    | `{ number: "123", body: "test", repo: "owner/repo" }`                | --repo flag passed                                    | P1                                          | mocked |
| 12  | Permission denied                     | `{ number: "123", body: "test" }`                                    | `errorType: "permission-denied"`                      | P1                                          | mocked |
| 13  | PR number as branch name              | `{ number: "feature-branch", body: "test" }`                         | Passes branch name to gh CLI                          | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 5      |
| P2        | 1      |
| **Total** | **13** |

---

## 10. pr-create

### Tool: `@paretools/github` -> `pr-create`

### Implementation: `packages/server-github/src/tools/pr-create.ts`

### Schema: `PrCreateResultSchema`

### Input params

| Param              | Type     | Required | Notes                     |
| ------------------ | -------- | -------- | ------------------------- |
| `title`            | string   | yes      | PR title                  |
| `body`             | string   | yes      | PR body/description       |
| `base`             | string   | no       | Base branch               |
| `head`             | string   | no       | Head branch               |
| `draft`            | boolean  | no       | Default: false            |
| `fill`             | boolean  | no       | Auto-fill from commits    |
| `fillFirst`        | boolean  | no       | Use first commit only     |
| `fillVerbose`      | boolean  | no       | Verbose commit messages   |
| `dryRun`           | boolean  | no       | Preview without creating  |
| `noMaintainerEdit` | boolean  | no       | Disallow maintainer edits |
| `reviewer`         | string[] | no       | Request reviewers         |
| `label`            | string[] | no       | Add labels                |
| `assignee`         | string[] | no       | Assign users              |
| `milestone`        | string   | no       | Set milestone             |
| `project`          | string   | no       | Add to project            |
| `repo`             | string   | no       | OWNER/REPO format         |
| `template`         | string   | no       | PR template file          |
| `path`             | string   | no       | Repository path           |

### Scenarios

| #   | Scenario                              | Params                                                       | Expected Output                             | Priority                                    | Status |
| --- | ------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Create PR happy path                  | `{ title: "Fix bug", body: "Fixes #123" }`                   | `number > 0`, `url` populated               | P0                                          | mocked |
| 2   | Create draft PR                       | `{ title: "WIP", body: "In progress", draft: true }`         | `draft: true`                               | P0                                          | mocked |
| 3   | No commits between base/head          | `{ title: "t", body: "b" }`                                  | `errorType: "no-commits"`                   | P0                                          | mocked |
| 4   | Base branch missing                   | `{ title: "t", body: "b", base: "nonexistent" }`             | `errorType: "base-branch-missing"`          | P0                                          | mocked |
| 5   | Flag injection on title               | `{ title: "--exec=evil", body: "b" }`                        | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 6   | Flag injection on base                | `{ title: "t", body: "b", base: "--exec=evil" }`             | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 7   | Flag injection on head                | `{ title: "t", body: "b", head: "--exec=evil" }`             | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 8   | Flag injection on milestone           | `{ title: "t", body: "b", milestone: "--exec=evil" }`        | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 9   | Flag injection on project             | `{ title: "t", body: "b", project: "--exec=evil" }`          | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 10  | Flag injection on repo                | `{ title: "t", body: "b", repo: "--exec=evil" }`             | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 11  | Flag injection on template            | `{ title: "t", body: "b", template: "--exec=evil" }`         | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 12  | Flag injection on reviewer entry      | `{ title: "t", body: "b", reviewer: ["--exec=evil"] }`       | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 13  | Flag injection on label entry         | `{ title: "t", body: "b", label: ["--exec=evil"] }`          | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 14  | Flag injection on assignee entry      | `{ title: "t", body: "b", assignee: ["--exec=evil"] }`       | `assertNoFlagInjection` throws              | P0                                          | mocked |
| 15  | Shell escaping in body (#530 pattern) | `{ title: "t", body: "Use `cmd                               | grep` and $(var)" }`                        | Body delivered intact via --body-file stdin | P0     | mocked |
| 16  | Permission denied                     | `{ title: "t", body: "b" }`                                  | `errorType: "permission-denied"`            | P0                                          | mocked |
| 17  | Create with reviewers                 | `{ title: "t", body: "b", reviewer: ["user1", "org/team"] }` | --reviewer flags passed                     | P1                                          | mocked |
| 18  | Create with labels                    | `{ title: "t", body: "b", label: ["bug", "p0"] }`            | --label flags passed                        | P1                                          | mocked |
| 19  | Create with assignees                 | `{ title: "t", body: "b", assignee: ["user1"] }`             | --assignee flag passed                      | P1                                          | mocked |
| 20  | Fill from commits                     | `{ title: "t", body: "b", fill: true }`                      | --fill flag passed                          | P1                                          | mocked |
| 21  | Fill first commit                     | `{ title: "t", body: "b", fillFirst: true }`                 | --fill-first flag passed                    | P1                                          | mocked |
| 22  | Dry run                               | `{ title: "t", body: "b", dryRun: true }`                    | --dry-run flag passed, no actual PR created | P1                                          | mocked |
| 23  | Cross-repo create                     | `{ title: "t", body: "b", repo: "owner/repo" }`              | --repo flag passed                          | P1                                          | mocked |
| 24  | No maintainer edit                    | `{ title: "t", body: "b", noMaintainerEdit: true }`          | --no-maintainer-edit flag passed            | P2                                          | mocked |
| 25  | Template usage                        | `{ title: "t", body: "b", template: "bug_report.md" }`       | --template flag passed                      | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 16     |
| P1        | 7      |
| P2        | 2      |
| **Total** | **25** |

---

## 11. pr-diff

### Tool: `@paretools/github` -> `pr-diff`

### Implementation: `packages/server-github/src/tools/pr-diff.ts`

### Schema: `PrDiffResultSchema`

### Input params

| Param      | Type    | Required | Notes                                       |
| ---------- | ------- | -------- | ------------------------------------------- |
| `number`   | string  | yes      | PR number, URL, or branch name              |
| `repo`     | string  | no       | OWNER/REPO format                           |
| `full`     | boolean | no       | Include full patch content (default: false) |
| `nameOnly` | boolean | no       | List only changed file names                |
| `compact`  | boolean | no       | Default: true                               |

### Scenarios

| #   | Scenario                        | Params                                   | Expected Output                                                        | Priority | Status |
| --- | ------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- | -------- | ------ |
| 1   | Diff happy path                 | `{ number: "123" }`                      | `files` array, `totalAdditions`, `totalDeletions`, `totalFiles`        | P0       | mocked |
| 2   | Empty diff (no changes)         | `{ number: "123" }`                      | `files: []`, `totalFiles: 0`, `totalAdditions: 0`, `totalDeletions: 0` | P0       | mocked |
| 3   | PR not found                    | `{ number: "999999" }`                   | Error thrown: "gh pr diff failed"                                      | P0       | mocked |
| 4   | Flag injection on number        | `{ number: "--exec=evil" }`              | `assertNoFlagInjection` throws                                         | P0       | mocked |
| 5   | Flag injection on repo          | `{ number: "123", repo: "--exec=evil" }` | `assertNoFlagInjection` throws                                         | P0       | mocked |
| 6   | Full patch content              | `{ number: "123", full: true }`          | Files have `chunks` arrays with headers and lines                      | P1       | mocked |
| 7   | Name only mode                  | `{ number: "123", nameOnly: true }`      | --name-only flag passed                                                | P1       | mocked |
| 8   | File status detection (added)   | `{ number: "123" }`                      | File with `status: "added"` detected from "new file mode"              | P1       | mocked |
| 9   | File status detection (deleted) | `{ number: "123" }`                      | File with `status: "deleted"` detected                                 | P1       | mocked |
| 10  | File status detection (renamed) | `{ number: "123" }`                      | File with `status: "renamed"`, `oldFile` populated                     | P1       | mocked |
| 11  | Binary file detection           | `{ number: "123" }`                      | File with `binary: true`                                               | P1       | mocked |
| 12  | File mode detection             | `{ number: "123", full: true }`          | `mode` field populated for files with mode changes                     | P1       | mocked |
| 13  | Large diff truncation           | `{ number: "123" }`                      | `truncated: true` when diff exceeds 256KB                              | P1       | mocked |
| 14  | Compact vs full output          | `{ number: "123", compact: false }`      | Full schema output                                                     | P1       | mocked |
| 15  | Cross-repo diff                 | `{ number: "123", repo: "owner/repo" }`  | --repo flag passed                                                     | P1       | mocked |
| 16  | Quoted file paths (spaces)      | `{ number: "123" }`                      | File paths with spaces parsed correctly                                | P2       | mocked |
| 17  | PR number as branch name        | `{ number: "feature-branch" }`           | Passes branch to gh CLI                                                | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 5      |
| P1        | 10     |
| P2        | 2      |
| **Total** | **17** |

---

## 12. pr-list

### Tool: `@paretools/github` -> `pr-list`

### Implementation: `packages/server-github/src/tools/pr-list.ts`

### Schema: `PrListResultSchema`

### Input params

| Param      | Type                         | Required | Notes                     |
| ---------- | ---------------------------- | -------- | ------------------------- |
| `state`    | enum: open/closed/merged/all | no       | Default: open             |
| `limit`    | number                       | no       | Default: 30               |
| `author`   | string                       | no       | Filter by author          |
| `label`    | string                       | no       | Filter by label (single)  |
| `labels`   | string[]                     | no       | Filter by multiple labels |
| `draft`    | boolean                      | no       | Filter by draft status    |
| `base`     | string                       | no       | Filter by base branch     |
| `head`     | string                       | no       | Filter by head branch     |
| `assignee` | string                       | no       | Filter by assignee        |
| `search`   | string                       | no       | GitHub search syntax      |
| `repo`     | string                       | no       | OWNER/REPO format         |
| `app`      | string                       | no       | Filter by GitHub App      |
| `path`     | string                       | no       | Repository path           |
| `compact`  | boolean                      | no       | Default: true             |

### Scenarios

| #   | Scenario                       | Params                                  | Expected Output                                        | Priority | Status |
| --- | ------------------------------ | --------------------------------------- | ------------------------------------------------------ | -------- | ------ |
| 1   | List open PRs (default)        | `{ }`                                   | `prs` array, `total >= 0`, each has number/state/title | P0       | mocked |
| 2   | Empty PR list                  | `{ label: "nonexistent-label-xyz" }`    | `prs: []`, `total: 0`                                  | P0       | mocked |
| 3   | Flag injection on author       | `{ author: "--exec=evil" }`             | `assertNoFlagInjection` throws                         | P0       | mocked |
| 4   | Flag injection on label        | `{ label: "--exec=evil" }`              | `assertNoFlagInjection` throws                         | P0       | mocked |
| 5   | Flag injection on labels entry | `{ labels: ["--exec=evil"] }`           | `assertNoFlagInjection` throws                         | P0       | mocked |
| 6   | Flag injection on base         | `{ base: "--exec=evil" }`               | `assertNoFlagInjection` throws                         | P0       | mocked |
| 7   | Flag injection on head         | `{ head: "--exec=evil" }`               | `assertNoFlagInjection` throws                         | P0       | mocked |
| 8   | Flag injection on assignee     | `{ assignee: "--exec=evil" }`           | `assertNoFlagInjection` throws                         | P0       | mocked |
| 9   | Flag injection on search       | `{ search: "--exec=evil" }`             | `assertNoFlagInjection` throws                         | P0       | mocked |
| 10  | Flag injection on repo         | `{ repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                         | P0       | mocked |
| 11  | Flag injection on app          | `{ app: "--exec=evil" }`                | `assertNoFlagInjection` throws                         | P0       | mocked |
| 12  | Filter by state merged         | `{ state: "merged" }`                   | All PRs have merged state                              | P1       | mocked |
| 13  | Filter by author               | `{ author: "octocat" }`                 | Filtered results                                       | P1       | mocked |
| 14  | Filter by base branch          | `{ base: "main" }`                      | --base flag passed                                     | P1       | mocked |
| 15  | Filter by draft                | `{ draft: true }`                       | --draft flag passed                                    | P1       | mocked |
| 16  | totalAvailable count           | `{ limit: 5 }`                          | `totalAvailable` populated from probe query            | P1       | mocked |
| 17  | Compact vs full output         | `{ compact: false }`                    | Full schema output                                     | P1       | mocked |
| 18  | Cross-repo listing             | `{ repo: "owner/repo" }`                | --repo flag passed                                     | P1       | mocked |
| 19  | Search filter                  | `{ search: "is:open review:required" }` | --search flag passed                                   | P1       | mocked |
| 20  | Multiple labels filter         | `{ labels: ["bug", "p0"] }`             | Multiple --label flags passed                          | P2       | mocked |
| 21  | Head branch filter             | `{ head: "feature" }`                   | --head flag passed                                     | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 11     |
| P1        | 8      |
| P2        | 2      |
| **Total** | **21** |

---

## 13. pr-merge

### Tool: `@paretools/github` -> `pr-merge`

### Implementation: `packages/server-github/src/tools/pr-merge.ts`

### Schema: `PrMergeResultSchema`

### Input params

| Param             | Type                      | Required | Notes                                  |
| ----------------- | ------------------------- | -------- | -------------------------------------- |
| `number`          | string                    | yes      | PR number, URL, or branch name         |
| `method`          | enum: squash/merge/rebase | no       | Default: squash                        |
| `deleteBranch`    | boolean                   | no       | Default: false                         |
| `admin`           | boolean                   | no       | Bypass branch protection               |
| `auto`            | boolean                   | no       | Enable auto-merge                      |
| `disableAuto`     | boolean                   | no       | Disable auto-merge                     |
| `subject`         | string                    | no       | Merge commit subject                   |
| `commitBody`      | string                    | no       | Merge commit body                      |
| `authorEmail`     | string                    | no       | Author email for merge commit          |
| `matchHeadCommit` | string                    | no       | Safety: only merge if HEAD SHA matches |
| `repo`            | string                    | no       | OWNER/REPO format                      |
| `path`            | string                    | no       | Repository path                        |
| `compact`         | boolean                   | no       | Default: true                          |

### Scenarios

| #   | Scenario                          | Params                                                 | Expected Output                                     | Priority | Status |
| --- | --------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | -------- | ------ |
| 1   | Squash merge happy path           | `{ number: "123" }`                                    | `merged: true`, `method: "squash"`, `url` populated | P0       | mocked |
| 2   | Merge method: merge               | `{ number: "123", method: "merge" }`                   | `method: "merge"`                                   | P0       | mocked |
| 3   | Merge method: rebase              | `{ number: "123", method: "rebase" }`                  | `method: "rebase"`                                  | P0       | mocked |
| 4   | Already merged PR                 | `{ number: "123" }`                                    | `errorType: "already-merged"`                       | P0       | mocked |
| 5   | Merge conflict                    | `{ number: "123" }`                                    | `errorType: "merge-conflict"`                       | P0       | mocked |
| 6   | Blocked by checks                 | `{ number: "123" }`                                    | `errorType: "blocked-checks"`                       | P0       | mocked |
| 7   | Flag injection on number          | `{ number: "--exec=evil" }`                            | `assertNoFlagInjection` throws                      | P0       | mocked |
| 8   | Flag injection on subject         | `{ number: "123", subject: "--exec=evil" }`            | `assertNoFlagInjection` throws                      | P0       | mocked |
| 9   | Flag injection on authorEmail     | `{ number: "123", authorEmail: "--exec=evil" }`        | `assertNoFlagInjection` throws                      | P0       | mocked |
| 10  | Flag injection on matchHeadCommit | `{ number: "123", matchHeadCommit: "--exec=evil" }`    | `assertNoFlagInjection` throws                      | P0       | mocked |
| 11  | Flag injection on repo            | `{ number: "123", repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                      | P0       | mocked |
| 12  | Permission denied                 | `{ number: "123" }`                                    | `errorType: "permission-denied"`                    | P0       | mocked |
| 13  | Delete branch after merge         | `{ number: "123", deleteBranch: true }`                | `branchDeleted: true`                               | P1       | mocked |
| 14  | Admin merge bypass                | `{ number: "123", admin: true }`                       | --admin flag passed, merge succeeds                 | P1       | mocked |
| 15  | Auto-merge enable                 | `{ number: "123", auto: true }`                        | `state: "auto-merge-enabled"`                       | P1       | mocked |
| 16  | Disable auto-merge                | `{ number: "123", disableAuto: true }`                 | `state: "auto-merge-disabled"`                      | P1       | mocked |
| 17  | Custom merge subject              | `{ number: "123", subject: "release: v1.0" }`          | --subject flag passed                               | P1       | mocked |
| 18  | Custom commit body                | `{ number: "123", commitBody: "Detailed merge info" }` | --body-file stdin with body content                 | P1       | mocked |
| 19  | Match head commit (race safety)   | `{ number: "123", matchHeadCommit: "abc123" }`         | --match-head-commit flag passed                     | P1       | mocked |
| 20  | Cross-repo merge                  | `{ number: "123", repo: "owner/repo" }`                | --repo flag passed                                  | P1       | mocked |
| 21  | Merge commit SHA in output        | `{ number: "123" }`                                    | `mergeCommitSha` populated when available           | P2       | mocked |
| 22  | PR number as URL                  | `{ number: "https://github.com/owner/repo/pull/123" }` | Passes URL correctly                                | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 12     |
| P1        | 8      |
| P2        | 2      |
| **Total** | **22** |

---

## 14. pr-review

### Tool: `@paretools/github` -> `pr-review`

### Implementation: `packages/server-github/src/tools/pr-review.ts`

### Schema: `PrReviewResultSchema`

### Input params

| Param      | Type                                  | Required | Notes                                                  |
| ---------- | ------------------------------------- | -------- | ------------------------------------------------------ |
| `number`   | string                                | yes      | PR number, URL, or branch name                         |
| `event`    | enum: approve/request-changes/comment | yes      | Review type                                            |
| `body`     | string                                | no       | Review body (required for request-changes and comment) |
| `repo`     | string                                | no       | OWNER/REPO format                                      |
| `bodyFile` | string                                | no       | Read body from file                                    |
| `path`     | string                                | no       | Repository path                                        |

### Scenarios

| #   | Scenario                              | Params                                                           | Expected Output                           | Priority                                    | Status |
| --- | ------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Approve PR happy path                 | `{ number: "123", event: "approve" }`                            | `event: "approve"`, `url` populated       | P0                                          | mocked |
| 2   | Request changes with body             | `{ number: "123", event: "request-changes", body: "Fix this" }`  | `event: "request-changes"`, `body` echoed | P0                                          | mocked |
| 3   | Comment review                        | `{ number: "123", event: "comment", body: "Looks interesting" }` | `event: "comment"`, `body` echoed         | P0                                          | mocked |
| 4   | Request changes without body          | `{ number: "123", event: "request-changes" }`                    | Error: body required for request-changes  | P0                                          | mocked |
| 5   | Comment without body                  | `{ number: "123", event: "comment" }`                            | Error: body required for comment          | P0                                          | mocked |
| 6   | PR not found                          | `{ number: "999999", event: "approve" }`                         | `errorType: "not-found"`                  | P0                                          | mocked |
| 7   | Flag injection on number              | `{ number: "--exec=evil", event: "approve" }`                    | `assertNoFlagInjection` throws            | P0                                          | mocked |
| 8   | Flag injection on body                | `{ number: "123", event: "comment", body: "--exec=evil" }`       | `assertNoFlagInjection` throws            | P0                                          | mocked |
| 9   | Flag injection on repo                | `{ number: "123", event: "approve", repo: "--exec=evil" }`       | `assertNoFlagInjection` throws            | P0                                          | mocked |
| 10  | Flag injection on bodyFile            | `{ number: "123", event: "comment", bodyFile: "--exec=evil" }`   | `assertNoFlagInjection` throws            | P0                                          | mocked |
| 11  | Shell escaping in body (#530 pattern) | `{ number: "123", event: "comment", body: "Use `cmd              | grep` and $(var)" }`                      | Body delivered intact via --body-file stdin | P0     | mocked |
| 12  | Permission denied                     | `{ number: "123", event: "approve" }`                            | `errorType: "permission-denied"`          | P0                                          | mocked |
| 13  | Cross-repo review                     | `{ number: "123", event: "approve", repo: "owner/repo" }`        | --repo flag passed                        | P1                                          | mocked |
| 14  | Body from file                        | `{ number: "123", event: "comment", bodyFile: "review.md" }`     | --body-file flag passed                   | P1                                          | mocked |
| 15  | Review on draft PR                    | `{ number: "123", event: "approve" }`                            | `errorType: "draft-pr"`                   | P1                                          | mocked |
| 16  | Already reviewed error                | `{ number: "123", event: "approve" }`                            | `errorType: "already-reviewed"`           | P1                                          | mocked |
| 17  | PR number as branch name              | `{ number: "feature-branch", event: "approve" }`                 | Passes branch to gh CLI                   | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 12     |
| P1        | 4      |
| P2        | 1      |
| **Total** | **17** |

---

## 15. pr-update

### Tool: `@paretools/github` -> `pr-update`

### Implementation: `packages/server-github/src/tools/pr-update.ts`

### Schema: `EditResultSchema`

### Input params

| Param             | Type     | Required | Notes                          |
| ----------------- | -------- | -------- | ------------------------------ |
| `number`          | string   | yes      | PR number, URL, or branch name |
| `path`            | string   | no       | Repository path                |
| `title`           | string   | no       | New title                      |
| `body`            | string   | no       | New body (sent via stdin)      |
| `addLabels`       | string[] | no       | Labels to add                  |
| `removeLabels`    | string[] | no       | Labels to remove               |
| `addAssignees`    | string[] | no       | Assignees to add               |
| `removeAssignees` | string[] | no       | Assignees to remove            |
| `addProjects`     | string[] | no       | Projects to add                |
| `removeProjects`  | string[] | no       | Projects to remove             |
| `addReviewers`    | string[] | no       | Reviewers to add               |
| `removeReviewers` | string[] | no       | Reviewers to remove            |
| `base`            | string   | no       | Change base branch             |
| `milestone`       | string   | no       | Set milestone                  |
| `removeMilestone` | boolean  | no       | Remove milestone               |
| `repo`            | string   | no       | OWNER/REPO format              |

### Scenarios

| #   | Scenario                                | Params                                                                        | Expected Output                                   | Priority                                    | Status |
| --- | --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------- | ------ | ------ |
| 1   | Update title happy path                 | `{ number: "123", title: "New title" }`                                       | `updatedFields: ["title"]`, `url` populated       | P0                                          | mocked |
| 2   | Update body                             | `{ number: "123", body: "New body" }`                                         | `updatedFields: ["body"]`, body sent via stdin    | P0                                          | mocked |
| 3   | PR not found                            | `{ number: "999999", title: "x" }`                                            | `errorType: "not-found"`                          | P0                                          | mocked |
| 4   | Flag injection on number                | `{ number: "--exec=evil", title: "x" }`                                       | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 5   | Flag injection on title                 | `{ number: "123", title: "--exec=evil" }`                                     | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 6   | Flag injection on base                  | `{ number: "123", base: "--exec=evil" }`                                      | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 7   | Flag injection on milestone             | `{ number: "123", milestone: "--exec=evil" }`                                 | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 8   | Flag injection on repo                  | `{ number: "123", repo: "--exec=evil" }`                                      | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 9   | Flag injection on addLabels entry       | `{ number: "123", addLabels: ["--exec=evil"] }`                               | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 10  | Flag injection on removeLabels entry    | `{ number: "123", removeLabels: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 11  | Flag injection on addAssignees entry    | `{ number: "123", addAssignees: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 12  | Flag injection on removeAssignees entry | `{ number: "123", removeAssignees: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 13  | Flag injection on addProjects entry     | `{ number: "123", addProjects: ["--exec=evil"] }`                             | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 14  | Flag injection on removeProjects entry  | `{ number: "123", removeProjects: ["--exec=evil"] }`                          | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 15  | Flag injection on addReviewers entry    | `{ number: "123", addReviewers: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 16  | Flag injection on removeReviewers entry | `{ number: "123", removeReviewers: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws                    | P0                                          | mocked |
| 17  | Shell escaping in body (#530 pattern)   | `{ number: "123", body: "Use `cmd                                             | grep` and $(var)" }`                              | Body delivered intact via --body-file stdin | P0     | mocked |
| 18  | Add labels                              | `{ number: "123", addLabels: ["bug", "p0"] }`                                 | `operations: ["add-label"]`                       | P1                                          | mocked |
| 19  | Remove labels                           | `{ number: "123", removeLabels: ["wontfix"] }`                                | `operations: ["remove-label"]`                    | P1                                          | mocked |
| 20  | Add reviewers                           | `{ number: "123", addReviewers: ["user1", "org/team"] }`                      | `operations: ["add-reviewer"]`                    | P1                                          | mocked |
| 21  | Remove reviewers                        | `{ number: "123", removeReviewers: ["user1"] }`                               | `operations: ["remove-reviewer"]`                 | P1                                          | mocked |
| 22  | Change base branch                      | `{ number: "123", base: "develop" }`                                          | `operations: ["set-base"]`                        | P1                                          | mocked |
| 23  | Set milestone                           | `{ number: "123", milestone: "v1.0" }`                                        | `operations: ["set-milestone"]`                   | P1                                          | mocked |
| 24  | Remove milestone                        | `{ number: "123", removeMilestone: true }`                                    | `operations: ["remove-milestone"]`                | P1                                          | mocked |
| 25  | Permission denied                       | `{ number: "123", title: "x" }`                                               | `errorType: "permission-denied"`                  | P1                                          | mocked |
| 26  | Cross-repo update                       | `{ number: "123", title: "x", repo: "owner/repo" }`                           | --repo flag passed                                | P1                                          | mocked |
| 27  | Multiple operations at once             | `{ number: "123", title: "New", addLabels: ["bug"], addReviewers: ["user"] }` | `updatedFields: ["title", "labels", "reviewers"]` | P2                                          | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 17     |
| P1        | 9      |
| P2        | 1      |
| **Total** | **27** |

---

## 16. pr-view

### Tool: `@paretools/github` -> `pr-view`

### Implementation: `packages/server-github/src/tools/pr-view.ts`

### Schema: `PrViewResultSchema`

### Input params

| Param      | Type    | Required | Notes                          |
| ---------- | ------- | -------- | ------------------------------ |
| `number`   | string  | yes      | PR number, URL, or branch name |
| `comments` | boolean | no       | Include PR comments            |
| `repo`     | string  | no       | OWNER/REPO format              |
| `path`     | string  | no       | Repository path                |
| `compact`  | boolean | no       | Default: true                  |

### Scenarios

| #   | Scenario                         | Params                                                 | Expected Output                                                                    | Priority | Status |
| --- | -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------- | ------ |
| 1   | View PR happy path               | `{ number: "123" }`                                    | All core fields populated: number, state, title, url, headBranch, baseBranch, etc. | P0       | mocked |
| 2   | PR not found                     | `{ number: "999999" }`                                 | Error thrown: "gh pr view failed"                                                  | P0       | mocked |
| 3   | Flag injection on number         | `{ number: "--exec=evil" }`                            | `assertNoFlagInjection` throws                                                     | P0       | mocked |
| 4   | Flag injection on repo           | `{ number: "123", repo: "--exec=evil" }`               | `assertNoFlagInjection` throws                                                     | P0       | mocked |
| 5   | Merged PR                        | `{ number: "123" }`                                    | `state: "MERGED"`, `mergeable` populated                                           | P0       | mocked |
| 6   | Draft PR                         | `{ number: "123" }`                                    | `isDraft: true`                                                                    | P0       | mocked |
| 7   | Include comments                 | `{ number: "123", comments: true }`                    | --comments flag passed                                                             | P1       | mocked |
| 8   | PR with checks                   | `{ number: "123" }`                                    | `checks` array populated, `checksTotal` set                                        | P1       | mocked |
| 9   | PR with reviews                  | `{ number: "123" }`                                    | `reviews` array with author, state, body                                           | P1       | mocked |
| 10  | PR with labels and assignees     | `{ number: "123" }`                                    | `labels`, `assignees` arrays populated                                             | P1       | mocked |
| 11  | PR with null body                | `{ number: "123" }`                                    | `body: null`, no crash                                                             | P1       | mocked |
| 12  | Compact vs full output           | `{ number: "123", compact: false }`                    | Full schema output                                                                 | P1       | mocked |
| 13  | Cross-repo view                  | `{ number: "123", repo: "owner/repo" }`                | --repo flag passed                                                                 | P1       | mocked |
| 14  | Diff stats (additions/deletions) | `{ number: "123" }`                                    | `additions`, `deletions`, `changedFiles` populated                                 | P1       | mocked |
| 15  | Commit info                      | `{ number: "123" }`                                    | `commitCount`, `latestCommitSha` populated                                         | P1       | mocked |
| 16  | PR number as URL                 | `{ number: "https://github.com/owner/repo/pull/123" }` | Passes URL correctly                                                               | P2       | mocked |
| 17  | PR number as branch name         | `{ number: "feature-branch" }`                         | Passes branch to gh CLI                                                            | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 9      |
| P2        | 2      |
| **Total** | **17** |

---

## 17. release-create

### Tool: `@paretools/github` -> `release-create`

### Implementation: `packages/server-github/src/tools/release-create.ts`

### Schema: `ReleaseCreateResultSchema`

### Input params

| Param                | Type     | Required | Notes                                 |
| -------------------- | -------- | -------- | ------------------------------------- |
| `tag`                | string   | yes      | Tag name for the release              |
| `title`              | string   | no       | Release title                         |
| `notes`              | string   | no       | Release notes (sent via stdin)        |
| `draft`              | boolean  | no       | Default: false                        |
| `prerelease`         | boolean  | no       | Default: false                        |
| `target`             | string   | no       | Target branch or commit SHA           |
| `repo`               | string   | no       | OWNER/REPO format                     |
| `generateNotes`      | boolean  | no       | Auto-generate notes                   |
| `verifyTag`          | boolean  | no       | Verify tag exists before creating     |
| `notesFromTag`       | boolean  | no       | Use annotated tag message as notes    |
| `latest`             | boolean  | no       | Control "Latest" badge                |
| `failOnNoCommits`    | boolean  | no       | Fail if no commits since last release |
| `assets`             | string[] | no       | File paths to upload as assets        |
| `notesFile`          | string   | no       | Read notes from file                  |
| `notesStartTag`      | string   | no       | Scope notes to commits since this tag |
| `discussionCategory` | string   | no       | Start a discussion in this category   |
| `path`               | string   | no       | Repository path                       |

### Scenarios

| #   | Scenario                               | Params                                                             | Expected Output                                                       | Priority                                      | Status |
| --- | -------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------- | ------ | ------ |
| 1   | Create release happy path              | `{ tag: "v1.0.0" }`                                                | `tag: "v1.0.0"`, `url` populated, `draft: false`, `prerelease: false` | P0                                            | mocked |
| 2   | Tag conflict (already exists)          | `{ tag: "v1.0.0" }`                                                | `errorType: "tag-conflict"`                                           | P0                                            | mocked |
| 3   | Permission denied                      | `{ tag: "v1.0.0" }`                                                | `errorType: "permission-denied"`                                      | P0                                            | mocked |
| 4   | Flag injection on tag                  | `{ tag: "--exec=evil" }`                                           | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 5   | Flag injection on title                | `{ tag: "v1.0.0", title: "--exec=evil" }`                          | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 6   | Flag injection on target               | `{ tag: "v1.0.0", target: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 7   | Flag injection on repo                 | `{ tag: "v1.0.0", repo: "--exec=evil" }`                           | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 8   | Flag injection on notesFile            | `{ tag: "v1.0.0", notesFile: "--exec=evil" }`                      | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 9   | Flag injection on notesStartTag        | `{ tag: "v1.0.0", notesStartTag: "--exec=evil" }`                  | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 10  | Flag injection on discussionCategory   | `{ tag: "v1.0.0", discussionCategory: "--exec=evil" }`             | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 11  | Flag injection on assets entry         | `{ tag: "v1.0.0", assets: ["--exec=evil"] }`                       | `assertNoFlagInjection` throws                                        | P0                                            | mocked |
| 12  | Shell escaping in notes (#530 pattern) | `{ tag: "v1.0.0", notes: "Use `cmd                                 | grep` and $(var)" }`                                                  | Notes delivered intact via --notes-file stdin | P0     | mocked |
| 13  | Draft release                          | `{ tag: "v1.0.0", draft: true }`                                   | `draft: true`                                                         | P1                                            | mocked |
| 14  | Prerelease                             | `{ tag: "v1.0.0-beta.1", prerelease: true }`                       | `prerelease: true`                                                    | P1                                            | mocked |
| 15  | With title                             | `{ tag: "v1.0.0", title: "Release 1.0" }`                          | `title: "Release 1.0"` in output                                      | P1                                            | mocked |
| 16  | Generate notes                         | `{ tag: "v1.0.0", generateNotes: true }`                           | --generate-notes flag passed                                          | P1                                            | mocked |
| 17  | Verify tag                             | `{ tag: "v1.0.0", verifyTag: true }`                               | --verify-tag flag passed                                              | P1                                            | mocked |
| 18  | Target branch                          | `{ tag: "v1.0.0", target: "release/1.0" }`                         | --target flag passed                                                  | P1                                            | mocked |
| 19  | With assets                            | `{ tag: "v1.0.0", assets: ["dist/app.zip", "dist/checksum.txt"] }` | `assetsUploaded: 2`                                                   | P1                                            | mocked |
| 20  | Fail on no commits                     | `{ tag: "v1.0.0", failOnNoCommits: true }`                         | `errorType: "no-new-commits"` when applicable                         | P1                                            | mocked |
| 21  | Cross-repo release                     | `{ tag: "v1.0.0", repo: "owner/repo" }`                            | --repo flag passed                                                    | P1                                            | mocked |
| 22  | Latest flag true                       | `{ tag: "v1.0.0", latest: true }`                                  | --latest=true flag passed                                             | P2                                            | mocked |
| 23  | Latest flag false                      | `{ tag: "v1.0.0", latest: false }`                                 | --latest=false flag passed                                            | P2                                            | mocked |
| 24  | Notes from tag                         | `{ tag: "v1.0.0", notesFromTag: true }`                            | --notes-from-tag flag passed                                          | P2                                            | mocked |
| 25  | Discussion category                    | `{ tag: "v1.0.0", discussionCategory: "Announcements" }`           | --discussion-category flag passed                                     | P2                                            | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 12     |
| P1        | 9      |
| P2        | 4      |
| **Total** | **25** |

---

## 18. release-list

### Tool: `@paretools/github` -> `release-list`

### Implementation: `packages/server-github/src/tools/release-list.ts`

### Schema: `ReleaseListResultSchema`

### Input params

| Param                | Type           | Required | Notes                  |
| -------------------- | -------------- | -------- | ---------------------- |
| `limit`              | number         | no       | Default: 30            |
| `repo`               | string         | no       | OWNER/REPO format      |
| `excludeDrafts`      | boolean        | no       | Exclude draft releases |
| `excludePreReleases` | boolean        | no       | Exclude pre-releases   |
| `order`              | enum: asc/desc | no       | Sort order             |
| `path`               | string         | no       | Repository path        |
| `compact`            | boolean        | no       | Default: true          |

### Scenarios

| #   | Scenario                 | Params                         | Expected Output                                                    | Priority | Status |
| --- | ------------------------ | ------------------------------ | ------------------------------------------------------------------ | -------- | ------ |
| 1   | List releases happy path | `{ }`                          | `releases` array, `total >= 0`, each has tag/name/draft/prerelease | P0       | mocked |
| 2   | Empty release list       | `{ repo: "owner/empty-repo" }` | `releases: []`, `total: 0`                                         | P0       | mocked |
| 3   | Flag injection on repo   | `{ repo: "--exec=evil" }`      | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 4   | Error: repo not found    | `{ repo: "nonexistent/repo" }` | Error thrown: "gh release list failed"                             | P0       | mocked |
| 5   | Exclude drafts           | `{ excludeDrafts: true }`      | --exclude-drafts flag, no draft releases in output                 | P1       | mocked |
| 6   | Exclude pre-releases     | `{ excludePreReleases: true }` | --exclude-pre-releases flag, no prereleases in output              | P1       | mocked |
| 7   | Order ascending          | `{ order: "asc" }`             | --order asc flag passed                                            | P1       | mocked |
| 8   | totalAvailable count     | `{ limit: 5 }`                 | `totalAvailable` populated from probe query                        | P1       | mocked |
| 9   | Compact vs full output   | `{ compact: false }`           | Full schema output                                                 | P1       | mocked |
| 10  | Cross-repo listing       | `{ repo: "owner/repo" }`       | --repo flag passed                                                 | P1       | mocked |
| 11  | Release fields populated | `{ }`                          | Each release has `publishedAt`, `url`, `isLatest`, `createdAt`     | P1       | mocked |
| 12  | Custom limit             | `{ limit: 5 }`                 | At most 5 releases returned                                        | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 4      |
| P1        | 7      |
| P2        | 1      |
| **Total** | **12** |

---

## 19. run-list

### Tool: `@paretools/github` -> `run-list`

### Implementation: `packages/server-github/src/tools/run-list.ts`

### Schema: `RunListResultSchema`

### Input params

| Param      | Type             | Required | Notes                      |
| ---------- | ---------------- | -------- | -------------------------- |
| `limit`    | number           | no       | Default: 20                |
| `branch`   | string           | no       | Filter by branch           |
| `status`   | enum (15 values) | no       | Filter by status           |
| `all`      | boolean          | no       | Include disabled workflows |
| `workflow` | string           | no       | Filter by workflow file/ID |
| `commit`   | string           | no       | Filter by commit SHA       |
| `repo`     | string           | no       | OWNER/REPO format          |
| `event`    | string           | no       | Filter by trigger event    |
| `user`     | string           | no       | Filter by triggering user  |
| `created`  | string           | no       | Filter by creation time    |
| `path`     | string           | no       | Repository path            |
| `compact`  | boolean          | no       | Default: true              |

### Scenarios

| #   | Scenario                                  | Params                                 | Expected Output                                             | Priority | Status |
| --- | ----------------------------------------- | -------------------------------------- | ----------------------------------------------------------- | -------- | ------ |
| 1   | List runs happy path                      | `{ }`                                  | `runs` array, `total >= 0`, each has id/status/workflowName | P0       | mocked |
| 2   | Empty run list                            | `{ branch: "nonexistent-branch-xyz" }` | `runs: []`, `total: 0`                                      | P0       | mocked |
| 3   | Flag injection on branch                  | `{ branch: "--exec=evil" }`            | `assertNoFlagInjection` throws                              | P0       | mocked |
| 4   | Flag injection on workflow                | `{ workflow: "--exec=evil" }`          | `assertNoFlagInjection` throws                              | P0       | mocked |
| 5   | Flag injection on commit                  | `{ commit: "--exec=evil" }`            | `assertNoFlagInjection` throws                              | P0       | mocked |
| 6   | Flag injection on repo                    | `{ repo: "--exec=evil" }`              | `assertNoFlagInjection` throws                              | P0       | mocked |
| 7   | Flag injection on event                   | `{ event: "--exec=evil" }`             | `assertNoFlagInjection` throws                              | P0       | mocked |
| 8   | Flag injection on user                    | `{ user: "--exec=evil" }`              | `assertNoFlagInjection` throws                              | P0       | mocked |
| 9   | Flag injection on created                 | `{ created: "--exec=evil" }`           | `assertNoFlagInjection` throws                              | P0       | mocked |
| 10  | Filter by branch                          | `{ branch: "main" }`                   | All runs have matching headBranch                           | P1       | mocked |
| 11  | Filter by status                          | `{ status: "success" }`                | All runs have conclusion "success"                          | P1       | mocked |
| 12  | Filter by workflow                        | `{ workflow: "ci.yml" }`               | --workflow flag passed                                      | P1       | mocked |
| 13  | Filter by commit                          | `{ commit: "abc123" }`                 | --commit flag passed                                        | P1       | mocked |
| 14  | totalAvailable count                      | `{ limit: 5 }`                         | `totalAvailable` populated                                  | P1       | mocked |
| 15  | Compact vs full output                    | `{ compact: false }`                   | Full schema output                                          | P1       | mocked |
| 16  | Cross-repo listing                        | `{ repo: "owner/repo" }`               | --repo flag passed                                          | P1       | mocked |
| 17  | Include all (disabled workflows)          | `{ all: true }`                        | --all flag passed                                           | P1       | mocked |
| 18  | Filter by event                           | `{ event: "push" }`                    | --event flag passed                                         | P1       | mocked |
| 19  | Expanded fields (headSha, event, attempt) | `{ }`                                  | `headSha`, `event`, `attempt` populated in run items        | P1       | mocked |
| 20  | Filter by user                            | `{ user: "octocat" }`                  | --user flag passed                                          | P2       | mocked |
| 21  | Filter by created                         | `{ created: ">2024-01-01" }`           | --created flag passed                                       | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 10     |
| P2        | 2      |
| **Total** | **21** |

---

## 20. run-rerun

### Tool: `@paretools/github` -> `run-rerun`

### Implementation: `packages/server-github/src/tools/run-rerun.ts`

### Schema: `RunRerunResultSchema`

### Input params

| Param        | Type    | Required | Notes                            |
| ------------ | ------- | -------- | -------------------------------- |
| `runId`      | number  | yes      | Workflow run ID                  |
| `failedOnly` | boolean | no       | Default: false                   |
| `repo`       | string  | no       | OWNER/REPO format                |
| `debug`      | boolean | no       | Enable runner diagnostic logging |
| `job`        | string  | no       | Rerun specific job by databaseId |
| `path`       | string  | no       | Repository path                  |

### Scenarios

| #   | Scenario                       | Params                                  | Expected Output                                                  | Priority | Status |
| --- | ------------------------------ | --------------------------------------- | ---------------------------------------------------------------- | -------- | ------ |
| 1   | Rerun all jobs happy path      | `{ runId: 12345 }`                      | `status: "requested-full"`, `failedOnly: false`, `url` populated | P0       | mocked |
| 2   | Rerun failed jobs only         | `{ runId: 12345, failedOnly: true }`    | `status: "requested-failed"`, `failedOnly: true`                 | P0       | mocked |
| 3   | Run not found                  | `{ runId: 99999999 }`                   | `status: "error"`, `errorType: "not-found"`                      | P0       | mocked |
| 4   | Run in progress (cannot rerun) | `{ runId: 12345 }`                      | `status: "error"`, `errorType: "in-progress"`                    | P0       | mocked |
| 5   | Flag injection on repo         | `{ runId: 12345, repo: "--exec=evil" }` | `assertNoFlagInjection` throws                                   | P0       | mocked |
| 6   | Flag injection on job          | `{ runId: 12345, job: "--exec=evil" }`  | `assertNoFlagInjection` throws                                   | P0       | mocked |
| 7   | Permission denied              | `{ runId: 12345 }`                      | `status: "error"`, `errorType: "permission-denied"`              | P0       | mocked |
| 8   | Rerun specific job             | `{ runId: 12345, job: "67890" }`        | `status: "requested-job"`, `job: "67890"`                        | P1       | mocked |
| 9   | Debug mode                     | `{ runId: 12345, debug: true }`         | --debug flag passed                                              | P1       | mocked |
| 10  | Cross-repo rerun               | `{ runId: 12345, repo: "owner/repo" }`  | --repo flag passed                                               | P1       | mocked |
| 11  | Rerun attempt number in output | `{ runId: 12345 }`                      | `attempt` populated when available                               | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 3      |
| P2        | 1      |
| **Total** | **11** |

---

## 21. run-view

### Tool: `@paretools/github` -> `run-view`

### Implementation: `packages/server-github/src/tools/run-view.ts`

### Schema: `RunViewResultSchema`

### Input params

| Param        | Type    | Required | Notes                               |
| ------------ | ------- | -------- | ----------------------------------- |
| `id`         | number  | yes      | Workflow run ID                     |
| `logFailed`  | boolean | no       | Retrieve logs for failed steps only |
| `log`        | boolean | no       | Retrieve full run logs              |
| `attempt`    | number  | no       | View specific rerun attempt         |
| `exitStatus` | boolean | no       | Exit non-zero if run failed         |
| `job`        | string  | no       | View specific job by ID             |
| `repo`       | string  | no       | OWNER/REPO format                   |
| `path`       | string  | no       | Repository path                     |
| `compact`    | boolean | no       | Default: true                       |

### Scenarios

| #   | Scenario                      | Params                               | Expected Output                                                             | Priority | Status |
| --- | ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------- | -------- | ------ |
| 1   | View run happy path           | `{ id: 12345 }`                      | `id`, `status`, `conclusion`, `workflowName`, `headBranch`, `url` populated | P0       | mocked |
| 2   | Run not found                 | `{ id: 99999999 }`                   | Error thrown: "gh run view failed"                                          | P0       | mocked |
| 3   | Flag injection on job         | `{ id: 12345, job: "--exec=evil" }`  | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 4   | Flag injection on repo        | `{ id: 12345, repo: "--exec=evil" }` | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 5   | Completed run with conclusion | `{ id: 12345 }`                      | `status: "completed"`, `conclusion: "success"` or "failure"                 | P0       | mocked |
| 6   | In-progress run               | `{ id: 12345 }`                      | `status: "in_progress"`, `conclusion: null`                                 | P0       | mocked |
| 7   | Run with jobs and steps       | `{ id: 12345 }`                      | `jobs` array populated, each job has name/status/conclusion/steps           | P1       | mocked |
| 8   | Log failed steps              | `{ id: 12345, logFailed: true }`     | --log-failed flag passed                                                    | P1       | mocked |
| 9   | Full logs                     | `{ id: 12345, log: true }`           | --log flag passed                                                           | P1       | mocked |
| 10  | Specific attempt              | `{ id: 12345, attempt: 2 }`          | --attempt 2 flag passed, `attempt: 2` in output                             | P1       | mocked |
| 11  | View specific job             | `{ id: 12345, job: "67890" }`        | --job flag passed                                                           | P1       | mocked |
| 12  | Cross-repo view               | `{ id: 12345, repo: "owner/repo" }`  | --repo flag passed                                                          | P1       | mocked |
| 13  | Compact vs full output        | `{ id: 12345, compact: false }`      | Full schema output                                                          | P1       | mocked |
| 14  | Run metadata fields           | `{ id: 12345 }`                      | `headSha`, `event`, `startedAt`, `updatedAt`, `durationSeconds` populated   | P1       | mocked |
| 15  | Exit status mode              | `{ id: 12345, exitStatus: true }`    | --exit-status flag passed                                                   | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 8      |
| P2        | 1      |
| **Total** | **15** |

---

## 22. label-list

### Tool: `@paretools/github` -> `label-list`

### Implementation: `packages/server-github/src/tools/label-list.ts`

### Schema: `LabelListResultSchema`

### Scenarios

| #   | Scenario                        | Params                      | Expected Output                                | Priority | Status |
| --- | ------------------------------- | --------------------------- | ---------------------------------------------- | -------- | ------ |
| 1   | Happy path with multiple labels | `{ }`                       | `labels` array, `total >= 0`, fields populated | P0       | mocked |
| 2   | Empty label list                | `{ }`                       | `labels: []`, `total: 0`                       | P0       | mocked |
| 3   | Repo not found                  | `{ repo: "nonexistent/r" }` | `errorType: "not-found"`                       | P0       | mocked |
| 4   | Permission denied               | `{ repo: "private/repo" }`  | `errorType: "permission-denied"`               | P0       | mocked |
| 5   | Flag injection on search        | `{ search: "--exec=evil" }` | `assertNoFlagInjection` throws                 | P0       | mocked |
| 6   | Flag injection on repo          | `{ repo: "--exec=evil" }`   | `assertNoFlagInjection` throws                 | P0       | mocked |
| 7   | Search passes --search flag     | `{ search: "bug" }`         | --search flag passed                           | P1       | mocked |
| 8   | Limit passes --limit flag       | `{ limit: 10 }`             | --limit 10 passed                              | P1       | mocked |
| 9   | Repo passes --repo flag         | `{ repo: "owner/repo" }`    | --repo flag passed                             | P1       | mocked |
| 10  | Default args correct            | `{ }`                       | label list --json ... --limit 30               | P1       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 4      |
| **Total** | **10** |

---

## 23. label-create

### Tool: `@paretools/github` -> `label-create`

### Implementation: `packages/server-github/src/tools/label-create.ts`

### Schema: `LabelCreateResultSchema`

### Scenarios

| #   | Scenario                          | Params                                             | Expected Output                  | Priority | Status |
| --- | --------------------------------- | -------------------------------------------------- | -------------------------------- | -------- | ------ |
| 1   | Create label with name only       | `{ name: "bug" }`                                  | `name: "bug"`, no error          | P0       | mocked |
| 2   | Create with description and color | `{ name: "p", description: "d", color: "ff0000" }` | Flags passed, fields echoed      | P0       | mocked |
| 3   | Label already exists              | `{ name: "bug" }`                                  | `errorType: "already-exists"`    | P0       | mocked |
| 4   | Permission denied                 | `{ name: "bug" }`                                  | `errorType: "permission-denied"` | P0       | mocked |
| 5   | Flag injection on name            | `{ name: "--exec=evil" }`                          | `assertNoFlagInjection` throws   | P0       | mocked |
| 6   | Flag injection on description     | `{ name: "b", description: "--exec=evil" }`        | `assertNoFlagInjection` throws   | P0       | mocked |
| 7   | Flag injection on color           | `{ name: "b", color: "--exec=evil" }`              | `assertNoFlagInjection` throws   | P0       | mocked |
| 8   | Flag injection on repo            | `{ name: "b", repo: "--exec=evil" }`               | `assertNoFlagInjection` throws   | P0       | mocked |
| 9   | Validation error                  | `{ name: "b" }`                                    | `errorType: "validation"`        | P0       | mocked |
| 10  | Repo passes --repo flag           | `{ name: "b", repo: "owner/repo" }`                | --repo flag passed               | P1       | mocked |
| 11  | Default args correct              | `{ name: "bug" }`                                  | label create bug                 | P1       | mocked |
| 12  | Unknown error                     | `{ name: "b" }`                                    | `errorType: "unknown"`           | P2       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 2      |
| P2        | 1      |
| **Total** | **12** |

---

## Grand Summary

| #   | Tool           | P0      | P1      | P2     | Total   |
| --- | -------------- | ------- | ------- | ------ | ------- |
| 1   | api            | 10      | 11      | 5      | 26      |
| 2   | gist-create    | 7       | 5       | 1      | 13      |
| 3   | issue-close    | 9       | 3       | 1      | 13      |
| 4   | issue-comment  | 7       | 5       | 1      | 13      |
| 5   | issue-create   | 12      | 6       | 1      | 19      |
| 6   | issue-list     | 11      | 8       | 2      | 21      |
| 7   | issue-update   | 14      | 8       | 1      | 23      |
| 8   | issue-view     | 6       | 5       | 2      | 13      |
| 9   | pr-comment     | 7       | 5       | 1      | 13      |
| 10  | pr-create      | 16      | 7       | 2      | 25      |
| 11  | pr-diff        | 5       | 10      | 2      | 17      |
| 12  | pr-list        | 11      | 8       | 2      | 21      |
| 13  | pr-merge       | 12      | 8       | 2      | 22      |
| 14  | pr-review      | 12      | 4       | 1      | 17      |
| 15  | pr-update      | 17      | 9       | 1      | 27      |
| 16  | pr-view        | 6       | 9       | 2      | 17      |
| 17  | release-create | 12      | 9       | 4      | 25      |
| 18  | release-list   | 4       | 7       | 1      | 12      |
| 19  | run-list       | 9       | 10      | 2      | 21      |
| 20  | run-rerun      | 7       | 3       | 1      | 11      |
| 21  | run-view       | 6       | 8       | 1      | 15      |
| 22  | label-list     | 6       | 4       | 0      | 10      |
| 23  | label-create   | 9       | 2       | 1      | 12      |
|     | **Totals**     | **215** | **159** | **37** | **411** |
