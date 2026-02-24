# remote > ssh-run

Executes a command on a remote host via SSH and returns structured output with stdout, stderr, exit code, and duration.

**Command**: `ssh [user@]host <command>`

## Input Parameters

| Parameter      | Type     | Default | Description                                                                  |
| -------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `host`         | string   | --      | Remote host to connect to (hostname or IP address)                           |
| `user`         | string   | --      | SSH username (if not specified, uses SSH config default)                     |
| `command`      | string   | --      | Command to execute on the remote host                                        |
| `port`         | number   | `22`    | SSH port number                                                              |
| `identityFile` | string   | --      | Path to SSH private key file                                                 |
| `options`      | string[] | `[]`    | Additional SSH options as -o key=value pairs (e.g. StrictHostKeyChecking=no) |
| `compact`      | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens                   |

## Success -- Remote Command

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ ssh deploy@web01.example.com "df -h / && uptime"
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   32G   16G  67% /
 14:32:01 up 42 days,  3:15,  2 users,  load average: 0.15, 0.10, 0.08
```

</td>
<td>

~55 tokens

```json
{
  "host": "web01.example.com",
  "user": "deploy",
  "command": "df -h / && uptime",
  "success": true,
  "exitCode": 0,
  "stdout": "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   32G   16G  67% /\n 14:32:01 up 42 days,  3:15,  2 users,  load average: 0.15, 0.10, 0.08",
  "duration": 1250,
  "timedOut": false
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
  "host": "web01.example.com",
  "user": "deploy",
  "command": "df -h / && uptime",
  "success": true,
  "exitCode": 0,
  "duration": 1250,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error -- Connection Refused

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ ssh deploy@badhost.example.com "ls"
ssh: connect to host badhost.example.com port 22: Connection refused
```

</td>
<td>

~30 tokens

```json
{
  "host": "badhost.example.com",
  "user": "deploy",
  "command": "ls",
  "success": false,
  "exitCode": 255,
  "stderr": "ssh: connect to host badhost.example.com port 22: Connection refused",
  "duration": 3200,
  "timedOut": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "host": "badhost.example.com",
  "user": "deploy",
  "command": "ls",
  "success": false,
  "exitCode": 255,
  "duration": 3200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Remote command   | ~60        | ~55       | ~20          | 8-67%   |
| Connection error | ~20        | ~30       | ~25          | 0%      |

## Notes

- WARNING: This runs commands on a remote machine -- ensure the host and command are correct before executing
- The `options` parameter accepts SSH `-o` style options (e.g., `StrictHostKeyChecking=no`, `ConnectTimeout=5`)
- The `timedOut` field indicates whether the command was killed due to a timeout
- Compact mode drops `stdout` and `stderr` fields, keeping the structured metadata
- Token savings are highest for commands that produce verbose output (logs, file listings, system info)
