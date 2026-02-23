/** Preset server groupings for common workflows. */

export interface Preset {
  id: string;
  label: string;
  description: string;
  serverIds: string[];
}

export const PRESETS: Preset[] = [
  {
    id: "web",
    label: "Web Development",
    description: "git, npm, build, lint, test",
    serverIds: ["pare-git", "pare-npm", "pare-build", "pare-lint", "pare-test"],
  },
  {
    id: "python",
    label: "Python",
    description: "git, python, test",
    serverIds: ["pare-git", "pare-python", "pare-test"],
  },
  {
    id: "rust",
    label: "Rust",
    description: "git, cargo, test",
    serverIds: ["pare-git", "pare-cargo", "pare-test"],
  },
  {
    id: "go",
    label: "Go",
    description: "git, go, test",
    serverIds: ["pare-git", "pare-go", "pare-test"],
  },
  {
    id: "devops",
    label: "DevOps",
    description: "git, docker, k8s, security",
    serverIds: ["pare-git", "pare-docker", "pare-k8s", "pare-security"],
  },
  {
    id: "full",
    label: "Full (all servers)",
    description: "All 16 Pare servers",
    serverIds: [
      "pare-git",
      "pare-github",
      "pare-npm",
      "pare-build",
      "pare-lint",
      "pare-test",
      "pare-search",
      "pare-http",
      "pare-make",
      "pare-python",
      "pare-cargo",
      "pare-go",
      "pare-docker",
      "pare-k8s",
      "pare-security",
      "pare-process",
    ],
  },
];

export const PRESET_MAP = new Map(PRESETS.map((p) => [p.id, p]));
