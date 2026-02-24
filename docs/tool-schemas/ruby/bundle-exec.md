# ruby > bundle-exec

Executes a command in the context of the Gemfile bundle using `bundle exec` and returns structured output.

**Command**: `bundle exec <command> [args...]`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `command` | string   | --      | Command to execute in the bundle context (e.g., 'rake', 'rspec', 'rubocop') |
| `args`    | string[] | `[]`    | Arguments to pass to the command                           |
| `path`    | string   | cwd     | Working directory                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Running RSpec

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ bundle exec rspec --format progress
.......

Finished in 1.23 seconds (files took 0.82 seconds to load)
7 examples, 0 failures
```

</td>
<td>

~40 tokens

```json
{
  "command": "rspec",
  "success": true,
  "exitCode": 0,
  "stdout": ".......\n\nFinished in 1.23 seconds (files took 0.82 seconds to load)\n7 examples, 0 failures",
  "duration": 2150,
  "timedOut": false
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
  "command": "rspec",
  "success": true,
  "exitCode": 0,
  "duration": 2150,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error -- Command Not Found in Bundle

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ bundle exec nonexistent
bundler: command not found: nonexistent
Install missing gem executables with `bundle install`
```

</td>
<td>

~25 tokens

```json
{
  "command": "nonexistent",
  "success": false,
  "exitCode": 127,
  "stderr": "bundler: command not found: nonexistent\nInstall missing gem executables with `bundle install`",
  "duration": 380,
  "timedOut": false
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
  "command": "nonexistent",
  "success": false,
  "exitCode": 127,
  "duration": 380,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| RSpec passing        | ~60        | ~40       | ~15          | 33-75%  |
| Command not found    | ~20        | ~25       | ~15          | 0-25%   |

## Notes

- Runs the command within the bundle context, ensuring the correct gem versions from Gemfile.lock are used
- Common commands: `rake`, `rspec`, `rubocop`, `rails`, `puma`
- The `timedOut` field indicates whether the command was killed due to a timeout
- Compact mode drops `stdout` and `stderr`, keeping `command`, `success`, `exitCode`, `duration`, and `timedOut`
- Token savings scale with the verbosity of the executed command's output
