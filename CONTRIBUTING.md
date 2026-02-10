# Contributing to pare

Thanks for your interest in contributing! pare is designed to make contributing easy — each server is a self-contained package that wraps a single dev tool.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Dave-London/pare.git
cd pare

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

**Requirements**: Node.js >= 18, pnpm >= 9

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
    "zod": "^3.25.0"
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

## Key Principles

1. **Always use `outputSchema` + `structuredContent`** — This is pare's core differentiator.
2. **Always include human-readable `content`** — Fallback for clients without structuredContent support.
3. **Strip aggressively** — Only include data an agent would act on. No hints, no decorations.
4. **Use `execFile`, not `exec`** — Prevents shell injection.
5. **Test with real output** — Capture actual CLI output as test fixtures.

## Project Structure

```
packages/
  shared/          @paretools/shared  — Dual output helper, command runner, ANSI strip
  server-git/      @paretools/git     — Git operations
  server-test/     @paretools/test    — Test runners
  tsconfig/        Shared TypeScript config
  eslint-config/   Shared ESLint config
```

## Running Checks

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm format:check   # Check formatting
```

## Commit Messages

Use conventional commits:

- `feat(git): add stash tool`
- `fix(shared): handle binary file in ANSI strip`
- `docs: update README with npm server example`
- `chore: update dependencies`
