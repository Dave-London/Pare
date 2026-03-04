/** Preset server groupings for common workflows. */

import { SERVERS } from "./servers.js";

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
    id: "jvm",
    label: "JVM",
    description: "git, jvm, test",
    serverIds: ["pare-git", "pare-jvm", "pare-test"],
  },
  {
    id: "dotnet",
    label: ".NET",
    description: "git, dotnet, test",
    serverIds: ["pare-git", "pare-dotnet", "pare-test"],
  },
  {
    id: "ruby",
    label: "Ruby",
    description: "git, ruby, test",
    serverIds: ["pare-git", "pare-ruby", "pare-test"],
  },
  {
    id: "swift",
    label: "Swift",
    description: "git, swift, test",
    serverIds: ["pare-git", "pare-swift", "pare-test"],
  },
  {
    id: "mobile",
    label: "Mobile",
    description: "git, jvm, swift, test",
    serverIds: ["pare-git", "pare-jvm", "pare-swift", "pare-test"],
  },
  {
    id: "full",
    label: "Full (all servers)",
    description: `All ${SERVERS.length} Pare servers`,
    serverIds: SERVERS.map((s) => s.id),
  },
];

export const PRESET_MAP = new Map(PRESETS.map((p) => [p.id, p]));
