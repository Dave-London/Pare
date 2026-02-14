# github > issue-close

Closes an issue with an optional comment and reason. Returns structured data with issue number, state, and URL.

**Command**: `gh issue close 100 --reason completed --comment "Fixed in #42"`

## Input Parameters

| Parameter | Type                                    | Default | Description                          |
| --------- | --------------------------------------- | ------- | ------------------------------------ |
| `number`  | number                                  | —       | Issue number                         |
| `comment` | string                                  | —       | Closing comment                      |
| `reason`  | `"completed"` \| `"not planned"`        | —       | Close reason                         |
| `path`    | string                                  | cwd     | Repository path                      |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
✓ Closed issue #100 (Bug: login fails on Safari)
https://github.com/owner/repo/issues/100
```

</td>
<td>

~15 tokens

```json
{
  "number": 100,
  "state": "closed",
  "url": "https://github.com/owner/repo/issues/100"
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

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Issue closed | ~20        | ~15       | ~15          | 25%     |

## Notes

- The `state` in the response is always `"closed"` on success
- The `reason` parameter maps to `--reason completed` or `--reason "not planned"`
- Input validation rejects flag injection in the `comment` field
