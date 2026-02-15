# Contributing to Pare

Thanks for your interest in contributing! Pare is designed to make contributing easy — each server is a self-contained package that wraps a single dev tool.

## Project Structure

Pare is a monorepo managed with **pnpm** and **TurboRepo**.

- `packages/shared` — Common library: dual output helpers, command runner, ANSI strip, validation
- `packages/server-*` — One package per CLI tool (e.g., `server-git`, `server-npm`, `server-cargo`)
- `packages/tsconfig`, `packages/eslint-config` — Shared configuration

```
packages/
  shared/          @paretools/shared    — Dual output helper, command runner, ANSI strip
  server-git/      @paretools/git       — Git operations (24 tools)
  server-github/   @paretools/github    — GitHub PR/issue/run operations (22 tools)
  server-docker/   @paretools/docker    — Docker & Compose operations (16 tools)
  server-python/   @paretools/python    — Python tools (14 tools)
  server-cargo/    @paretools/cargo     — Rust/Cargo tools (12 tools)
  server-go/       @paretools/go        — Go tools (11 tools)
  server-npm/      @paretools/npm       — npm/pnpm/yarn operations (10 tools)
  server-lint/     @paretools/lint      — Linters & formatters (9 tools)
  server-build/    @paretools/build     — Build tools (7 tools)
  server-k8s/      @paretools/k8s       — Kubernetes & Helm (5 tools)
  server-search/   @paretools/search    — File search & jq (4 tools)
  server-http/     @paretools/http      — HTTP requests (4 tools)
  server-test/     @paretools/test      — Test runners (3 tools)
  server-security/ @paretools/security  — Secret & vulnerability scanning (3 tools)
  server-make/     @paretools/make      — Make operations (2 tools)
  server-process/  @paretools/process   — Command execution (1 tool)
  tsconfig/        Shared TypeScript config
  eslint-config/   Shared ESLint config
```

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Dave-London/Pare.git
cd pare

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

**Requirements**: Node.js >= 20, pnpm >= 10

## Adding a Tool to an Existing Server

This is the easiest way to contribute. Follow the pattern in [`packages/server-git/src/tools/log.ts`](packages/server-git/src/tools/log.ts) as a template:

1. Create a new file in `src/tools/<command>.ts`
2. Define a `register<Command>Tool` function
3. Register the tool in `src/index.ts`

## Adding a New Server

This is the most impactful contribution. Each server wraps a CLI tool with structured, token-efficient output.

### 1. Scaffold the package

```bash
mkdir -p packages/server-<tool>/src/{tools,schemas,lib}
mkdir -p packages/server-<tool>/__tests__
```

### 2. Create `package.json`

```json
{
  "name": "@paretools/<tool>",
  "version": "0.1.0",
  "type": "module",
  "bin": { "pare-<tool>": "./dist/index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@paretools/shared": "workspace:*",
    "zod": "^4.3.6"
  }
}
```

### 3. Define output schemas (Zod)

Every tool needs a Zod schema in `src/schemas/index.ts`. Think about what data the agent actually needs — strip everything else.

```typescript
import { z } from "zod";

export const MyToolSchema = z.object({
  // Only include fields an agent would act on
  success: z.boolean(),
  errors: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      message: z.string(),
    }),
  ),
});
```

### 4. Implement the tool

Every tool MUST use `outputSchema` and return dual output:

```typescript
import { dualOutput } from "@paretools/shared";
import { MyToolSchema } from "../schemas/index.js";

server.registerTool(
  "my-command",
  {
    title: "My Tool Command",
    description: "What it does",
    inputSchema: {
      /* Zod input params */
    },
    outputSchema: MyToolSchema,
  },
  async (params) => {
    const result = await runMyCommand(params);
    return dualOutput(result, formatHumanReadable);
  },
);
```

### 5. Write tests

Use Vitest. Test the parsers with fixture data (real CLI output captured as strings).

```typescript
import { describe, it, expect } from "vitest";
import { parseMyOutput } from "../src/lib/parsers.js";

describe("parseMyOutput", () => {
  it("parses successful output", () => {
    const raw = `...real CLI output...`;
    const result = parseMyOutput(raw);
    expect(result.success).toBe(true);
  });
});
```

### 6. Create a changeset

```bash
pnpm changeset
```

Select your new package, choose `minor` version bump, and write a brief description.

## Testing

We use **Vitest** for all testing. Run tests for all packages or a specific one:

```bash
pnpm test                          # Run all tests
pnpm --filter @paretools/git test  # Run tests for a specific package
```

### Test Types

1. **Unit Tests** — Test parsers and utility functions using static fixtures (captured CLI output)
2. **Integration Tests** — Test the full MCP server lifecycle by spawning the server and using an MCP client
3. **Fidelity Tests** — Run real CLI commands and verify that the structured output accurately reflects the raw output

## Code Style

- **Prettier**: Formatting is handled automatically by **Husky** and **lint-staged** via a pre-commit hook. You don't need to format your code manually.
- **ESLint**: Run `pnpm lint` to check for code quality issues.

## Running Checks

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm format:check   # Check formatting
```

## Key Principles

1. **Always use `outputSchema` + `structuredContent`** — This is Pare's core differentiator.
2. **Always include human-readable `content`** — Fallback for clients without structuredContent support.
3. **Strip aggressively** — Only include data an agent would act on. No hints, no decorations.
4. **Use `execFile`, not `exec`** — Prevents shell injection.
5. **Test with real output** — Capture actual CLI output as test fixtures.

## Commit Messages

Use conventional commits:

- `feat(git): add stash tool`
- `fix(shared): handle binary file in ANSI strip`
- `docs: update README with npm server example`
- `chore: update dependencies`
