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

`PARE_TOOLS` (global) takes precedence over per-server variables when both are set.

When neither is set, all tools are enabled (default).

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

| Variable                         | Type              | Default      | Description                          |
| -------------------------------- | ----------------- | ------------ | ------------------------------------ |
| `PARE_TOOLS`                     | `server:tool,...` | all enabled  | Global tool filter                   |
| `PARE_{SERVER}_TOOLS`            | `tool,...`        | all enabled  | Per-server tool filter               |
| `PARE_ALLOWED_COMMANDS`          | `cmd,...`         | unrestricted | Global command allowlist             |
| `PARE_{SERVER}_ALLOWED_COMMANDS` | `cmd,...`         | unrestricted | Per-server command allowlist         |
| `PARE_ALLOWED_ROOTS`             | `path,...`        | unrestricted | Global root confinement              |
| `PARE_{SERVER}_ALLOWED_ROOTS`    | `path,...`        | unrestricted | Per-server root confinement          |
| `PARE_BUILD_STRICT_PATH`         | `true`            | disabled     | Reject path-qualified build commands |
| `PARE_SANITIZE_ALL_PATHS`        | `true`            | disabled     | Broad absolute path redaction        |
