# db > redis-command

Executes a Redis command via redis-cli and returns the response.

**Command**: `redis-cli <command> [args...]`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `command`  | string   | --      | Redis command to execute (e.g., GET, SET, KEYS, DBSIZE)    |
| `args`     | string[] | `[]`    | Arguments for the Redis command                            |
| `host`     | string   | --      | Redis host                                                 |
| `port`     | number   | `6379`  | Redis port                                                 |
| `password` | string   | --      | Redis password (AUTH)                                      |
| `db`       | number   | --      | Redis database number                                      |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- GET Command

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ redis-cli GET session:abc123
"{\"userId\":42,\"role\":\"admin\"}"
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "response": "{\"userId\":42,\"role\":\"admin\"}",
  "exitCode": 0,
  "duration": 2
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
  "exitCode": 0,
  "duration": 2
}
```

</td>
</tr>
</table>

## Success -- KEYS Command

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
$ redis-cli KEYS "user:*"
1) "user:1"
2) "user:2"
3) "user:3"
4) "user:42"
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "response": "1) \"user:1\"\n2) \"user:2\"\n3) \"user:3\"\n4) \"user:42\"",
  "exitCode": 0,
  "duration": 3
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
  "exitCode": 0,
  "duration": 3
}
```

</td>
</tr>
</table>

## Error -- Wrong Type

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ redis-cli GET mylist
(error) WRONGTYPE Operation against a key holding the wrong kind of value
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "response": "WRONGTYPE Operation against a key holding the wrong kind of value",
  "exitCode": 0,
  "duration": 2,
  "error": "WRONGTYPE Operation against a key holding the wrong kind of value"
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
  "success": false,
  "exitCode": 0,
  "duration": 2,
  "error": "WRONGTYPE Operation against a key holding the wrong kind of value"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| GET command  | ~10        | ~20       | ~10          | 0%      |
| KEYS command | ~25        | ~20       | ~10          | 20-60%  |
| Wrong type   | ~15        | ~20       | ~15          | 0%      |

## Notes

- WARNING: The command is executed as-is -- do not pass untrusted input
- The `response` field contains the raw redis-cli output as a string; parsing of Redis data types (lists, hashes, etc.) is left to the caller
- The `db` parameter selects a specific Redis database number via `-n`
- Compact mode drops the `response` field, keeping only `success`, `exitCode`, and `duration`
- For simple connectivity checks, prefer `redis-ping` instead
