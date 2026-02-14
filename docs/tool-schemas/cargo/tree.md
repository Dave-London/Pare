# cargo > tree

Displays the dependency tree for a Rust project with unique package count.

**Command**: `cargo tree`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `depth`   | number  | --      | Maximum depth of the dependency tree to display            |
| `package` | string  | --      | Focus on a specific package in the tree                    |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Dependency Tree

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
my-app v0.1.0 (/home/user/my-app)
├── serde v1.0.217
│   ├── serde_derive v1.0.217 (proc-macro)
│   │   ├── proc-macro2 v1.0.92
│   │   ├── quote v1.0.37
│   │   └── syn v2.0.90
│   └── serde v1.0.217
├── tokio v1.42.0
│   ├── bytes v1.9.0
│   ├── mio v1.0.3
│   └── pin-project-lite v0.2.15
└── clap v4.5.23
    ├── clap_builder v4.5.23
    └── clap_derive v4.5.18
```

</td>
<td>

~220 tokens

```json
{
  "tree": "my-app v0.1.0 (/home/user/my-app)\n├── serde v1.0.217\n│   ├── serde_derive v1.0.217 (proc-macro)\n│   │   ├── proc-macro2 v1.0.92\n│   │   ├── quote v1.0.37\n│   │   └── syn v2.0.90\n│   └── serde v1.0.217\n├── tokio v1.42.0\n│   ├── bytes v1.9.0\n│   ├── mio v1.0.3\n│   └── pin-project-lite v0.2.15\n└── clap v4.5.23\n    ├── clap_builder v4.5.23\n    └── clap_derive v4.5.18",
  "packages": 12
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "packages": 12
}
```

</td>
</tr>
</table>

## Success — With Depth Limit

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
my-app v0.1.0 (/home/user/my-app)
├── serde v1.0.217
├── tokio v1.42.0
└── clap v4.5.23
```

</td>
<td>

~50 tokens

```json
{
  "tree": "my-app v0.1.0 (/home/user/my-app)\n├── serde v1.0.217\n├── tokio v1.42.0\n└── clap v4.5.23",
  "packages": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| Full tree (12 deps) | ~200       | ~220      | ~5           | 0-98%   |
| Depth-limited tree  | ~80        | ~50       | ~5           | 38-94%  |

## Notes

- The `depth` parameter maps to `--depth N` to limit tree traversal depth
- The `package` parameter uses `-p` to focus on a specific crate in the tree
- Full mode includes the complete tree text as a string -- may be larger than CLI output due to JSON encoding
- Compact mode drops the tree text entirely, keeping only the unique package count
- Unique packages are counted by matching `name vN.N.N` patterns in the tree output
- Throws an error if `cargo tree` returns a non-zero exit code
