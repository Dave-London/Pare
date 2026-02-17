# @paretools/docker

[![npm](https://img.shields.io/npm/v/@paretools/docker.svg)](https://www.npmjs.com/package/@paretools/docker)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dave-London/Pare/blob/main/LICENSE)

**Structured, token-efficient Docker output for AI agents.** Up to 95% fewer tokens than raw `docker` CLI output.

Part of the [Pare](https://github.com/Dave-London/Pare) suite of MCP servers.

## Tools (9)

| Tool           | Description                                          |
| -------------- | ---------------------------------------------------- |
| `ps`           | List containers with status, ports, and state        |
| `build`        | Build image, returns image ID, duration, and errors  |
| `logs`         | Retrieve container logs as structured line arrays    |
| `images`       | List images with repository, tag, and size info      |
| `run`          | Run a container from an image with structured result |
| `exec`         | Execute a command in a running container             |
| `compose-up`   | Start Docker Compose services with structured status |
| `compose-down` | Stop Docker Compose services with structured status  |
| `pull`         | Pull an image from a registry with digest info       |

## Quick Start

```bash
npx -y @paretools/docker
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "pare-docker": {
      "command": "npx",
      "args": ["-y", "@paretools/docker"]
    }
  }
}
```

## Example

**`ps` output:**

```json
{
  "containers": [
    {
      "id": "abc123",
      "name": "my-app",
      "image": "node:22-alpine",
      "state": "running",
      "status": "Up 2 hours",
      "ports": ["0.0.0.0:3000->3000/tcp"]
    }
  ]
}
```

## All Pare Servers (149 tools)

| Package                                                              | Tools                                                                       | Wraps                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| [@paretools/git](https://www.npmjs.com/package/@paretools/git)       | status, log, diff, branch, show, add, commit, push, pull, checkout          | git                                |
| [@paretools/test](https://www.npmjs.com/package/@paretools/test)     | run, coverage                                                               | pytest, jest, vitest, mocha        |
| [@paretools/npm](https://www.npmjs.com/package/@paretools/npm)       | install, audit, outdated, list, run, test, init                             | npm                                |
| [@paretools/build](https://www.npmjs.com/package/@paretools/build)   | tsc, build, esbuild, vite-build, webpack                                    | tsc, esbuild, vite, webpack        |
| [@paretools/lint](https://www.npmjs.com/package/@paretools/lint)     | lint, format-check, prettier-format, biome-check, biome-format              | eslint, prettier, biome            |
| [@paretools/python](https://www.npmjs.com/package/@paretools/python) | pip-install, mypy, ruff-check, pip-audit, pytest, uv-install, uv-run, black | pip, mypy, ruff, pytest, uv, black |
| **@paretools/docker**                                                | ps, build, logs, images, run, exec, compose-up, compose-down, pull          | docker, docker compose             |
| [@paretools/cargo](https://www.npmjs.com/package/@paretools/cargo)   | build, test, clippy, run, add, remove, fmt, doc, check                      | cargo                              |
| [@paretools/go](https://www.npmjs.com/package/@paretools/go)         | build, test, vet, run, mod-tidy, fmt, generate                              | go, gofmt                          |

## Compatible Clients

Works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://codeium.com/windsurf), [VS Code / GitHub Copilot](https://code.visualstudio.com), [Cline](https://github.com/cline/cline), [Roo Code](https://roocode.com), [Zed](https://zed.dev), [Continue.dev](https://continue.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://openai.com/index/codex/)

## Links

- [Pare monorepo](https://github.com/Dave-London/Pare)
- [MCP protocol](https://modelcontextprotocol.io)

## License

[MIT](https://github.com/Dave-London/Pare/blob/main/LICENSE)
