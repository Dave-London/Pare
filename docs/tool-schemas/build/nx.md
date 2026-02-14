# build > nx

Runs Nx workspace commands and returns structured per-project task results with cache status.

**Command**: `npx nx run-many --target=<target>` / `npx nx run <project>:<target>` / `npx nx affected --target=<target>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `target`   | string   | ---     | Nx target to run (e.g., `build`, `test`, `lint`)           |
| `project`  | string   | ---     | Specific project to run the target for                     |
| `affected` | boolean  | `false` | Run target only for affected projects                      |
| `base`     | string   | ---     | Base ref for affected comparison (e.g., `main`)            |
| `args`     | string[] | `[]`    | Additional arguments to pass to nx                         |
| `path`     | string   | cwd     | Project root path                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- All Tasks Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ npx nx run-many --target=build

   Compiling TypeScript files for project "shared"...
   Done compiling TypeScript files for project "shared".
   Compiling TypeScript files for project "core"...
   Done compiling TypeScript files for project "core".

   ✔  nx run shared:build [local cache]        (1.2s)
   ✔  nx run core:build [local cache]          (2.1s)
   ✔  nx run api:build                          (3.4s)
   ✔  nx run web:build                          (4.5s)

 >  NX   Successfully ran target build for 4 projects (5.2s)
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "duration": 5.2,
  "tasks": [
    { "project": "shared", "target": "build", "status": "success", "duration": 1.2, "cache": true },
    { "project": "core", "target": "build", "status": "success", "duration": 2.1, "cache": true },
    { "project": "api", "target": "build", "status": "success", "duration": 3.4 },
    { "project": "web", "target": "build", "status": "success", "duration": 4.5 }
  ],
  "total": 4,
  "passed": 4,
  "failed": 0,
  "cached": 2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": true,
  "duration": 5.2,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "cached": 2
}
```

</td>
</tr>
</table>

## Error --- Task Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ npx nx run-many --target=build

   ✔  nx run shared:build [local cache]        (1.2s)
   ✖  nx run api:build                          (0.5s)
   ✔  nx run web:build                          (3.1s)

   Error: src/handler.ts(15,3): error TS2322: Type 'string' is not assignable to type 'number'.

 >  NX   Ran target build for 3 projects (4.8s)

       Failed tasks:

       - nx run api:build
```

</td>
<td>

~60 tokens

```json
{
  "success": false,
  "duration": 4.8,
  "tasks": [
    { "project": "shared", "target": "build", "status": "success", "duration": 1.2, "cache": true },
    { "project": "api", "target": "build", "status": "failure", "duration": 0.5 },
    { "project": "web", "target": "build", "status": "success", "duration": 3.1 }
  ],
  "total": 3,
  "passed": 2,
  "failed": 1,
  "cached": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": false,
  "duration": 4.8,
  "total": 3,
  "passed": 2,
  "failed": 1,
  "cached": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 4 tasks, all pass  | ~180       | ~80       | ~30          | 56--83% |
| 3 tasks, 1 failure | ~200       | ~60       | ~30          | 70--85% |

## Notes

- The tool selects the Nx command based on parameters: `nx affected` (when `affected=true`), `nx run project:target` (when `project` is set), or `nx run-many --target=target` (default)
- Task status is determined from the leading character: checkmark for success, cross for failure
- Cache hits are detected from `[local cache]` or `[remote cache]` annotations on task lines
- Task status values are `"success"`, `"failure"`, or `"skipped"` (matching Nx's own terminology)
- In compact mode, the `tasks` array is omitted; only summary counts (`total`, `passed`, `failed`, `cached`) are returned
- The `base` parameter is only used with `affected=true` and maps to `--base=<ref>`
