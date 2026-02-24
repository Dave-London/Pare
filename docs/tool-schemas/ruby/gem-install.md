# ruby > gem-install

Installs a Ruby gem using `gem install` and returns structured output with success status and duration.

**Command**: `gem install <gem> [--version <version>]`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `gem`     | string  | --      | Name of the gem to install                                 |
| `version` | string  | --      | Specific version to install (e.g., '1.2.3')                |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Gem Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ gem install nokogiri
Fetching nokogiri-1.16.2-x86_64-linux.gem
Successfully installed nokogiri-1.16.2-x86_64-linux
Parsing documentation for nokogiri-1.16.2-x86_64-linux
Installing ri documentation for nokogiri-1.16.2-x86_64-linux
Done installing documentation for nokogiri after 3 seconds
1 gem installed
```

</td>
<td>

~35 tokens

```json
{
  "gem": "nokogiri",
  "success": true,
  "exitCode": 0,
  "stdout": "Fetching nokogiri-1.16.2-x86_64-linux.gem\nSuccessfully installed nokogiri-1.16.2-x86_64-linux\nParsing documentation for nokogiri-1.16.2-x86_64-linux\nInstalling ri documentation for nokogiri-1.16.2-x86_64-linux\nDone installing documentation for nokogiri after 3 seconds\n1 gem installed",
  "duration": 8500
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~12 tokens

```json
{
  "gem": "nokogiri",
  "success": true,
  "exitCode": 0,
  "duration": 8500
}
```

</td>
</tr>
</table>

## Error -- Gem Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ gem install nonexistent-gem-xyz
ERROR:  Could not find a valid gem 'nonexistent-gem-xyz' (>= 0) in any repository
```

</td>
<td>

~25 tokens

```json
{
  "gem": "nonexistent-gem-xyz",
  "success": false,
  "exitCode": 2,
  "stderr": "ERROR:  Could not find a valid gem 'nonexistent-gem-xyz' (>= 0) in any repository",
  "duration": 3200
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~12 tokens

```json
{
  "gem": "nonexistent-gem-xyz",
  "success": false,
  "exitCode": 2,
  "duration": 3200
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Gem installed | ~40        | ~35       | ~12          | 13-70%  |
| Gem not found | ~20        | ~25       | ~12          | 0-40%   |

## Notes

- The `version` parameter maps to `--version` for pinning a specific gem version
- Compact mode drops `stdout` and `stderr`, keeping only `gem`, `success`, `exitCode`, and `duration`
- Native extension compilation (e.g., nokogiri) can significantly increase `duration`
- Token savings are moderate since gem install output is already relatively concise
