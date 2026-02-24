# infra > vagrant

Manages Vagrant VMs: status, global-status, up, halt, destroy.

**Command**: `vagrant <action> [machine]`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `action`  | enum    | --      | Vagrant action: status, global-status, up, halt, destroy   |
| `machine` | string  | --      | Target machine name                                        |
| `workDir` | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Status

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
Current machine states:

web                       running (virtualbox)
db                        running (virtualbox)

This environment represents multiple VMs. The VMs are all listed
above with their current state.
```

</td>
<td>

~50 tokens

```json
{
  "action": "status",
  "success": true,
  "machines": [
    { "name": "web", "state": "running", "provider": "virtualbox" },
    { "name": "db", "state": "running", "provider": "virtualbox" }
  ],
  "count": 2,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "action": "status",
  "success": true,
  "count": 2,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Success — Global Status

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
id       name    provider   state    directory
------------------------------------------------------------------------
a1b2c3d  web     virtualbox running  /home/user/project-a
e4f5g6h  api     virtualbox poweroff /home/user/project-b

The above shows information about all known Vagrant environments
on this machine.
```

</td>
<td>

~70 tokens

```json
{
  "action": "global-status",
  "success": true,
  "machines": [
    {
      "id": "a1b2c3d",
      "name": "web",
      "provider": "virtualbox",
      "state": "running",
      "directory": "/home/user/project-a"
    },
    {
      "id": "e4f5g6h",
      "name": "api",
      "provider": "virtualbox",
      "state": "poweroff",
      "directory": "/home/user/project-b"
    }
  ],
  "count": 2,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "action": "global-status",
  "success": true,
  "count": 2,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Success — Halt

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
==> web: Attempting graceful shutdown of VM...
==> web: Forcing shutdown of VM...
```

</td>
<td>

~25 tokens

```json
{
  "action": "halt",
  "success": true,
  "machines": [{ "name": "web", "newState": "poweroff" }],
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| Status (2 VMs) | ~150       | ~50       | ~15          | 67-90%  |
| Global status  | ~200       | ~70       | ~20          | 65-90%  |
| Halt           | ~80        | ~25       | ~25          | 69%     |

## Notes

- Uses `--machine-readable --no-color --no-tty` flags for parseable output
- The `destroy` action requires policy gate via `assertAllowedByPolicy` for safety
- The `destroy` action always uses `-f` to force without interactive confirmation
- Machine names are validated against flag injection
- Status returns `machines` with `name`, `state`, and `provider`
- Global-status includes additional `id` and `directory` fields per machine
- Halt/destroy return `machines` with `name` and `newState`
- Compact mode drops the `machines` array, keeping only `count` (for status) or summary fields
