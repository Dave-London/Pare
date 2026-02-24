# deno > check

Runs `deno check` for type-checking without execution. Returns structured type errors.

**Command**: `deno check <files>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `files`   | string[] | —       | Files to type-check (at least one required)                |
| `path`    | string   | cwd     | Project root path                                          |
| `all`     | boolean  | —       | Type-check all modules including remote (--all)            |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Type Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ deno check main.ts
Check file:///home/user/main.ts
```

</td>
<td>

~10 tokens

```json
{
  "success": true,
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no errors).

</td>
</tr>
</table>

## Error — Type Errors Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ deno check main.ts
Check file:///home/user/main.ts
error: TS2322 [ERROR]: Type 'string' is not assignable to type 'number'.
  const x: number = "hello";
        ~
    at file:///home/user/main.ts:3:9

TS2304 [ERROR]: Cannot find name 'foo'.
  console.log(foo);
              ~~~
    at file:///home/user/main.ts:7:15

Found 2 errors.
```

</td>
<td>

~70 tokens

```json
{
  "success": false,
  "total": 2,
  "errors": [
    {
      "file": "main.ts",
      "line": 3,
      "column": 9,
      "code": "TS2322",
      "message": "Type 'string' is not assignable to type 'number'."
    },
    {
      "file": "main.ts",
      "line": 7,
      "column": 15,
      "code": "TS2304",
      "message": "Cannot find name 'foo'."
    }
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
  "success": false,
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| No type errors   | ~15        | ~10       | ~10          | 33%     |
| 2 type errors    | ~180       | ~70       | ~10          | 61-94%  |

## Notes

- Each error includes `file`, `line`, `column` (optional), `code` (optional, e.g. `TS2322`), and `message`
- The `all` flag enables type-checking of remote modules in addition to local ones
- The `errors` array is omitted from the response when there are no type errors
- Compact mode drops the `errors` array, keeping only `success` and `total`
