# npm > search

Searches the npm registry for packages matching a query. Always uses npm (pnpm and yarn do not have a search command).

**Command**: `npm search <query> --json --searchlimit=20`

## Input Parameters

| Parameter | Type    | Default      | Description                                                                           |
| --------- | ------- | ------------ | ------------------------------------------------------------------------------------- |
| `query`   | string  | _(required)_ | Search query string                                                                   |
| `path`    | string  | cwd          | Project root path                                                                     |
| `limit`   | number  | `20`         | Maximum number of results to return                                                   |
| `compact` | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens. Set false for full schema |

## Success — Packages Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
NAME          DESCRIPTION                                     AUTHOR     DATE       VERSION
express       Fast, unopinionated, minimalist web framework   =dougwi... 2025-01-15 5.0.1
koa           Expressive HTTP middleware framework for node    =dead-ho.. 2024-11-20 2.15.3
fastify       Fast and low overhead web framework             =matteo... 2025-02-01 5.2.1
hapi          Server framework for Node.js                    =hueniv... 2024-08-10 21.3.3
restify       REST framework for Node.js                      =yunong    2024-06-22 11.1.0
```

</td>
<td>

~100 tokens

```json
{
  "packageManager": "npm",
  "packages": [
    {
      "name": "express",
      "version": "5.0.1",
      "description": "Fast, unopinionated, minimalist web framework",
      "author": "dougwilson",
      "date": "2025-01-15"
    },
    {
      "name": "koa",
      "version": "2.15.3",
      "description": "Expressive HTTP middleware framework for node",
      "author": "dead-horse",
      "date": "2024-11-20"
    },
    {
      "name": "fastify",
      "version": "5.2.1",
      "description": "Fast and low overhead web framework",
      "author": "matteo.collina",
      "date": "2025-02-01"
    },
    {
      "name": "hapi",
      "version": "21.3.3",
      "description": "Server framework for Node.js",
      "author": "hueniverse",
      "date": "2024-08-10"
    },
    {
      "name": "restify",
      "version": "11.1.0",
      "description": "REST framework for Node.js",
      "author": "yunong",
      "date": "2024-06-22"
    }
  ],
  "total": 5
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~75 tokens — drops `author` and `date` fields.

```json
{
  "packages": [
    {
      "name": "express",
      "version": "5.0.1",
      "description": "Fast, unopinionated, minimalist web framework"
    },
    {
      "name": "koa",
      "version": "2.15.3",
      "description": "Expressive HTTP middleware framework for node"
    },
    {
      "name": "fastify",
      "version": "5.2.1",
      "description": "Fast and low overhead web framework"
    },
    {
      "name": "hapi",
      "version": "21.3.3",
      "description": "Server framework for Node.js"
    },
    {
      "name": "restify",
      "version": "11.1.0",
      "description": "REST framework for Node.js"
    }
  ],
  "total": 5
}
```

</td>
</tr>
</table>

## Success — No Results

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
No matches found for "xyznonexistentpackage123"
```

</td>
<td>

~10 tokens

```json
{
  "packageManager": "npm",
  "packages": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| 5 results  | ~200       | ~100      | ~75          | 50–63%  |
| No results | ~10        | ~10       | ~10          | 0%      |

## Notes

- This tool always uses npm regardless of the detected package manager, because pnpm and yarn do not have a `search` command
- The `limit` parameter maps to `--searchlimit=<value>` in the npm CLI
- Compact mode drops `author` and `date` fields from each package entry
- The `author` field is extracted from either `author.name` (object form) or `author` (string form) in the npm registry response
- The `date` field reflects the last publish date of the package
