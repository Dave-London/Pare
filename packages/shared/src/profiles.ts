/**
 * Preset tool profiles — allows users to activate a curated set of tools
 * via the `PARE_PROFILE` environment variable.
 *
 * Profiles provide a convenient shorthand for `PARE_TOOLS` lists tuned to
 * common workflows (web dev, Python, DevOps, Rust, Go, or a minimal core set).
 *
 * Setting `PARE_PROFILE=full` (or leaving it unset) enables all tools.
 */

/** Valid profile names. */
export type ProfileName = "minimal" | "web" | "python" | "devops" | "rust" | "go" | "full";

/**
 * Maps each profile name to an array of `server:tool` strings, or `null`
 * for the "full" profile (no filtering).
 */
export const PROFILES: Record<ProfileName, readonly string[] | null> = {
  minimal: [
    "git:status",
    "git:log",
    "git:diff",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:branch",
    "test:run",
    "build:build",
    "build:tsc",
    "search:search",
    "search:find",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "process:run",
  ],

  web: [
    "git:status",
    "git:log",
    "git:log-graph",
    "git:diff",
    "git:branch",
    "git:show",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:merge",
    "git:rebase",
    "git:stash",
    "git:stash-list",
    "git:reset",
    "git:restore",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "github:pr-merge",
    "github:pr-comment",
    "github:pr-review",
    "github:pr-update",
    "github:pr-checks",
    "github:pr-diff",
    "github:issue-view",
    "github:issue-list",
    "github:issue-create",
    "github:issue-close",
    "github:issue-comment",
    "github:run-view",
    "github:run-list",
    "npm:install",
    "npm:audit",
    "npm:outdated",
    "npm:list",
    "npm:run",
    "npm:test",
    "npm:info",
    "npm:search",
    "npm:nvm",
    "build:tsc",
    "build:build",
    "build:esbuild",
    "build:vite-build",
    "build:webpack",
    "build:turbo",
    "build:nx",
    "test:run",
    "test:coverage",
    "test:playwright",
    "lint:lint",
    "lint:format-check",
    "lint:prettier-format",
    "lint:biome-check",
    "lint:biome-format",
    "lint:oxlint",
    "lint:stylelint",
    "search:search",
    "search:find",
    "search:count",
    "search:jq",
    "http:get",
    "http:post",
    "http:request",
    "http:head",
    "process:run",
  ],

  python: [
    "git:status",
    "git:log",
    "git:log-graph",
    "git:diff",
    "git:branch",
    "git:show",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:merge",
    "git:rebase",
    "git:stash",
    "git:stash-list",
    "git:reset",
    "git:restore",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "github:pr-merge",
    "github:pr-checks",
    "github:issue-view",
    "github:issue-list",
    "github:issue-create",
    "github:run-view",
    "github:run-list",
    "python:pip-install",
    "python:pip-list",
    "python:pip-show",
    "python:mypy",
    "python:ruff-check",
    "python:ruff-format",
    "python:pip-audit",
    "python:pytest",
    "python:uv-install",
    "python:uv-run",
    "python:black",
    "python:poetry",
    "python:pyenv",
    "python:conda",
    "test:run",
    "test:coverage",
    "search:search",
    "search:find",
    "search:count",
    "make:run",
    "make:list",
    "process:run",
  ],

  devops: [
    "git:status",
    "git:log",
    "git:diff",
    "git:branch",
    "git:show",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:tag",
    "git:remote",
    "git:merge",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "github:pr-merge",
    "github:pr-checks",
    "github:issue-view",
    "github:issue-list",
    "github:run-view",
    "github:run-list",
    "github:run-rerun",
    "github:release-create",
    "github:release-list",
    "docker:ps",
    "docker:build",
    "docker:logs",
    "docker:images",
    "docker:run",
    "docker:exec",
    "docker:compose-up",
    "docker:compose-down",
    "docker:pull",
    "docker:inspect",
    "docker:network-ls",
    "docker:volume-ls",
    "docker:compose-ps",
    "docker:compose-logs",
    "docker:compose-build",
    "docker:stats",
    "k8s:get",
    "k8s:describe",
    "k8s:logs",
    "k8s:apply",
    "k8s:helm",
    "security:trivy",
    "security:semgrep",
    "security:gitleaks",
    "make:run",
    "make:list",
    "lint:shellcheck",
    "lint:hadolint",
    "http:get",
    "http:post",
    "http:request",
    "http:head",
    "search:search",
    "search:find",
    "process:run",
  ],

  rust: [
    "git:status",
    "git:log",
    "git:log-graph",
    "git:diff",
    "git:branch",
    "git:show",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:merge",
    "git:rebase",
    "git:stash",
    "git:stash-list",
    "git:reset",
    "git:restore",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "github:pr-merge",
    "github:pr-checks",
    "github:issue-view",
    "github:issue-list",
    "github:issue-create",
    "github:run-view",
    "github:run-list",
    "cargo:build",
    "cargo:test",
    "cargo:clippy",
    "cargo:run",
    "cargo:add",
    "cargo:remove",
    "cargo:fmt",
    "cargo:doc",
    "cargo:check",
    "cargo:update",
    "cargo:tree",
    "cargo:audit",
    "test:run",
    "test:coverage",
    "search:search",
    "search:find",
    "search:count",
    "process:run",
  ],

  go: [
    "git:status",
    "git:log",
    "git:log-graph",
    "git:diff",
    "git:branch",
    "git:show",
    "git:add",
    "git:commit",
    "git:push",
    "git:pull",
    "git:checkout",
    "git:merge",
    "git:rebase",
    "git:stash",
    "git:stash-list",
    "git:reset",
    "git:restore",
    "github:pr-view",
    "github:pr-list",
    "github:pr-create",
    "github:pr-merge",
    "github:pr-checks",
    "github:issue-view",
    "github:issue-list",
    "github:issue-create",
    "github:run-view",
    "github:run-list",
    "go:build",
    "go:test",
    "go:vet",
    "go:run",
    "go:mod-tidy",
    "go:fmt",
    "go:generate",
    "go:env",
    "go:list",
    "go:get",
    "go:golangci-lint",
    "test:run",
    "test:coverage",
    "search:search",
    "search:find",
    "search:count",
    "process:run",
  ],

  full: null,
};

