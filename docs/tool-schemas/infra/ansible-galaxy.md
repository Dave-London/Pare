# infra > ansible-galaxy

Installs or lists Ansible collections and roles from Galaxy or a requirements file.

**Command**: `ansible-galaxy <collection|role> <install|list>`

## Input Parameters

| Parameter      | Type    | Default | Description                                                       |
| -------------- | ------- | ------- | ----------------------------------------------------------------- |
| `action`       | enum    | --      | Galaxy action: collection-install, role-install, collection-list, role-list |
| `name`         | string  | --      | Collection or role name to install (e.g. community.general)       |
| `requirements` | string  | --      | Path to requirements file (-r)                                    |
| `force`        | boolean | --      | Force overwriting an existing collection or role (--force)        |
| `path`         | string  | cwd     | Project root path                                                 |
| `compact`      | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens        |

## Success — Install Collection

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
Starting galaxy collection install process
Process install dependency map
Starting collection install process
Downloading https://galaxy.ansible.com/download/community-general-8.3.0.tar.gz to /home/user/.ansible/tmp/ansible-local-12345/
Installing 'community.general:8.3.0' to '/home/user/.ansible/collections/ansible_collections/community/general'
community.general:8.3.0 was installed successfully
Downloading https://galaxy.ansible.com/download/ansible-posix-1.5.4.tar.gz to /home/user/.ansible/tmp/ansible-local-12345/
Installing 'ansible.posix:1.5.4' to '/home/user/.ansible/collections/ansible_collections/ansible/posix'
ansible.posix:1.5.4 was installed successfully
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "action": "collection-install",
  "installed": [
    { "name": "community.general", "version": "8.3.0" },
    { "name": "ansible.posix", "version": "1.5.4" }
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
  "exitCode": 0,
  "action": "collection-install"
}
```

</td>
</tr>
</table>

## Success — List Collections

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
Collection        Version
----------------- -------
amazon.aws        7.2.0
ansible.posix     1.5.4
community.general 8.3.0
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "action": "collection-list",
  "items": [
    { "name": "amazon.aws", "version": "7.2.0" },
    { "name": "ansible.posix", "version": "1.5.4" },
    { "name": "community.general", "version": "8.3.0" }
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
  "exitCode": 0,
  "action": "collection-list"
}
```

</td>
</tr>
</table>

## Error — Install Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~100 tokens

```
ERROR! Failed to resolve the requested dependencies map. Could not satisfy the following requirements:
* nonexistent.collection:>=1.0.0 (dependency of the user requirement)
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "action": "collection-install",
  "error": "Failed to resolve the requested dependencies map."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------------- | ---------- | --------- | ------------ | ------- |
| Install 2 collections   | ~200       | ~50       | ~10          | 75-95%  |
| List 3 collections      | ~150       | ~50       | ~10          | 67-93%  |
| Install failure         | ~100       | ~20       | ~20          | 80%     |

## Notes

- The `action` parameter determines the operation: `collection-install`, `role-install`, `collection-list`, `role-list`
- The `name` parameter specifies a single collection or role (e.g. `community.general`)
- The `requirements` parameter uses `-r` to install from a requirements file
- The `force` flag uses `--force` to overwrite existing installations
- Install actions return `installed` with name/version; list actions return `items` with name/version
- Compact mode drops `installed`, `items`, and `duration`, keeping only `success`, `exitCode`, and `action`
- Names and requirements paths are validated against flag injection
