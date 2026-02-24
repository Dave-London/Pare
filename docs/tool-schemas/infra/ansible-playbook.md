# infra > ansible-playbook

Runs an Ansible playbook and returns structured play recap with per-host results.

**Command**: `ansible-playbook <playbook>`

## Input Parameters

| Parameter     | Type    | Default | Description                                                 |
| ------------- | ------- | ------- | ----------------------------------------------------------- |
| `playbook`    | string  | --      | Path to playbook file (required)                            |
| `inventory`   | string  | --      | Inventory file or host list (-i)                            |
| `limit`       | string  | --      | Limit to specific hosts or groups (--limit)                 |
| `tags`        | string  | --      | Only run plays and tasks tagged with these values (--tags)  |
| `skipTags`    | string  | --      | Skip plays and tasks tagged with these values (--skip-tags) |
| `extraVars`   | string  | --      | Extra variables as key=value or JSON string (-e)            |
| `check`       | boolean | --      | Run in check mode / dry-run (-C)                            |
| `syntaxCheck` | boolean | --      | Perform a syntax check on the playbook (--syntax-check)     |
| `listTasks`   | boolean | --      | List all tasks that would be executed (--list-tasks)        |
| `listTags`    | boolean | --      | List all available tags (--list-tags)                       |
| `forks`       | number  | --      | Number of parallel processes (-f)                           |
| `verbose`     | number  | --      | Verbosity level 0-4 (-v through -vvvv)                      |
| `path`        | string  | cwd     | Project root path                                           |
| `compact`     | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens  |

## Success — Playbook Run

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~500 tokens

```
PLAY [Configure web servers] ***************************************************

TASK [Gathering Facts] *********************************************************
ok: [web1.example.com]
ok: [web2.example.com]

TASK [Install nginx] ***********************************************************
changed: [web1.example.com]
changed: [web2.example.com]

TASK [Copy config] *************************************************************
changed: [web1.example.com]
ok: [web2.example.com]

PLAY RECAP *********************************************************************
web1.example.com           : ok=3    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
web2.example.com           : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "plays": [
    {
      "name": "Configure web servers",
      "hosts": ["web1.example.com", "web2.example.com"],
      "taskCount": 3
    }
  ],
  "recap": [
    {
      "host": "web1.example.com",
      "ok": 3,
      "changed": 2,
      "unreachable": 0,
      "failed": 0,
      "skipped": 0,
      "rescued": 0,
      "ignored": 0
    },
    {
      "host": "web2.example.com",
      "ok": 3,
      "changed": 1,
      "unreachable": 0,
      "failed": 0,
      "skipped": 0,
      "rescued": 0,
      "ignored": 0
    }
  ],
  "duration": "12.45s"
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
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error — Playbook Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~400 tokens

```
PLAY [Configure database] ******************************************************

TASK [Gathering Facts] *********************************************************
ok: [db1.example.com]

TASK [Install postgresql] ******************************************************
fatal: [db1.example.com]: FAILED! => {"changed": false, "msg": "No package matching 'postgresql-99' found available, installed or updated"}

PLAY RECAP *********************************************************************
db1.example.com            : ok=1    changed=0    unreachable=0    failed=1    skipped=0    rescued=0    ignored=0
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "exitCode": 2,
  "plays": [{ "name": "Configure database", "hosts": ["db1.example.com"], "taskCount": 2 }],
  "recap": [
    {
      "host": "db1.example.com",
      "ok": 1,
      "changed": 0,
      "unreachable": 0,
      "failed": 1,
      "skipped": 0,
      "rescued": 0,
      "ignored": 0
    }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| 2-host playbook  | ~500       | ~120      | ~10          | 76-98%  |
| Playbook failure | ~400       | ~80       | ~10          | 80-98%  |

## Notes

- Parses the `PLAY RECAP` section for per-host result counts (ok, changed, unreachable, failed, skipped, rescued, ignored)
- Plays include `name`, `hosts`, and `taskCount` parsed from the playbook output
- The `check` flag runs in dry-run mode without making actual changes
- The `syntaxCheck` flag validates playbook syntax without executing it
- The `listTasks` and `listTags` flags return task/tag lists instead of executing
- The `forks` parameter controls parallelism (default is typically 5)
- Compact mode drops `plays`, `recap`, `duration`, `taskList`, and `tagList`
