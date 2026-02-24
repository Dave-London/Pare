# nix > flake-show

Shows the outputs of a Nix flake as a structured tree. Uses `--json` for machine-parseable output by default.

**Command**: `nix flake show <flakeRef> [--json]`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `flakeRef` | string  | `"."`   | Flake reference (defaults to `.`)                          |
| `json`     | boolean | `true`  | Use `--json` for machine-parseable output                  |
| `path`     | string  | cwd     | Project root path                                          |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Show Flake Outputs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ nix flake show --json
{
  "packages": {
    "x86_64-linux": {
      "default": {
        "type": "derivation",
        "name": "myapp-1.0.0"
      }
    }
  },
  "devShells": {
    "x86_64-linux": {
      "default": {
        "type": "derivation",
        "name": "nix-shell"
      }
    }
  },
  "checks": {
    "x86_64-linux": {
      "tests": {
        "type": "derivation",
        "name": "myapp-tests"
      }
    }
  }
}
```

</td>
<td>

~130 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "outputs": {
    "packages": {
      "x86_64-linux": {
        "default": { "type": "derivation", "name": "myapp-1.0.0" }
      }
    },
    "devShells": {
      "x86_64-linux": {
        "default": { "type": "derivation", "name": "nix-shell" }
      }
    },
    "checks": {
      "x86_64-linux": {
        "tests": { "type": "derivation", "name": "myapp-tests" }
      }
    }
  },
  "duration": 1200,
  "timedOut": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "success": true,
  "outputCategories": ["packages", "devShells", "checks"],
  "duration": 1200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Not a Flake

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ nix flake show --json
error: path '/home/user/project' is not a flake (because it doesn't contain a 'flake.nix' file)
```

</td>
<td>

~45 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "errors": [
    "path '/home/user/project' is not a flake (because it doesn't contain a 'flake.nix' file)"
  ],
  "duration": 350,
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
  "success": false,
  "outputCategories": [],
  "duration": 350,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------- | ---------- | --------- | ------------ | ------- |
| Show flake  | ~200       | ~130      | ~35          | 35-83%  |
| Not a flake | ~60        | ~45       | ~25          | 25-58%  |

## Notes

- Uses `--json` by default for machine-parseable output; the JSON tree is passed through as `outputs`
- The `outputs` field is a `Record<string, unknown>` representing the flake's output tree (packages, devShells, checks, etc.)
- When JSON parsing fails (e.g. non-JSON mode), `outputs` is undefined
- Errors are extracted from stderr lines starting with `error:`
- Compact mode replaces the full `outputs` tree with just `outputCategories` (top-level keys), significantly reducing tokens for large flakes
