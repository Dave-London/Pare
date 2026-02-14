# python > conda

Runs conda commands (list, info, env-list) and returns structured JSON output for environment and package management.

**Command**: `conda list --json` / `conda info --json` / `conda env list --json`

## Input Parameters

| Parameter | Type                                 | Default | Description                                                |
| --------- | ------------------------------------ | ------- | ---------------------------------------------------------- |
| `action`  | `"list"` \| `"info"` \| `"env-list"` | --      | Conda action to perform (required)                         |
| `name`    | string                               | --      | Environment name (used with `list` action)                 |
| `path`    | string                               | cwd     | Working directory                                          |
| `compact` | boolean                              | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Action: list -- List Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
# packages in environment at /home/user/miniconda3:
#
# Name                    Version                   Build  Channel
ca-certificates           2024.2.2             hbcca054_0    conda-forge
certifi                   2024.2.2           pyhd8ed1ab_0    conda-forge
libffi                    3.4.2                h7f98852_5    conda-forge
numpy                     1.26.4          py312hc5e2394_0    conda-forge
openssl                   3.2.1                h0b41bf4_0    conda-forge
python                    3.12.1          hab00c5b_1_cpython    conda-forge
```

</td>
<td>

~90 tokens

```json
{
  "action": "list",
  "packages": [
    {
      "name": "ca-certificates",
      "version": "2024.2.2",
      "channel": "conda-forge",
      "buildString": "hbcca054_0"
    },
    {
      "name": "certifi",
      "version": "2024.2.2",
      "channel": "conda-forge",
      "buildString": "pyhd8ed1ab_0"
    },
    { "name": "libffi", "version": "3.4.2", "channel": "conda-forge", "buildString": "h7f98852_5" },
    {
      "name": "numpy",
      "version": "1.26.4",
      "channel": "conda-forge",
      "buildString": "py312hc5e2394_0"
    },
    {
      "name": "openssl",
      "version": "3.2.1",
      "channel": "conda-forge",
      "buildString": "h0b41bf4_0"
    },
    {
      "name": "python",
      "version": "3.12.1",
      "channel": "conda-forge",
      "buildString": "hab00c5b_1_cpython"
    }
  ],
  "total": 6,
  "environment": "base"
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
  "action": "list",
  "total": 6,
  "environment": "base"
}
```

</td>
</tr>
</table>

## Action: info -- Conda Info

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
     active environment : base
    active env location : /home/user/miniconda3
            shell level : 1
       user config file : /home/user/.condarc
 populated config files : /home/user/.condarc
          conda version : 24.1.0
    conda-build version : not installed
         python version : 3.12.1.final.0
                platform : linux-64
              user-agent : conda/24.1.0
         default prefix : /home/user/miniconda3
              channels : conda-forge, defaults
       package cache : /home/user/miniconda3/pkgs
    envs directories : /home/user/miniconda3/envs
```

</td>
<td>

~60 tokens

```json
{
  "action": "info",
  "condaVersion": "24.1.0",
  "platform": "linux-64",
  "pythonVersion": "3.12.1.final.0",
  "defaultPrefix": "/home/user/miniconda3",
  "activePrefix": "/home/user/miniconda3",
  "channels": ["conda-forge", "defaults"],
  "envsDirs": ["/home/user/miniconda3/envs"],
  "pkgsDirs": ["/home/user/miniconda3/pkgs"]
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
  "action": "info",
  "condaVersion": "24.1.0",
  "platform": "linux-64",
  "pythonVersion": "3.12.1.final.0"
}
```

</td>
</tr>
</table>

## Action: env-list -- List Environments

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
# conda environments:
#
base                  *  /home/user/miniconda3
ml-project               /home/user/miniconda3/envs/ml-project
web-api                  /home/user/miniconda3/envs/web-api
```

</td>
<td>

~55 tokens

```json
{
  "action": "env-list",
  "environments": [
    { "name": "miniconda3", "path": "/home/user/miniconda3", "active": true },
    { "name": "ml-project", "path": "/home/user/miniconda3/envs/ml-project", "active": false },
    { "name": "web-api", "path": "/home/user/miniconda3/envs/web-api", "active": false }
  ],
  "total": 3
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
  "action": "env-list",
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| list (6 packages) | ~200       | ~90       | ~10          | 55-95%  |
| info              | ~180       | ~60       | ~15          | 67-92%  |
| env-list (3 envs) | ~60        | ~55       | ~10          | 8-83%   |

## Notes

- Uses `--json` flag for all actions to get structured JSON directly from conda
- The `name` parameter is only used with the `list` action to specify a target environment
- For `env-list`, the active prefix is determined by running `conda info --json` in parallel
- The `buildString` field in packages is optional and only present when conda reports it
- Compact mode varies by action: `list` keeps total/environment, `info` keeps version/platform/python, `env-list` keeps total
