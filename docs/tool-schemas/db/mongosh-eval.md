# db > mongosh-eval

Evaluates a MongoDB expression via mongosh and returns the output.

**Command**: `mongosh --quiet --eval <expression>`

## Input Parameters

| Parameter    | Type    | Default | Description                                                |
| ------------ | ------- | ------- | ---------------------------------------------------------- |
| `expression` | string  | --      | JavaScript expression to evaluate in mongosh               |
| `uri`        | string  | --      | MongoDB connection URI (e.g., mongodb://localhost:27017/mydb) |
| `compact`    | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Collection Query

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ mongosh --quiet --eval "db.users.find({active: true}).limit(3).toArray()"
[
  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e1'), name: 'Alice', active: true },
  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e2'), name: 'Bob', active: true },
  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e3'), name: 'Carol', active: true }
]
```

</td>
<td>

~55 tokens

```json
{
  "success": true,
  "output": "[\n  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e1'), name: 'Alice', active: true },\n  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e2'), name: 'Bob', active: true },\n  { _id: ObjectId('65a1b2c3d4e5f6a7b8c9d0e3'), name: 'Carol', active: true }\n]",
  "exitCode": 0,
  "duration": 320
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
  "duration": 320
}
```

</td>
</tr>
</table>

## Success -- Count Query

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
$ mongosh --quiet --eval "db.users.countDocuments()"
1842
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "output": "1842",
  "exitCode": 0,
  "duration": 85
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
  "duration": 85
}
```

</td>
</tr>
</table>

## Error -- Connection Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ mongosh --quiet --eval "db.stats()" mongodb://badhost:27017/test
MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 5200,
  "error": "MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017"
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
  "success": false,
  "exitCode": 1,
  "duration": 5200,
  "error": "MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Collection query  | ~80        | ~55       | ~10          | 31-88%  |
| Count query       | ~5         | ~15       | ~10          | 0%      |
| Connection failed | ~40        | ~25       | ~25          | 38%     |

## Notes

- WARNING: The expression is executed as-is -- do not pass untrusted input
- Uses `--quiet` to suppress the mongosh banner and prompt, returning only the expression output
- The `output` field contains the raw string output from mongosh; for JSON results, use `JSON.stringify()` in the expression
- Compact mode drops the `output` field, keeping only `success`, `exitCode`, and `duration`
- Token savings are highest for queries that return large documents or arrays