/**
 * Core tools per server — the most commonly used tools that should always
 * load immediately, even when lazy mode (`PARE_LAZY=true`) is active.
 *
 * Tools not listed here will be deferred and discoverable via the
 * `discover-tools` meta-tool.
 */
export const CORE_TOOLS: Record<string, readonly string[]> = {
  git: ["status", "log", "diff", "commit", "push", "pull", "checkout", "branch", "add"],
  github: [
    "pr-view",
    "pr-list",
    "pr-create",
    "pr-checks",
    "issue-view",
    "issue-list",
    "issue-create",
  ],
  npm: ["install", "run", "test", "audit", "list"],
  docker: ["ps", "build", "logs", "images", "compose-up", "compose-down"],
  build: ["tsc", "build"],
  test: ["run", "coverage"],
  lint: ["lint", "format-check", "prettier-format"],
  search: ["search", "find", "count"],
  cargo: ["build", "test", "clippy", "run", "check"],
  go: ["build", "test", "vet", "run", "mod-tidy", "fmt"],
  python: ["pip-install", "pip-list", "pytest", "ruff-check", "uv-run"],
  k8s: ["get", "describe", "logs"],
  http: ["get", "post", "request"],
  security: ["trivy", "semgrep"],
  make: ["run", "list"],
  process: ["run"],
  bun: ["run", "test", "build", "install"],
  deno: ["run", "test", "fmt", "lint"],
  dotnet: ["build", "test", "run"],
  infra: ["plan", "validate", "init"],
  jvm: ["gradle-build", "gradle-test", "maven-build", "maven-test"],
  nix: ["build", "run", "develop"],
  remote: ["ssh-run", "ssh-test"],
  ruby: ["run", "check", "bundle-install", "bundle-exec"],
  swift: ["build", "test", "run"],
  db: ["psql-query", "psql-list-databases", "mysql-query", "mysql-list-databases"],
  bazel: ["bazel"],
  cmake: ["cmake"],
};

/**
 * Checks whether a tool is in the core set for a given server.
 *
 * @param serverName - The server identifier (e.g., "git", "npm").
 * @param toolName - The tool name (e.g., "status", "install").
 * @returns `true` if the tool is a core tool, `false` otherwise.
 */
export function isCoreToolForServer(serverName: string, toolName: string): boolean {
  const core = CORE_TOOLS[serverName];
  if (!core) return true; // Unknown server — treat all as core.
  return core.includes(toolName);
}

/** Module-level cache for the resolved profile Set. */
let profileCache: Set<string> | null | undefined;

/**
 * Reads `PARE_PROFILE` and returns a `Set<string>` of allowed `server:tool`
 * entries, or `null` if all tools should be enabled.
 *
 * Results are cached at the module level since the env var is read once at
 * startup and does not change.
 */
export function resolveProfile(): Set<string> | null {
  if (profileCache !== undefined) return profileCache;

  const raw = process.env.PARE_PROFILE;
  if (raw === undefined || raw.trim() === "") {
    profileCache = null;
    return null;
  }

  const name = raw.trim().toLowerCase() as ProfileName;
  const tools = PROFILES[name];

  if (tools === undefined) {
    // Unknown profile — warn and fall back to no filtering.
    console.warn(
      `[pare] Unknown profile "${raw.trim()}". Valid profiles: ${Object.keys(PROFILES).join(", ")}. Ignoring.`,
    );
    profileCache = null;
    return null;
  }

  if (tools === null) {
    // "full" profile — no filtering.
    profileCache = null;
    return null;
  }

  profileCache = new Set(tools);
  return profileCache;
}

/**
 * Resets the module-level profile cache. Intended for test cleanup only.
 */
export function _resetProfileCache(): void {
  profileCache = undefined;
}
