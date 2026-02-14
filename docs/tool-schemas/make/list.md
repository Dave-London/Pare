# make > list

Lists available make or just targets with optional descriptions. Auto-detects make vs just.

**Command**: `make -pRrq :` / `just --list`

## Input Parameters

| Parameter | Type                                    | Default  | Description                                                |
| --------- | --------------------------------------- | -------- | ---------------------------------------------------------- |
| `path`    | string                                  | cwd      | Project root path                                          |
| `tool`    | `"auto"` \| `"make"` \| `"just"`       | `"auto"` | Task runner to use; "auto" detects from files              |
| `compact` | boolean                                 | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Just Targets with Descriptions

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~55 tokens

```
Available recipes:
    build  # Build the project
    test   # Run tests
    lint   # Run linter
    clean  # Remove build artifacts
    deploy # Deploy to production
```

</td>
<td>

~65 tokens

```json
{
  "targets": [
    { "name": "build", "description": "Build the project" },
    { "name": "test", "description": "Run tests" },
    { "name": "lint", "description": "Run linter" },
    { "name": "clean", "description": "Remove build artifacts" },
    { "name": "deploy", "description": "Deploy to production" }
  ],
  "total": 5,
  "tool": "just"
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
  "total": 5,
  "tool": "just"
}
```

</td>
</tr>
</table>

## Success — Make Targets

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~800 tokens

```
$ make -pRrq :
# GNU Make 4.3
# ... (hundreds of lines of make database output)
# Files
build: src/main.c src/utils.c
test: build
clean:
install: build
all: build test
# ... (continued database output)
```

</td>
<td>

~50 tokens

```json
{
  "targets": [
    { "name": "build" },
    { "name": "test" },
    { "name": "clean" },
    { "name": "install" },
    { "name": "all" }
  ],
  "total": 5,
  "tool": "make"
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
  "total": 5,
  "tool": "make"
}
```

</td>
</tr>
</table>

## Error — No Targets Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
make: *** No targets specified and no makefile found. Stop.
```

</td>
<td>

~15 tokens

```json
{
  "targets": [],
  "total": 0,
  "tool": "make"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                    | CLI Tokens | Pare Full | Pare Compact | Savings   |
| --------------------------- | ---------- | --------- | ------------ | --------- |
| Just targets (5 with desc.) | ~55        | ~65       | ~10          | 82%*      |
| Make targets (5 targets)    | ~800       | ~50       | ~10          | 94–99%    |
| No targets found            | ~30        | ~15       | ~15          | 50%       |

\* Just list output is already concise; full Pare response is slightly larger due to JSON structure, but compact mode still provides significant savings. The real savings come from make, where `make -pRrq` outputs the entire internal database (often hundreds of lines) while Pare extracts just the target names.

## Notes

- For `just`, targets and descriptions are parsed from the `just --list` output (`name # description` format)
- For `make`, targets are extracted from the `make -pRrq` database dump by matching lines with `^[a-zA-Z0-9_][a-zA-Z0-9_.\-/]*:` pattern
- Built-in/special targets (starting with `.`), `Makefile`, and `makefile` are excluded from make results
- Make targets do not include descriptions since Makefile syntax does not support them natively
- Compact mode drops all individual target details, keeping only `total` and `tool`
- Tool auto-detection checks for `justfile` (just) or `Makefile`/`makefile`/`GNUmakefile` (make)
