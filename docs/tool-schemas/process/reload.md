# process > reload

Rebuilds MCP server packages and sends a `notifications/tools/list_changed` notification so the host client refreshes tool definitions. Use during local development to pick up code changes without restarting the session.

**Command**: `pnpm build` (default, configurable)

## Input Parameters

| Parameter      | Type   | Default      | Description                                 |
| -------------- | ------ | ------------ | ------------------------------------------- |
| `buildCommand` | string | `pnpm build` | Build command to execute                    |
| `path`         | string | cwd          | Working directory for the build command     |
| `timeout`      | number | `120000`     | Build timeout in milliseconds (max: 600000) |

## Success — Build and Notification

<table>
<tr><th></th><th>Manual Steps</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ pnpm build
$ # manually disconnect and reconnect MCP server
```

</td>
<td>

~35 tokens

```json
{
  "rebuilt": true,
  "notificationSent": true
}
```

</td>
</tr>
</table>

## Error — Build Fails

<table>
<tr><th></th><th>Manual Steps</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ pnpm build
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL ...
```

</td>
<td>

~40 tokens

```json
{
  "rebuilt": false,
  "notificationSent": false,
  "error": "Build command failed with exit code 1"
}
```

</td>
</tr>
</table>

## Notes

- The `buildCommand` is run via `sh -c` in the specified `path` directory
- After a successful build, the server sends `notifications/tools/list_changed` to signal the host to re-fetch tool definitions
- The notification is sent via the MCP protocol's built-in `sendToolListChanged()` method
- If the build fails, no notification is sent — fix the build errors and retry
- This tool is primarily for local development workflows; it is not needed in production
