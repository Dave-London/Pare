# cargo > doc

Generates Rust documentation and returns structured output with warning count.

**Command**: `cargo doc`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `open`    | boolean | `false` | Open docs in browser after generating                      |
| `noDeps`  | boolean | `false` | Skip building documentation for dependencies (--no-deps)   |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Documentation

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
 Documenting my-app v0.1.0 (/home/user/my-app)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.20s
   Generated /home/user/my-app/target/doc/my_app/index.html
```

</td>
<td>

~10 tokens

```json
{
  "success": true,
  "warnings": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Success — With Documentation Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
 Documenting my-app v0.1.0 (/home/user/my-app)
warning: missing documentation for a function
  --> src/lib.rs:10:1
   |
10 | pub fn process_data(input: &str) -> String {
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unresolved link to `Config`
  --> src/lib.rs:5:15
   |
5  | /// See [`Config`] for details.
   |          ^^^^^^^^ no item named `Config` in scope

warning: `my-app` (lib) generated 2 warnings
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.20s
```

</td>
<td>

~10 tokens

```json
{
  "success": true,
  "warnings": 2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| Clean docs     | ~100       | ~10       | ~10          | 90%     |
| 2 doc warnings | ~300       | ~10       | ~10          | 97%     |

## Notes

- Parses `warning:` and `warning[` lines from stderr, excluding the summary line (`N warnings emitted`)
- The `noDeps` flag adds `--no-deps` to skip generating docs for dependencies (faster)
- The `open` flag adds `--open` to launch the generated docs in a browser
- Output is always minimal (just success + warning count) so compact mode has no additional effect
- Does not capture individual warning details -- only the total count
