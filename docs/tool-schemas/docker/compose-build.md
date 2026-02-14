# docker > compose-build

Builds Docker Compose service images and returns structured per-service build status. Use instead of running `docker compose build` in the terminal.

**Command**: `docker compose build [--no-cache] [--pull] [--build-arg KEY=VALUE] [services...]`

## Input Parameters

| Parameter   | Type                | Default | Description                                                     |
| ----------- | ------------------- | ------- | --------------------------------------------------------------- |
| `path`      | string              | cwd     | Directory containing docker-compose.yml                         |
| `services`  | string[]            | `[]`    | Specific services to build (default: all)                       |
| `noCache`   | boolean             | `false` | Do not use cache when building images                           |
| `pull`      | boolean             | `false` | Always pull a newer version of the base image                   |
| `buildArgs` | Record<string, string> | `{}`  | Build arguments as key-value pairs (e.g., `{NODE_ENV: "production"}`) |
| `compact`   | boolean             | `true`  | Auto-compact when structured output exceeds raw CLI tokens      |

## Success — Services Built

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
[+] Building 15.2s (12/12) FINISHED
 => [web internal] load build definition from Dockerfile
 => [web 1/4] FROM node:20-slim
 => [web 2/4] WORKDIR /app
 => [web 3/4] COPY package*.json ./
 => [web 4/4] RUN npm ci
 => [api internal] load build definition from Dockerfile
 => [api 1/3] FROM python:3.12-slim
 => [api 2/3] COPY requirements.txt .
 => [api 3/3] RUN pip install -r requirements.txt
 ✔ Service web Built
 ✔ Service api Built
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "services": [
    { "service": "web", "success": true },
    { "service": "api", "success": true }
  ],
  "built": 2,
  "failed": 0,
  "duration": 15.2
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
  "built": 2,
  "failed": 0,
  "duration": 15.2
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

~250 tokens

```
[+] Building 5.3s (6/8)
 => [web 1/4] FROM node:20-slim
 => [web 2/4] WORKDIR /app
 => [web 3/4] COPY package*.json ./
 => [web 4/4] RUN npm ci
 => ERROR: Service 'web' failed to build: exit code 1
```

</td>
<td>

~40 tokens

```json
{
  "success": false,
  "services": [
    { "service": "web", "success": false, "error": "ERROR: Service 'web' failed to build: exit code 1" }
  ],
  "built": 0,
  "failed": 1,
  "duration": 5.3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 2 services built   | ~400       | ~40       | ~20          | 90-95%  |
| 1 service failed   | ~250       | ~40       | ~20          | 84-92%  |

## Notes

- Service names are detected from multiple patterns: `Service <name> Built`, build step markers `[<name> ...]`, and `Building <name>` lines
- Duration is measured client-side in seconds
- The `buildArgs` parameter maps to `--build-arg KEY=VALUE` flags; both keys and values are validated against injection
- Compact mode drops the per-service `services` array, keeping only aggregate `built`, `failed`, `success`, and `duration`
- Throws an error if the build fails and no services were detected
