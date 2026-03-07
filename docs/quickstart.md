# Quickstart — Set Up Pare in Your Project

This is the single-page setup guide. Follow these steps in order to go from zero to a fully working Pare integration.

## Prerequisites

- **Node.js >= 20**
- A supported AI client (Claude Code, Cursor, VS Code, Windsurf, Zed, etc.)

## Step 1: Run the Init Tool

The `@paretools/init` CLI auto-detects your client and writes the correct MCP config.

**Non-interactive (recommended for CI and AI agents):**

```bash
npx @paretools/init --client claude-code --preset web
```

**Interactive:**

```bash
npx @paretools/init
```

### Available Presets

| Preset   | Servers Included            | Best For                              |
| -------- | --------------------------- | ------------------------------------- |
| `web`    | git, npm, build, lint, test | JavaScript/TypeScript, React, Next.js |
| `python` | git, python, test           | Python, Django, FastAPI, ML           |
| `rust`   | git, cargo, test            | Rust projects                         |
| `go`     | git, go, test               | Go projects                           |
| `jvm`    | git, jvm, test              | Java, Kotlin, Android (Gradle/Maven)  |
| `dotnet` | git, dotnet, test           | C#, F#, .NET projects                 |
| `ruby`   | git, ruby, test             | Ruby, Rails projects                  |
| `swift`  | git, swift, test            | Swift, iOS/macOS projects             |
| `mobile` | git, jvm, swift, test       | Cross-platform mobile (Android + iOS) |
| `devops` | git, docker, k8s, security  | Infrastructure, CI/CD, containers     |
| `full`   | All servers                 | Monorepos, polyglot projects          |

### Ecosystem-to-Preset Mapping

Not sure which preset to use? Find your project type:

| Project Type                 | Recommended Preset | Why                                    |
| ---------------------------- | ------------------ | -------------------------------------- |
| React / Next.js / Vue        | `web`              | npm + build + lint + test              |
| Node.js API / Express        | `web`              | npm + build + lint + test              |
| Python / Django / FastAPI    | `python`           | pip, ruff, mypy, pytest, uv            |
| Machine Learning / Jupyter   | `python`           | pip, ruff, pytest, uv, conda           |
| Rust CLI / library           | `rust`             | cargo build, test, clippy, fmt         |
| Go service / CLI             | `go`               | go build, test, vet, golangci-lint     |
| Android (Gradle)             | `jvm`              | gradle-build, gradle-test              |
| iOS / macOS (Xcode)          | `swift`            | swift build, test, package management  |
| Cross-platform mobile        | `mobile`           | jvm + swift combined                   |
| Java / Kotlin backend        | `jvm`              | gradle/maven build, test, dependencies |
| C# / .NET                    | `dotnet`           | dotnet build, test, publish            |
| Ruby / Rails                 | `ruby`             | gem, bundler, ruby run                 |
| Docker / Kubernetes / DevOps | `devops`           | docker, k8s, security scanning         |
| Monorepo / polyglot          | `full`             | Everything available                   |

### Client Options

Use `--client` to target a specific client:

```bash
npx @paretools/init --client claude-code --preset web
npx @paretools/init --client cursor --preset python
npx @paretools/init --client vscode --preset go
npx @paretools/init --client windsurf --preset rust
```

Use `--dry-run` to preview what would be written without making changes:

```bash
npx @paretools/init --client claude-code --preset web --dry-run
```

## Step 2: Add Agent Rules

Agent rules tell AI agents to prefer Pare MCP tools over raw CLI commands. Copy the appropriate rules file for your client:

**Claude Code:**

```bash
# If you DON'T have a CLAUDE.md yet:
cp node_modules/@paretools/init/rules/CLAUDE.md CLAUDE.md

# If you ALREADY have a CLAUDE.md, append the Pare section:
cat node_modules/@paretools/init/rules/CLAUDE.md >> CLAUDE.md
```

> **Merge strategy for existing CLAUDE.md**: If your project already has a `CLAUDE.md`, do NOT overwrite it. Instead, append the Pare rules section to the end of your existing file using `>>`. Review the merged file to ensure there are no conflicts or duplicate sections. The Pare rules are self-contained under a `## MCP Tools` heading and will not interfere with your existing instructions.

