# db > mongosh-stats

Gets MongoDB database statistics (collections, objects, data size, storage, indexes) via mongosh.

**Command**: `mongosh --quiet --eval "JSON.stringify(db.stats())"`

## Input Parameters

| Parameter | Type    | Default | Description                                                   |
| --------- | ------- | ------- | ------------------------------------------------------------- |
| `uri`     | string  | --      | MongoDB connection URI (e.g., mongodb://localhost:27017/mydb) |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens    |

## Success -- Database Stats

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ mongosh --quiet --eval "JSON.stringify(db.stats())"
{"db":"myapp","collections":12,"views":0,"objects":48520,"avgObjSize":284.5,"dataSize":13804220,"storageSize":6553600,"totalFreeStorageSize":1048576,"numExtents":0,"indexes":18,"indexSize":2621440,"scaleFactor":1,"fsUsedSize":107374182400,"fsTotalSize":214748364800,"ok":1}
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "db": "myapp",
  "collections": 12,
  "objects": 48520,
  "dataSize": 13804220,
  "storageSize": 6553600,
  "indexes": 18,
  "indexSize": 2621440,
  "raw": "{\"db\":\"myapp\",\"collections\":12,\"views\":0,\"objects\":48520,\"avgObjSize\":284.5,\"dataSize\":13804220,\"storageSize\":6553600,\"totalFreeStorageSize\":1048576,\"numExtents\":0,\"indexes\":18,\"indexSize\":2621440,\"scaleFactor\":1,\"fsUsedSize\":107374182400,\"fsTotalSize\":214748364800,\"ok\":1}",
  "exitCode": 0,
  "duration": 150
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
  "success": true,
  "db": "myapp",
  "collections": 12,
  "objects": 48520,
  "dataSize": 13804220,
  "storageSize": 6553600,
  "indexes": 18,
  "indexSize": 2621440,
  "exitCode": 0,
  "duration": 150
}
```

</td>
</tr>
</table>

## Error -- Connection Timeout

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~35 tokens

```
$ mongosh --quiet --eval "JSON.stringify(db.stats())" mongodb://slowhost:27017/test
MongoServerSelectionError: Server selection timed out after 30000 ms
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 30500,
  "error": "MongoServerSelectionError: Server selection timed out after 30000 ms"
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
  "duration": 30500,
  "error": "MongoServerSelectionError: Server selection timed out after 30000 ms"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Database stats     | ~120       | ~50       | ~25          | 58-79%  |
| Connection timeout | ~35        | ~20       | ~20          | 43%     |

## Notes

- Parses `db.stats()` output into individual numeric fields (`collections`, `objects`, `dataSize`, `storageSize`, `indexes`, `indexSize`)
- The `raw` field preserves the complete JSON output from MongoDB for any fields not extracted into top-level properties
- Compact mode drops the `raw` field but keeps all parsed numeric fields
- The `db` field contains the database name from the stats output
- Useful for quick health checks and capacity monitoring of MongoDB databases
