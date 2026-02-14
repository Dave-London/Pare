# docker > build

Builds a Docker image and returns structured build results including image ID, duration, and errors. Use instead of running `docker build` in the terminal.

**Command**: `docker build . [-t tag] [-f Dockerfile] [args...]`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Build context path                                         |
| `tag`     | string   | ---     | Image tag (e.g., myapp:latest)                             |
| `file`    | string   | ---     | Dockerfile path (default: Dockerfile)                      |
| `args`    | string[] | `[]`    | Additional build arguments                                 |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Build Completed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 512B done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:20-slim
#2 DONE 1.2s

#3 [1/4] FROM docker.io/library/node:20-slim@sha256:abc123
#3 DONE 0.0s

#4 [2/4] WORKDIR /app
#4 DONE 0.1s

#5 [3/4] COPY package*.json ./
#5 DONE 0.1s

#6 [4/4] RUN npm ci --production
#6 DONE 8.3s

#7 exporting to image
#7 writing image sha256:d4e5f6a7b8c9 done
#7 naming to docker.io/library/myapp:latest done
#7 DONE 0.2s
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "imageId": "d4e5f6a7b8c9",
  "duration": 10.2,
  "steps": 7,
  "errors": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": true,
  "imageId": "d4e5f6a7b8c9",
  "duration": 10.2,
  "errorCount": 0
}
```

</td>
</tr>
</table>

## Error — Build Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
#1 [internal] load build definition from Dockerfile
#1 DONE 0.0s

#2 [1/3] FROM docker.io/library/node:20-slim
#2 DONE 0.0s

#3 [2/3] COPY . .
#3 DONE 0.1s

#4 [3/3] RUN npm run build
#4 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
error: Could not find tsconfig.json
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "duration": 3.5,
  "steps": 4,
  "errors": [
    "error: Could not find tsconfig.json"
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| 7-step build | ~350       | ~30       | ~20          | 91-94%  |
| Build failed | ~200       | ~30       | ~20          | 85-90%  |

## Notes

- The image ID is extracted from the build output (`writing image sha256:...`) and truncated to 12 characters
- Build step count is inferred from numbered step markers (`#N`) in the output
- Error lines are extracted by matching lines containing `error`/`ERROR`/`Error`, excluding build step references
- Duration is measured client-side in seconds with one decimal place
- Compact mode replaces the `errors` array with an `errorCount` number
