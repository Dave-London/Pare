import { join } from "node:path";
import { homedir } from "node:os";
import { isWindows } from "./platform.js";

export type ConfigFormat =
  | "json-mcpservers"
  | "json-vscode"
  | "json-zed"
  | "toml-codex"
  | "yaml-continue";

export type ConfigScope = "project" | "user";

export interface ClientEntry {
  /** Unique client identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Config file path (absolute). May contain {project} placeholder. */
  configPath: string;
  /** Config format used by this client */
  format: ConfigFormat;
  /** Whether config is project-scoped or user-scoped */
  scope: ConfigScope;
  /** Paths to check for client detection (directories or files) */
  detectPaths: string[];
}

function appData(): string {
  return process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
}

function xdgConfig(): string {
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

function claudeDesktopPath(): string {
  if (isWindows()) {
    return join(appData(), "Claude", "claude_desktop_config.json");
  }
  return join(xdgConfig(), "Claude", "claude_desktop_config.json");
}

function vscodeExtDir(): string {
  if (isWindows()) {
    return join(homedir(), ".vscode", "extensions");
  }
  return join(homedir(), ".vscode", "extensions");
}

/** Resolve {project} in a config path to the given project directory. */
export function resolveConfigPath(configPath: string, projectDir: string): string {
  return configPath.replace("{project}", projectDir);
}

export function getClients(): ClientEntry[] {
  const home = homedir();

  return [
    {
      id: "claude-code",
      name: "Claude Code",
      configPath: "{project}/.claude/settings.local.json",
      format: "json-mcpservers",
      scope: "project",
      detectPaths: [join(home, ".claude")],
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      configPath: claudeDesktopPath(),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [isWindows() ? join(appData(), "Claude") : join(xdgConfig(), "Claude")],
    },
    {
      id: "cursor",
      name: "Cursor",
      configPath: join(home, ".cursor", "mcp.json"),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [join(home, ".cursor")],
    },
    {
      id: "vscode",
      name: "VS Code / GitHub Copilot",
      configPath: "{project}/.vscode/mcp.json",
      format: "json-vscode",
      scope: "project",
      detectPaths: [vscodeExtDir()],
    },
    {
      id: "windsurf",
      name: "Windsurf",
      configPath: join(home, ".codeium", "windsurf", "mcp_config.json"),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [join(home, ".codeium", "windsurf")],
    },
    {
      id: "zed",
      name: "Zed",
      configPath: join(xdgConfig(), "zed", "settings.json"),
      format: "json-zed",
      scope: "user",
      detectPaths: [join(xdgConfig(), "zed")],
    },
    {
      id: "cline",
      name: "Cline",
      configPath: join(home, ".vscode", "cline_mcp_settings.json"),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [join(vscodeExtDir())],
    },
    {
      id: "roo-code",
      name: "Roo Code",
      configPath: join(home, ".vscode", "roo_code_mcp_settings.json"),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [join(vscodeExtDir())],
    },
    {
      id: "codex",
      name: "OpenAI Codex",
      configPath: "{project}/.codex/config.toml",
      format: "toml-codex",
      scope: "project",
      detectPaths: [],
    },
    {
      id: "continue",
      name: "Continue.dev",
      configPath: "{project}/.continue/mcpServers/pare.yaml",
      format: "yaml-continue",
      scope: "project",
      detectPaths: [join(home, ".continue")],
    },
    {
      id: "gemini",
      name: "Gemini CLI",
      configPath: join(home, ".gemini", "settings.json"),
      format: "json-mcpservers",
      scope: "user",
      detectPaths: [join(home, ".gemini")],
    },
  ];
}

export const CLIENT_MAP = new Map<string, ClientEntry>();
for (const c of getClients()) {
  CLIENT_MAP.set(c.id, c);
}
