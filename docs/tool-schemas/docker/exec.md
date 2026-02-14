# docker > exec

Executes arbitrary commands inside a running Docker container and returns structured output. Use instead of running `docker exec` in the terminal.

**Command**: `docker exec [-w workdir] [-e env] <container> <command...>`

## Input Parameters

| Parameter   | Type     | Default | Description                                                |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `container` | string   | ---     | Container name or ID (required)                            |
| `command`   | string[] | ---     | Command to execute (e.g., `["ls", "-la"]`) (required)      |
| `workdir`   | string   | ---     | Working directory inside the container                     |
| `env`       | string[] | `[]`    | Environment variables (e.g., `["KEY=VALUE"]`)              |
| `path`      | string   | cwd     | Host working directory                                     |
| `compact`   | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Command Executed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
total 32
drwxr-xr-x 1 root root 4096 Jan 15 10:00 .
drwxr-xr-x 1 root root 4096 Jan 15 09:00 ..
-rw-r--r-- 1 root root  512 Jan 15 10:00 package.json
-rw-r--r-- 1 root root 1024 Jan 15 10:00 server.js
drwxr-xr-x 1 root root 4096 Jan 15 10:00 node_modules
```

</td>
<td>

~55 tokens

```json
{
  "exitCode": 0,
  "stdout": "total 32\ndrwxr-xr-x 1 root root 4096 Jan 15 10:00 .\ndrwxr-xr-x 1 root root 4096 Jan 15 09:00 ..\n-rw-r--r-- 1 root root  512 Jan 15 10:00 package.json\n-rw-r--r-- 1 root root 1024 Jan 15 10:00 server.js\ndrwxr-xr-x 1 root root 4096 Jan 15 10:00 node_modules",
  "stderr": "",
  "success": true
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
  "exitCode": 0,
  "success": true
}
```

</td>
</tr>
</table>

## Error — Command Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~20 tokens

```
OCI runtime exec failed: exec failed: unable to start container process: exec: "nonexistent": executable file not found in $PATH
```

</td>
<td>

~20 tokens

```json
{
  "exitCode": 126,
  "stdout": "",
  "stderr": "OCI runtime exec failed: exec failed: unable to start container process",
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| ls -la output   | ~80        | ~55       | ~10          | 31-88%  |
| Command failed  | ~20        | ~20       | ~10          | 0-50%   |

## Notes

- WARNING: This tool runs arbitrary commands inside the container. Only use on trusted containers
- The command array's first element (binary name) is validated against flag injection; subsequent arguments are passed through
- Compact mode drops `stdout` and `stderr`, keeping only `exitCode` and `success`
- The `workdir` parameter maps to Docker's `-w` flag for setting the working directory inside the container
