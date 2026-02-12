# Pare Security Model

This document describes the security architecture and trust boundaries for `@paretools` MCP servers.

## Overview

Pare provides MCP (Model Context Protocol) servers that wrap CLI tools (Docker, Git, Go, npm, etc.), exposing them as structured tool calls for AI assistants. Because these servers execute real CLI commands, understanding the trust model is critical.

## Trust Boundary: The MCP Client

In the MCP architecture, the **MCP client** (e.g., Claude Desktop, VS Code, or another AI-powered IDE) is the trust boundary. The MCP client is responsible for:

1. **User consent** -- presenting tool calls to the user for approval before execution
2. **Scoping access** -- deciding which MCP servers to connect and which tools to expose
3. **Environment isolation** -- running MCP servers in appropriate sandboxes or containers

Pare MCP servers trust that the MCP client has obtained appropriate user authorization before invoking any tool. The servers themselves do not implement authentication, authorization, or user-facing consent dialogs -- this is by design, per the MCP specification.

## The `path`/`cwd` Parameter

Most Pare tools accept a `path` or `cwd` parameter that sets the working directory for the underlying CLI command. This parameter is **intentionally unrestricted**.

### Why `path` is not validated

- The MCP specification delegates filesystem access control to the client
- Restricting paths server-side would break legitimate use cases (monorepos, multi-project workspaces, NixOS store paths, Windows `C:\Program Files\...` paths)
- Any path restriction in the server could be trivially bypassed via symlinks or relative path traversal
- The MCP client is the appropriate place to enforce filesystem boundaries (e.g., workspace root restrictions)

### Implications

- A Pare MCP server can read/write/execute in any directory the host OS user has access to
- If the MCP client does not restrict tool invocations, a compromised or malicious prompt could instruct the AI to operate on arbitrary directories
- Operators deploying Pare servers should ensure their MCP client enforces appropriate workspace boundaries

## Input Validation: `args[]` and Flag Injection Prevention

While `path`/`cwd` is unrestricted, Pare validates all positional string arguments to prevent **flag injection attacks**.

### The threat

CLI tools interpret arguments starting with `-` as flags. If a user-supplied value like `--privileged` is passed as a positional argument (e.g., as a Docker image name), the CLI tool may interpret it as a flag, leading to privilege escalation or unintended behavior.

### The mitigation: `assertNoFlagInjection`

All user-supplied string parameters that are passed as positional arguments to CLI tools are validated with `assertNoFlagInjection()`. This function rejects any value that starts with `-` (after trimming whitespace), preventing flag injection.

**Protected parameters include** (non-exhaustive):

- Docker: `image`, `name`, `container`, `workdir`, `volumes[]`, `env[]`
- Docker: `ports[]` are validated with a dedicated port-mapping format regex
- Git: `ref`, `branch`, `remote`, `message`
- Go: `patterns[]`
- General: any parameter passed as a CLI positional argument

### Array parameter validation

Array parameters (`ports[]`, `volumes[]`, `env[]`, `patterns[]`) receive element-level validation:

- **`ports[]`**: Each element is validated against a port-mapping format regex (e.g., `8080`, `8080:80`, `127.0.0.1:8080:80/tcp`)
- **`volumes[]`**, **`env[]`**, **`patterns[]`**: Each element is checked with `assertNoFlagInjection` to reject values starting with `-`

### Command allowlisting

For tools that accept a command name (e.g., the build tool), `assertAllowedCommand()` validates against an allowlist of known safe build tools (npm, cargo, make, etc.).

## Known Limitations

### 1. Path parameter is unrestricted (by design)

As described above, `path`/`cwd` is not validated. This is an intentional design decision aligned with the MCP specification. See the section above for details.

### 2. Command arguments after `--`

Some tools pass user-supplied arrays as command arguments (e.g., `docker run <image> <command...>`). These arguments are passed directly to the container/process and are not validated beyond flag injection checks on the image/container name itself. The assumption is that the user (via the MCP client) has authorized the specific command.

### 3. `go generate` executes arbitrary directives

The `go generate` tool runs `//go:generate` directives embedded in Go source files. These directives can execute **any** command available on the host system. This is inherent to Go's design. The tool's description includes a warning about this behavior. Only use `go generate` on trusted, reviewed source code.

### 4. `assertAllowedCommand` checks basename only

The build tool's command allowlist checks only the basename of the command (e.g., `npm` from `/usr/bin/npm`). A malicious binary placed at a path like `/tmp/evil/npm` would pass the check. However, this requires prior filesystem compromise and is considered out of scope.

### 5. Environment variable values are not inspected

The `env[]` parameter validation only prevents flag injection (values starting with `-`). It does not validate environment variable format (e.g., `KEY=VALUE`) or inspect values for sensitive content. Environment variable values are passed as-is to the CLI tool.

## Threat Model Summary

| Threat                                      | Mitigation                                          | Residual Risk                                     |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| Flag injection via positional args          | `assertNoFlagInjection` on all string params        | None known                                        |
| Flag injection via array elements           | Per-element validation (format regex or flag check) | None known                                        |
| Arbitrary command execution via build tool  | `assertAllowedCommand` allowlist                    | Basename-only check; requires prior FS compromise |
| Arbitrary directory access via `path`/`cwd` | Delegated to MCP client (by design)                 | MCP client must enforce boundaries                |
| `go generate` running arbitrary commands    | Warning in tool description                         | Inherent to Go; user must trust source code       |
| Supply chain attack via GitHub Actions      | SHA-pinned action references                        | Requires GitHub infrastructure compromise         |

## Recommendations for Operators

1. **Use an MCP client that supports workspace boundaries** to restrict which directories Pare servers can access
2. **Review `go generate` directives** in source code before running the generate tool
3. **Run Pare servers in containers or sandboxes** when operating on untrusted code
4. **Keep Pare packages updated** to receive security patches
5. **Monitor the `SECURITY.md` file** for vulnerability reporting procedures
