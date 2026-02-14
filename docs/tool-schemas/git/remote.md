# git > remote

Lists remote repositories with fetch and push URLs. Returns structured remote data.

**Command**: `git remote -v`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
origin	git@github.com:user/repo.git (fetch)
origin	git@github.com:user/repo.git (push)
upstream	git@github.com:org/repo.git (fetch)
upstream	git@github.com:org/repo.git (push)
```

</td>
<td>

~50 tokens

```json
{
  "remotes": [
    {
      "name": "origin",
      "fetchUrl": "git@github.com:user/repo.git",
      "pushUrl": "git@github.com:user/repo.git"
    },
    {
      "name": "upstream",
      "fetchUrl": "git@github.com:org/repo.git",
      "pushUrl": "git@github.com:org/repo.git"
    }
  ],
  "total": 2
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
  "remotes": ["origin", "upstream"],
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------- | ---------- | --------- | ------------ | ------- |
| 2 remotes   | ~60        | ~50       | ~15          | 17-75%  |

## Notes

- Fetch and push URLs are grouped per remote (git shows them as separate lines)
- Compact mode reduces remotes to a simple string array of names
- Returns an empty `remotes` array when no remotes are configured
