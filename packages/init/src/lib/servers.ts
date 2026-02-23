/** Registry of all Pare MCP servers. */

export interface ServerEntry {
  /** Server identifier used in config keys (e.g. "pare-git") */
  id: string;
  /** npm package name */
  pkg: string;
  /** Human-readable label */
  label: string;
}

export const SERVERS: ServerEntry[] = [
  { id: "pare-git", pkg: "@paretools/git", label: "Git" },
  { id: "pare-github", pkg: "@paretools/github", label: "GitHub" },
  { id: "pare-npm", pkg: "@paretools/npm", label: "npm" },
  { id: "pare-build", pkg: "@paretools/build", label: "Build" },
  { id: "pare-lint", pkg: "@paretools/lint", label: "Lint" },
  { id: "pare-test", pkg: "@paretools/test", label: "Test" },
  { id: "pare-search", pkg: "@paretools/search", label: "Search" },
  { id: "pare-http", pkg: "@paretools/http", label: "HTTP" },
  { id: "pare-make", pkg: "@paretools/make", label: "Make" },
  { id: "pare-python", pkg: "@paretools/python", label: "Python" },
  { id: "pare-cargo", pkg: "@paretools/cargo", label: "Cargo" },
  { id: "pare-go", pkg: "@paretools/go", label: "Go" },
  { id: "pare-docker", pkg: "@paretools/docker", label: "Docker" },
  { id: "pare-k8s", pkg: "@paretools/k8s", label: "Kubernetes" },
  { id: "pare-security", pkg: "@paretools/security", label: "Security" },
  { id: "pare-process", pkg: "@paretools/process", label: "Process" },
];

export const SERVER_MAP = new Map(SERVERS.map((s) => [s.id, s]));

/** Resolve server IDs, throwing on unknown ones. */
export function resolveServers(ids: string[]): ServerEntry[] {
  const result: ServerEntry[] = [];
  for (const id of ids) {
    const entry = SERVER_MAP.get(id);
    if (!entry) {
      throw new Error(`Unknown server: ${id}`);
    }
    result.push(entry);
  }
  return result;
}
