# infra > ansible-inventory

Queries Ansible inventory for hosts, groups, and variables. Returns structured JSON for --list or tree text for --graph.

**Command**: `ansible-inventory [--list|--graph|--host]`

## Input Parameters

| Parameter   | Type    | Default | Description                                                |
| ----------- | ------- | ------- | ---------------------------------------------------------- |
| `inventory` | string  | --      | Inventory file or host list (-i)                           |
| `graph`     | boolean | --      | Show inventory graph (--graph) instead of JSON list        |
| `host`      | string  | --      | Show variables for a specific host (--host)                |
| `vars`      | boolean | --      | Show host variables in graph mode (--vars)                 |
| `path`      | string  | cwd     | Project root path                                          |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Groups

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
{
  "_meta": {
    "hostvars": {
      "web1.example.com": {"ansible_host": "192.168.1.10"},
      "web2.example.com": {"ansible_host": "192.168.1.11"},
      "db1.example.com": {"ansible_host": "192.168.1.20"}
    }
  },
  "all": {
    "children": ["ungrouped", "webservers", "databases"]
  },
  "webservers": {
    "hosts": ["web1.example.com", "web2.example.com"]
  },
  "databases": {
    "hosts": ["db1.example.com"]
  }
}
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "groups": [
    { "name": "all", "hosts": [], "children": ["ungrouped", "webservers", "databases"] },
    { "name": "webservers", "hosts": ["web1.example.com", "web2.example.com"] },
    { "name": "databases", "hosts": ["db1.example.com"] }
  ]
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

## Success — Graph Mode

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
@all:
  |--@webservers:
  |  |--web1.example.com
  |  |--web2.example.com
  |--@databases:
  |  |--db1.example.com
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "graph": "@all:\n  |--@webservers:\n  |  |--web1.example.com\n  |  |--web2.example.com\n  |--@databases:\n  |  |--db1.example.com"
}
```

</td>
</tr>
</table>

## Success — Host Variables

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
{
  "ansible_host": "192.168.1.10",
  "ansible_user": "deploy",
  "http_port": 8080
}
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "hostDetail": {
    "name": "web1.example.com",
    "vars": { "ansible_host": "192.168.1.10", "ansible_user": "deploy", "http_port": 8080 }
  }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| List 3 groups  | ~400       | ~100      | ~10          | 75-98%  |
| Graph mode     | ~100       | ~40       | ~10          | 60-90%  |
| Host variables | ~100       | ~40       | ~10          | 60-90%  |

## Notes

- Default mode uses `--list` to get structured JSON inventory data
- The `graph` flag uses `--graph` for tree-formatted inventory visualization
- The `host` flag uses `--host` to get variables for a single host
- The `vars` flag adds `--vars` to include host variables in graph mode
- Groups include `name`, `hosts`, optional `children`, and optional `vars`
- Compact mode drops `groups`, `graph`, and `hostDetail`, keeping only `success` and `exitCode`
