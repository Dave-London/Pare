# ruby > bundle-install

Installs Gemfile dependencies using `bundle install` and returns structured output with success status and duration.

**Command**: `bundle install`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Dependencies Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ bundle install
Fetching gem metadata from https://rubygems.org/..........
Resolving dependencies...
Using rake 13.1.0
Using bundler 2.5.5
Using concurrent-ruby 1.2.3
Using i18n 1.14.1
Using minitest 5.22.2
Using tzinfo 2.0.6
Using activesupport 7.1.3
Using rack 3.0.9
Using puma 6.4.2
Using rails 7.1.3
Bundle complete! 5 Gemfile dependencies, 10 gems now installed.
Use `bundle info [gemname]` to see where a bundled gem is installed.
```

</td>
<td>

~60 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "Fetching gem metadata from https://rubygems.org/..........\nResolving dependencies...\nUsing rake 13.1.0\nUsing bundler 2.5.5\nUsing concurrent-ruby 1.2.3\nUsing i18n 1.14.1\nUsing minitest 5.22.2\nUsing tzinfo 2.0.6\nUsing activesupport 7.1.3\nUsing rack 3.0.9\nUsing puma 6.4.2\nUsing rails 7.1.3\nBundle complete! 5 Gemfile dependencies, 10 gems now installed.",
  "duration": 12500
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
  "duration": 12500
}
```

</td>
</tr>
</table>

## Error -- Gemfile Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ bundle install
Could not locate Gemfile
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "exitCode": 10,
  "stderr": "Could not locate Gemfile",
  "duration": 50
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
  "success": false,
  "exitCode": 10,
  "duration": 50
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 10 gems installed | ~120       | ~60       | ~10          | 50-92%  |
| Gemfile not found | ~15        | ~15       | ~10          | 0-33%   |

## Notes

- Compact mode drops `stdout` and `stderr`, keeping only `success`, `exitCode`, and `duration`
- Token savings scale with the number of gems being installed; large Gemfiles with 50+ dependencies see the highest savings
- The `duration` field reflects total install time including network fetches and native compilation
