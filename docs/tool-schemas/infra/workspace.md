# infra > workspace

Manages Terraform workspaces: list, select, create, or delete workspaces.

**Command**: `terraform workspace <action> [name]`

## Input Parameters

| Parameter | Type    | Default  | Description                                                |
| --------- | ------- | -------- | ---------------------------------------------------------- |
| `path`    | string  | cwd      | Project root path                                          |
| `action`  | enum    | `"list"` | Workspace action: list, select, new, delete                |
| `name`    | string  | --       | Workspace name (required for select/new/delete)            |
| `compact` | boolean | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Workspaces

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
  default
* staging
  production
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "workspaces": ["default", "staging", "production"],
  "current": "staging",
  "action": "list"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": true,
  "current": "staging",
  "action": "list"
}
```

</td>
</tr>
</table>

## Success — Select Workspace

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Switched to workspace "production".
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "action": "select"
}
```

</td>
</tr>
</table>

## Error — Workspace Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~60 tokens

```
Workspace "nonexistent" doesn't exist.

You can create this workspace with the "new" subcommand
or include the "-or-create" flag with the "select" subcommand.
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "action": "select",
  "error": "Workspace \"nonexistent\" doesn't exist."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| List 3 workspaces   | ~60        | ~30       | ~10          | 50-83%  |
| Select workspace    | ~30        | ~15       | ~15          | 50%     |
| Workspace not found | ~60        | ~15       | ~15          | 75%     |

## Notes

- The `action` parameter determines the workspace operation: `list`, `select`, `new`, or `delete`
- The `name` parameter is required for `select`, `new`, and `delete` actions
- When listing, the `current` field identifies the active workspace (marked with `*` in CLI output)
- Compact mode drops the `workspaces` array for list actions, keeping only `current` and `action`
- Workspace names are validated against flag injection
