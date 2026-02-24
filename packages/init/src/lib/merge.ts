import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ClientEntry, ConfigFormat } from "./clients.js";
import { resolveConfigPath } from "./clients.js";
import type { ServerEntry } from "./servers.js";
import { writeMcpServersConfig } from "./config-writers/json-mcpservers.js";
import { writeVsCodeConfig } from "./config-writers/json-vscode.js";
import { writeZedConfig } from "./config-writers/json-zed.js";
import { writeCodexConfig } from "./config-writers/toml-codex.js";
import { writeContinueConfig } from "./config-writers/yaml-continue.js";

/** Injectable filesystem interface for testability. */
export interface FileSystem {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  /** Create a .bak backup of a file before modifying it. Returns the backup path, or undefined if no file to back up. */
  backupFile(path: string): string | undefined;
}

/** Real filesystem implementation. */
export function realFs(): FileSystem {
  return {
    readFile(path: string): string | undefined {
      if (!existsSync(path)) return undefined;
      return readFileSync(path, "utf-8");
    },
    writeFile(path: string, content: string): void {
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(path, content, "utf-8");
    },
    backupFile(path: string): string | undefined {
      if (!existsSync(path)) return undefined;
      const backupPath = path + ".bak";
      copyFileSync(path, backupPath);
      return backupPath;
    },
  };
}

/** In-memory filesystem for testing. */
export function memoryFs(
  initialFiles?: Record<string, string>,
): FileSystem & { files: Map<string, string> } {
  const files = new Map<string, string>(initialFiles ? Object.entries(initialFiles) : []);
  return {
    files,
    readFile(path: string): string | undefined {
      return files.get(path);
    },
    writeFile(path: string, content: string): void {
      files.set(path, content);
    },
    backupFile(path: string): string | undefined {
      const content = files.get(path);
      if (content === undefined) return undefined;
      const backupPath = path + ".bak";
      files.set(backupPath, content);
      return backupPath;
    },
  };
}

const FORMAT_WRITERS: Record<
  ConfigFormat,
  (configPath: string, servers: ServerEntry[], fs: FileSystem) => string
> = {
  "json-mcpservers": writeMcpServersConfig,
  "json-vscode": writeVsCodeConfig,
  "json-zed": writeZedConfig,
  "toml-codex": writeCodexConfig,
  "yaml-continue": writeContinueConfig,
};

export interface MergeResult {
  configPath: string;
  output: string;
  serverCount: number;
  /** Path to the .bak backup file, if one was created. */
  backupPath?: string;
}

/**
 * Merge Pare server entries into a client's config file.
 * Creates a .bak backup of the existing config before modification.
 * Returns the resolved config path and output content.
 */
export function mergeConfig(
  client: ClientEntry,
  servers: ServerEntry[],
  projectDir: string,
  fs: FileSystem,
): MergeResult {
  const configPath = resolveConfigPath(client.configPath, projectDir);

  // Back up existing config before modification
  const backupPath = fs.backupFile(configPath);

  const writer = FORMAT_WRITERS[client.format];
  const output = writer(configPath, servers, fs);

  return {
    configPath,
    output,
    serverCount: servers.length,
    backupPath,
  };
}
