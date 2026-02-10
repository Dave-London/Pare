# @paretools/shared

Shared utilities for Pare MCP servers.

## Exports

- **`run(command, args, options)`** — Executes a CLI command via `execFile` (no shell injection) and returns `{ stdout, stderr, exitCode }`
- **`dualOutput(data, formatter)`** — Returns both `structuredContent` (typed JSON) and `content` (human-readable text) for MCP tool responses
- **`stripAnsi(text)`** — Removes ANSI escape codes from CLI output

## Usage

This package is used internally by all `@paretools/*` server packages. You generally don't need to install it directly unless you're building a custom Pare server.

```typescript
import { run, dualOutput, stripAnsi } from "@paretools/shared";
```

## Links

- [Pare monorepo](https://github.com/Dave-London/pare)

## License

[MIT](https://github.com/Dave-London/pare/blob/main/LICENSE)
