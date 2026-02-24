# db > redis-ping

Tests Redis connectivity by sending a PING command.

**Command**: `redis-cli PING`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `host`     | string  | --      | Redis host                                                 |
| `port`     | number  | `6379`  | Redis port                                                 |
| `password` | string  | --      | Redis password (AUTH)                                      |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- PONG Response

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
$ redis-cli PING
PONG
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "response": "PONG",
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

## Error -- Connection Refused

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ redis-cli -h badhost PING
Could not connect to Redis at badhost:6379: Name or service not known
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 1050,
  "error": "Could not connect to Redis at badhost:6379: Name or service not known"
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
  "success": false,
  "exitCode": 1,
  "duration": 1050,
  "error": "Could not connect to Redis at badhost:6379: Name or service not known"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Successful PING  | ~5         | ~15       | ~10          | 0%      |
| Connection error | ~15        | ~20       | ~20          | 0%      |

## Notes

- A simple connectivity check -- the structured response adds `duration` and `exitCode` not available in raw CLI output
- Compact mode drops the `response` field since `success: true` is sufficient to confirm connectivity
- The `password` parameter is passed via `-a` to redis-cli for AUTH
- This tool is a lightweight alternative to `redis-info` when you only need to verify the server is reachable
