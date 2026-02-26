# Pare Configuration Reference

Pare servers are configured via environment variables. All controls are opt-in — by default, no restrictions are applied.

## Tool Filtering

Control which tools are available to MCP clients.

### `PARE_TOOLS`

Universal filter across all servers. Comma-separated `server:tool` pairs.

```bash
PARE_TOOLS=git:status,git:log,npm:install
```

When set, only the listed tools are registered. All others are hidden from MCP clients.

### `PARE_{SERVER}_TOOLS`

Per-server filter. Comma-separated tool names.

```bash
PARE_GIT_TOOLS=status,log,diff
PARE_NPM_TOOLS=install,run,test
```

`PARE_TOOLS` (global) takes precedence over profiles and per-server variables when both are set.

When neither is set, all tools are enabled (default).

---

## Tool Profiles (`PARE_PROFILE`)

Activate a preset collection of tools for common workflows instead of listing individual tools.

```bash
PARE_PROFILE=python
```

| Profile   | Tools | Description                                      |
| --------- | ----- | ------------------------------------------------ |
| `minimal` | 18    | Core git, build, test, search, and GitHub basics |
| `web`     | ~65   | Full-stack web dev: npm, build, lint, test, HTTP |
| `python`  | ~48   | Python ecosystem: pip, ruff, mypy, pytest, uv    |
| `devops`  | ~59   | Docker, K8s, security scanning, CI/CD, releases  |
| `rust`    | ~44   | Cargo toolchain: build, test, clippy, audit      |
| `go`      | ~44   | Go toolchain: build, test, vet, lint             |
| `full`    | all   | No filtering (default when unset)                |

### Precedence

1. `PARE_TOOLS` — highest priority (explicit tool list)
2. `PARE_PROFILE` — preset profile
3. `PARE_{SERVER}_TOOLS` — per-server filter
4. No env vars — all tools enabled

`PARE_PROFILE` overrides per-server variables but is itself overridden by `PARE_TOOLS`. Profile names are case-insensitive.

---

## Lazy Tool Loading (`PARE_LAZY`)

By default, every server registers all of its tools at startup. For servers with many tools, this can increase the token cost of the initial tool schema sent to LLM clients. Lazy mode defers non-essential tools so they load on demand.

```bash
PARE_LAZY=true npx @paretools/git
```

When `PARE_LAZY=true` is set, each server only registers its **core tools** at startup. Extended tools are held back and made available through a `discover-tools` meta-tool that is automatically added to every server.

### How it works

1. **Startup** -- Core tools (the most commonly used tools per server) are registered immediately.
2. **Discovery** -- The `discover-tools` tool is registered on the server. Calling it lists all available but not-yet-loaded tools.
3. **Loading** -- Pass tool names to the `load` parameter of `discover-tools` to register them on demand. Clients receive a `notifications/tools/list_changed` notification and re-fetch the tool list.

### Core tools per server

Each server defines a set of core tools that always load, even in lazy mode. For example:

| Server | Core Tools                                                                   |
| ------ | ---------------------------------------------------------------------------- |
| git    | status, log, diff, commit, push, pull, checkout, branch, add                 |
| github | pr-view, pr-list, pr-create, pr-checks, issue-view, issue-list, issue-create |
| npm    | install, run, test, audit, list                                              |
| build  | tsc, build                                                                   |
| test   | run, coverage                                                                |
| docker | ps, build, logs, images, compose-up, compose-down                            |

The full core tool map is defined in `packages/shared/src/profiles.ts`.

### The `discover-tools` meta-tool

When lazy mode is active and a server has deferred tools, a `discover-tools` tool is automatically registered.

**Input:**

| Parameter | Type       | Required | Description                    |
| --------- | ---------- | -------- | ------------------------------ |
| `load`    | `string[]` | No       | Tool names to load immediately |

**Output:**

```json
{
  "available": [
    { "name": "rebase", "description": "Rebases the current branch onto a target branch..." },
    { "name": "bisect", "description": "Binary search for the commit that introduced a bug..." }
  ],
  "loaded": ["cherry-pick"],
  "totalAvailable": 2
}
```

- `available` -- Tools that are still deferred and can be loaded.
- `loaded` -- Tools that were just loaded in this call (via the `load` parameter).
- `totalAvailable` -- Count of remaining deferred tools after any loads.

Calling `discover-tools` with no arguments simply lists what is available. Passing `load: ["rebase", "bisect"]` immediately registers those tools on the server.

### Overrides

Lazy mode is automatically **disabled** when:

- `PARE_TOOLS` is set -- Explicit tool lists already provide precise control.
- `PARE_PROFILE=full` is set -- The "full" profile means all tools should load.

Per-server tool filters (`PARE_{SERVER}_TOOLS`) are applied before lazy mode, so filtered-out tools are never registered regardless of lazy mode.

### Configuration example

```json
{
  "mcpServers": {
    "pare-git": {
      "command": "npx",
      "args": ["-y", "@paretools/git"],
      "env": {
        "PARE_LAZY": "true"
      }
    }
  }
}
```

