# remote > rsync

Syncs files between local and remote locations using rsync with structured transfer statistics.

**Command**: `rsync -avz --stats [--dry-run] <source> <destination>`

## Input Parameters

| Parameter      | Type     | Default | Description                                                                           |
| -------------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| `source`       | string   | --      | Source path (local path or remote user@host:path). Use trailing / to sync contents.   |
| `destination`  | string   | --      | Destination path (local path or remote user@host:path)                                |
| `dryRun`       | boolean  | `true`  | Preview what would be transferred without making changes (default: true for safety)   |
| `archive`      | boolean  | `true`  | Archive mode: preserves permissions, timestamps, symlinks (rsync -a)                  |
| `compress`     | boolean  | `true`  | Compress data during transfer (rsync -z)                                              |
| `verbose`      | boolean  | `true`  | Verbose output showing transferred files (rsync -v)                                   |
| `delete`       | boolean  | --      | Delete files in destination that don't exist in source. Use with caution!             |
| `exclude`      | string[] | --      | Patterns to exclude from sync (e.g. node_modules, .git)                               |
| `include`      | string[] | --      | Patterns to include in sync                                                            |
| `sshPort`      | number   | --      | SSH port for remote transfers                                                          |
| `identityFile` | string   | --      | SSH private key file for remote transfers                                              |
| `path`         | string   | cwd     | Working directory                                                                      |
| `compact`      | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens                             |

## Success -- Dry Run Sync

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ rsync -avz --stats --dry-run ./dist/ deploy@web01:/var/www/app/
sending incremental file list
index.html
assets/main.js
assets/style.css

Number of files: 8 (reg: 5, dir: 3)
Number of created files: 3 (reg: 3)
Number of deleted files: 0
Number of regular files transferred: 3
Total file size: 245,760 bytes
Total transferred file size: 245,760 bytes
Literal data: 0 bytes
Matched data: 0 bytes
File list size: 0
File list generation time: 0.001 seconds
File list transfer time: 0.000 seconds
Total bytes sent: 182
Total bytes received: 24

sent 182 bytes  received 24 bytes  412.00 bytes/sec
total size is 245,760  speedup is 1,192.23 (DRY RUN)
```

</td>
<td>

~60 tokens

```json
{
  "source": "./dist/",
  "destination": "deploy@web01:/var/www/app/",
  "dryRun": true,
  "success": true,
  "exitCode": 0,
  "filesTransferred": 3,
  "totalSize": "245,760",
  "speedup": "1,192.23",
  "stdout": "sending incremental file list\nindex.html\nassets/main.js\nassets/style.css\n\nNumber of files: 8 (reg: 5, dir: 3)\n...",
  "duration": 1850,
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
  "source": "./dist/",
  "destination": "deploy@web01:/var/www/app/",
  "dryRun": true,
  "success": true,
  "exitCode": 0,
  "filesTransferred": 3,
  "totalSize": "245,760",
  "speedup": "1,192.23",
  "duration": 1850,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error -- Permission Denied

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ rsync -avz --stats ./dist/ deploy@web01:/etc/
sending incremental file list
rsync: [receiver] mkstemp "/etc/.index.html.XXXXXX" failed: Permission denied (13)
rsync error: some files/attrs were not transferred (code 23) at main.c(1338)
```

</td>
<td>

~40 tokens

```json
{
  "source": "./dist/",
  "destination": "deploy@web01:/etc/",
  "dryRun": false,
  "success": false,
  "exitCode": 23,
  "stderr": "rsync: [receiver] mkstemp \"/etc/.index.html.XXXXXX\" failed: Permission denied (13)\nrsync error: some files/attrs were not transferred (code 23) at main.c(1338)",
  "duration": 2100,
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
  "source": "./dist/",
  "destination": "deploy@web01:/etc/",
  "dryRun": false,
  "success": false,
  "exitCode": 23,
  "duration": 2100,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Dry run (3 files) | ~120       | ~60       | ~25          | 50-79%  |
| Permission denied | ~40        | ~40       | ~25          | 0-38%   |

## Notes

- Defaults to `dryRun: true` for safety -- set `dryRun: false` to actually transfer files
- The `delete` flag removes destination files not present in source; use with extreme caution
- Always includes `--stats` for structured parsing of transfer statistics
- Extracted fields (`filesTransferred`, `totalSize`, `speedup`) come from the rsync stats summary
- Compact mode drops `stdout` and `stderr`, keeping the structured transfer metadata
- The `timedOut` field indicates whether the transfer was killed due to a timeout
- Use `exclude` to skip common patterns like `node_modules` or `.git` directories
