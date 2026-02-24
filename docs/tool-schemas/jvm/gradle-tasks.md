# jvm > gradle-tasks

Lists available Gradle tasks with descriptions and groups. Uses `gradle tasks --all`.

**Command**: `gradle tasks [--all]`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `all`     | boolean | `true`  | Include all tasks including subtasks (default: true)       |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Tasks

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
> Task :tasks

------------------------------------------------------------
Tasks runnable from root project 'myapp'
------------------------------------------------------------

Build tasks
-----------
assemble - Assembles the outputs of this project.
build - Assembles and tests this project.
clean - Deletes the build directory.

Verification tasks
------------------
check - Runs all checks.
test - Runs the unit tests.

Help tasks
----------
dependencies - Displays all dependencies declared in root project 'myapp'.
tasks - Displays the tasks runnable from root project 'myapp'.

BUILD SUCCESSFUL in 1s
1 actionable task: 1 executed
```

</td>
<td>

~100 tokens

```json
{
  "tasks": [
    {
      "name": "assemble",
      "description": "Assembles the outputs of this project.",
      "group": "Build"
    },
    { "name": "build", "description": "Assembles and tests this project.", "group": "Build" },
    { "name": "clean", "description": "Deletes the build directory.", "group": "Build" },
    { "name": "check", "description": "Runs all checks.", "group": "Verification" },
    { "name": "test", "description": "Runs the unit tests.", "group": "Verification" },
    {
      "name": "dependencies",
      "description": "Displays all dependencies declared in root project 'myapp'.",
      "group": "Help"
    },
    {
      "name": "tasks",
      "description": "Displays the tasks runnable from root project 'myapp'.",
      "group": "Help"
    }
  ],
  "total": 7
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "total": 7
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------- | ---------- | --------- | ------------ | ------- |
| 7 tasks  | ~400       | ~100      | ~5           | 75-99%  |

## Notes

- The `all` parameter defaults to `true`, adding `--all` to include subtasks and ungrouped tasks
- Tasks include `name`, optional `description`, and optional `group` (e.g. Build, Verification, Help)
- Parses the Gradle task output format: `taskName - Description text`
- Groups are parsed from section headers like `Build tasks`, `Verification tasks`
- Compact mode drops the `tasks` array entirely, keeping only the `total` count