Pre-built rule files are also available in the Pare repo under [`rules/`](https://github.com/Dave-London/Pare/tree/main/rules):

| Client         | Rule File                               | Copy Command                                                               |
| -------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Claude Code    | `rules/CLAUDE.md`                       | `cp rules/CLAUDE.md CLAUDE.md`                                             |
| Cursor         | `rules/.cursor/rules/pare.mdc`          | `mkdir -p .cursor/rules && cp rules/.cursor/rules/pare.mdc .cursor/rules/` |
| Windsurf       | `rules/.windsurfrules`                  | `cp rules/.windsurfrules .windsurfrules`                                   |
| Cline          | `rules/.clinerules/pare.md`             | `mkdir -p .clinerules && cp rules/.clinerules/pare.md .clinerules/`        |
| GitHub Copilot | `rules/.github/copilot-instructions.md` | `mkdir -p .github && cp rules/.github/copilot-instructions.md .github/`    |
| Gemini CLI     | `rules/GEMINI.md`                       | `cp rules/GEMINI.md GEMINI.md`                                             |
| Aider          | `rules/CONVENTIONS.md`                  | `cp rules/CONVENTIONS.md CONVENTIONS.md`                                   |

## Step 3: (Claude Code Only) Install the Enforcement Hook

The optional `pare-prefer-mcp.sh` hook intercepts Bash tool calls and redirects them to Pare MCP tools automatically.

```bash
mkdir -p .claude/hooks
cp hooks/pare-prefer-mcp.sh .claude/hooks/
chmod +x .claude/hooks/pare-prefer-mcp.sh
```

Then add the hook config to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/pare-prefer-mcp.sh"
          }
        ]
      }
    ]
  }
}
```

> **Important**: The hook path `./.claude/hooks/pare-prefer-mcp.sh` is project-relative. Claude Code must be invoked from the project root directory for the hook to work. If you launch Claude Code from a subdirectory, the hook will not be found.

## Step 4: Restart Your Client Session

After running `pare-init` and copying rules, **restart your AI client session** (or reload the MCP servers) for the new configuration to take effect.

- **Claude Code**: Start a new conversation or restart the CLI
- **Cursor / VS Code**: Reload the window (Ctrl+Shift+P > "Reload Window")
- **Windsurf**: Restart the application

## Step 5: Validate with Doctor

Verify that all configured Pare servers are running correctly:

```bash
npx @paretools/doctor
```

Doctor checks each configured server, reports which tools loaded successfully, and flags any connection issues.

## What to Commit vs. Gitignore

After setup, your project will have new config files. Here is what to track in version control:

| File                          | Action        | Why                                                    |
| ----------------------------- | ------------- | ------------------------------------------------------ |
| `.mcp.json`                   | **Commit**    | Shared MCP config so all team members get Pare servers |
| `.claude/settings.json`       | **Commit**    | Hook config and shared settings for the team           |
| `CLAUDE.md`                   | **Commit**    | Agent rules should be shared across the team           |
| `.claude/settings.local.json` | **Gitignore** | User-specific overrides (API keys, local paths)        |
| `.cursor/rules/pare.mdc`      | **Commit**    | Shared Cursor rules for the team                       |

Add to your `.gitignore`:

```gitignore
# User-specific Claude Code settings
.claude/settings.local.json
```

## Full Example: Claude Code + Web Project

Here is the complete setup for a typical web project, start to finish:

```bash
# 1. Configure MCP servers
npx @paretools/init --client claude-code --preset web

# 2. Add agent rules (new project)
cp node_modules/@paretools/init/rules/CLAUDE.md CLAUDE.md

# 3. Install enforcement hook (optional)
mkdir -p .claude/hooks
cp hooks/pare-prefer-mcp.sh .claude/hooks/
chmod +x .claude/hooks/pare-prefer-mcp.sh

# 4. Validate
npx @paretools/doctor

# 5. Commit the config
git add .mcp.json CLAUDE.md .claude/
git commit -m "chore: add Pare MCP tool configuration"

# 6. Restart Claude Code and start coding
```

## Next Steps

- [Configuration Reference](./configuration.md) — tool filtering, profiles, lazy loading, security hardening
- [Agent Integration Guide](./agent-integration.md) — detailed per-agent setup, hook deep dive, CLI-to-MCP mapping
- [Tool Schemas](./tool-schemas/) — response examples and token comparisons for every tool
