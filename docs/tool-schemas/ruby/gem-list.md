# ruby > gem-list

Lists installed Ruby gems with version information.

**Command**: `gem list --local`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `filter`  | string  | --      | Regex filter on gem names (client-side)                    |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Gems Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
$ gem list --local

*** LOCAL GEMS ***

actioncable (7.1.3)
actionmailbox (7.1.3)
actionmailer (7.1.3)
actionpack (7.1.3)
activerecord (7.1.3)
bundler (2.5.5, 2.4.22)
nokogiri (1.16.2)
puma (6.4.2)
rails (7.1.3)
rake (13.1.0)
```

</td>
<td>

~90 tokens

```json
{
  "gems": [
    { "name": "actioncable", "versions": ["7.1.3"] },
    { "name": "actionmailbox", "versions": ["7.1.3"] },
    { "name": "actionmailer", "versions": ["7.1.3"] },
    { "name": "actionpack", "versions": ["7.1.3"] },
    { "name": "activerecord", "versions": ["7.1.3"] },
    { "name": "bundler", "versions": ["2.5.5", "2.4.22"] },
    { "name": "nokogiri", "versions": ["1.16.2"] },
    { "name": "puma", "versions": ["6.4.2"] },
    { "name": "rails", "versions": ["7.1.3"] },
    { "name": "rake", "versions": ["13.1.0"] }
  ],
  "total": 10
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
  "total": 10
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 10 gems listed | ~100       | ~90       | ~5           | 10-95%  |

## Notes

- Uses `gem list --local` to list only locally installed gems (not remote)
- Each gem entry includes a `versions` array to handle multiple installed versions (e.g., bundler with 2.5.5 and 2.4.22)
- The `filter` parameter applies a client-side regex match on gem names after retrieval
- Compact mode drops the `gems` array, keeping only the `total` count
- Token savings scale with the number of installed gems; typical Ruby environments with 100+ gems see the highest savings
