# ruby > gem-outdated

Lists outdated Ruby gems showing current and latest available versions.

**Command**: `gem outdated`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Outdated Gems Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ gem outdated
bundler (2.4.22 < 2.5.5)
nokogiri (1.15.6 < 1.16.2)
puma (6.3.1 < 6.4.2)
rack (3.0.8 < 3.0.9)
rails (7.0.8 < 7.1.3)
```

</td>
<td>

~50 tokens

```json
{
  "gems": [
    { "name": "bundler", "current": "2.4.22", "latest": "2.5.5" },
    { "name": "nokogiri", "current": "1.15.6", "latest": "1.16.2" },
    { "name": "puma", "current": "6.3.1", "latest": "6.4.2" },
    { "name": "rack", "current": "3.0.8", "latest": "3.0.9" },
    { "name": "rails", "current": "7.0.8", "latest": "7.1.3" }
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

~5 tokens

```json
{
  "total": 5
}
```

</td>
</tr>
</table>

## Success -- All Gems Up to Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~3 tokens

```
$ gem outdated

```

</td>
<td>

~5 tokens

```json
{
  "gems": [],
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~3 tokens

```json
{
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 5 outdated gems    | ~50        | ~50       | ~5           | 0-90%   |
| All up to date     | ~3         | ~5        | ~3           | 0%      |

## Notes

- Each gem entry includes `name`, `current` version, and `latest` available version
- Compact mode drops the `gems` array, keeping only the `total` count
- Token savings scale with the number of outdated gems
- An empty `gems` array (total: 0) indicates all gems are up to date