---

## Security Hardening

Opt-in controls that restrict what commands can be executed and where tools can operate. These are designed for deployments where agents may operate in less-trusted environments.

### Command Allowlists

Restrict which commands a server can execute.

| Variable                         | Scope         | Example                                          |
| -------------------------------- | ------------- | ------------------------------------------------ |
| `PARE_ALLOWED_COMMANDS`          | All servers   | `node,python,git,npm`                            |
| `PARE_{SERVER}_ALLOWED_COMMANDS` | Single server | `PARE_PROCESS_ALLOWED_COMMANDS=node,python,make` |

When set, only listed commands may be executed. Commands are matched by basename (e.g., `/usr/bin/node` matches `node`). When unset, no restriction.

Global (`PARE_ALLOWED_COMMANDS`) takes precedence over per-server variables.

**Example — restrict the process server to safe commands:**

```bash
PARE_PROCESS_ALLOWED_COMMANDS=node,python,make,cargo,go
```

### Root Confinement

Restrict which directories tools can operate in.

| Variable                      | Scope         | Example                                          |
| ----------------------------- | ------------- | ------------------------------------------------ |
| `PARE_ALLOWED_ROOTS`          | All servers   | `/home/user/projects,/tmp/builds`                |
| `PARE_{SERVER}_ALLOWED_ROOTS` | Single server | `PARE_PROCESS_ALLOWED_ROOTS=/home/user/safe-dir` |

When set, all `path`/`cwd` parameters must resolve to a location under one of the listed roots. Paths are normalized and resolved to absolute before comparison. When unset, no restriction.

Global (`PARE_ALLOWED_ROOTS`) takes precedence over per-server variables.

**Example — confine all servers to a project directory:**

```bash
PARE_ALLOWED_ROOTS=/home/user/myproject
```

### Build Strict Path Mode

Reject path-qualified commands in the build server.

| Variable                 | Value  | Effect                                                                              |
| ------------------------ | ------ | ----------------------------------------------------------------------------------- |
| `PARE_BUILD_STRICT_PATH` | `true` | Rejects commands containing `/` or `\` (e.g., `/tmp/evil/npm`)                      |
| (unset)                  | —      | Current behavior: basename-only validation with warning for path-qualified commands |

This prevents a class of attack where a malicious binary is placed at a trusted-name path. When enabled, only bare command names resolved via `PATH` are accepted.

```bash
PARE_BUILD_STRICT_PATH=true
```

---

## Error Output Sanitization

### `PARE_SANITIZE_ALL_PATHS`

Broaden path redaction in error output beyond home directories.

| Variable                  | Value  | Effect                                                                                                                   |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `PARE_SANITIZE_ALL_PATHS` | `true` | Redacts absolute paths under `/etc`, `/var`, `/opt`, `/usr`, `/tmp`, `/srv`, `/snap`, `/nix`, and non-user Windows paths |
| (unset)                   | —      | Only home directory paths are redacted (default)                                                                         |

Default behavior replaces `/home/<user>/...` → `~/...` and similar patterns. Broad mode additionally replaces other absolute paths with `<redacted-path>/filename`, preserving the basename while hiding directory structure.

```bash
PARE_SANITIZE_ALL_PATHS=true
```

---

## Precedence Rules

All global/per-server variables follow the same precedence:

1. **Global** (`PARE_{SETTING}`) — applies to all servers, highest priority
2. **Per-server** (`PARE_{SERVER}_{SETTING}`) — applies to one server only
3. **No variable set** — permissive default (no restriction)

Server names in env vars use uppercase with hyphens replaced by underscores:

- `server-git` → `PARE_GIT_*`
- `server-process` → `PARE_PROCESS_*`
- `server-security` → `PARE_SECURITY_*`

---

## Quick Reference

| Variable                         | Type              | Default      | Description                                   |
| -------------------------------- | ----------------- | ------------ | --------------------------------------------- |
| `PARE_TOOLS`                     | `server:tool,...` | all enabled  | Global tool filter                            |
| `PARE_PROFILE`                   | profile name      | `full`       | Preset tool profile                           |
| `PARE_{SERVER}_TOOLS`            | `tool,...`        | all enabled  | Per-server tool filter                        |
| `PARE_LAZY`                      | `true`            | disabled     | Defer non-core tools; load via discover-tools |
| `PARE_ALLOWED_COMMANDS`          | `cmd,...`         | unrestricted | Global command allowlist                      |
| `PARE_{SERVER}_ALLOWED_COMMANDS` | `cmd,...`         | unrestricted | Per-server command allowlist                  |
| `PARE_ALLOWED_ROOTS`             | `path,...`        | unrestricted | Global root confinement                       |
| `PARE_{SERVER}_ALLOWED_ROOTS`    | `path,...`        | unrestricted | Per-server root confinement                   |
| `PARE_BUILD_STRICT_PATH`         | `true`            | disabled     | Reject path-qualified build commands          |
| `PARE_SANITIZE_ALL_PATHS`        | `true`            | disabled     | Broad absolute path redaction                 |
