import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getClients, type ClientEntry } from "./clients.js";

/**
 * Auto-detect installed AI coding clients by checking for
 * known config directories/files on the filesystem.
 */
export function detectClients(): ClientEntry[] {
  return getClients().filter((client) => client.detectPaths.some((p) => existsSync(p)));
}

/** Ecosystem identifier detected from marker files. */
export type Ecosystem =
  | "python"
  | "rust"
  | "go"
  | "web"
  | "devops"
  | "make"
  | "jvm"
  | "dotnet"
  | "ruby"
  | "swift";

/** Marker files/directories that indicate a particular ecosystem. */
const ECOSYSTEM_MARKERS: Record<Ecosystem, string[]> = {
  python: [
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "requirements.txt",
    "Pipfile",
    "poetry.lock",
    "uv.lock",
  ],
  rust: ["Cargo.toml", "Cargo.lock"],
  go: ["go.mod", "go.sum"],
  web: [
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
    "webpack.config.js",
    "webpack.config.ts",
    "webpack.config.mjs",
  ],
  devops: [
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".docker",
    "k8s",
    "kubernetes",
    "helm",
  ],
  make: ["Makefile", "justfile"],
  jvm: ["build.gradle", "build.gradle.kts", "pom.xml", "gradlew"],
  dotnet: ["*.csproj", "*.sln", "*.fsproj", "global.json"],
  ruby: ["Gemfile", "Rakefile", ".ruby-version"],
  swift: ["Package.swift", "*.xcodeproj", "*.xcworkspace"],
};

/** Result of project type auto-detection. */
export interface DetectionResult {
  /** All detected ecosystems. */
  ecosystems: Ecosystem[];
  /** Suggested preset ID, or undefined if nothing detected. */
  suggestedPreset: string | undefined;
}

/** Map from single ecosystem to preset ID. */
const ECOSYSTEM_TO_PRESET: Record<Ecosystem, string> = {
  python: "python",
  rust: "rust",
  go: "go",
  web: "web",
  devops: "devops",
  make: "web", // make is common in web projects; no standalone make preset
  jvm: "jvm",
  dotnet: "dotnet",
  ruby: "ruby",
  swift: "swift",
};

/**
 * Check whether a marker exists in the given directory.
 * Supports exact names and simple glob patterns with leading `*` (e.g. `*.csproj`).
 */
function markerExists(dir: string, marker: string, checkExists: (p: string) => boolean): boolean {
  if (!marker.includes("*")) {
    return checkExists(join(dir, marker));
  }

  // For glob patterns like *.csproj, do a simple directory listing check.
  try {
    const ext = marker.replace("*", "");
    const entries = readdirSync(dir);
    return entries.some((e) => e.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Auto-detect the project type by scanning for marker files in the given directory.
 *
 * @param projectDir - The directory to scan (defaults to cwd).
 * @param checkExists - Override for testing (defaults to `existsSync`).
 */
export function detectProjectType(
  projectDir: string = process.cwd(),
  checkExists: (path: string) => boolean = existsSync,
): DetectionResult {
  const detected: Ecosystem[] = [];

  for (const [ecosystem, markers] of Object.entries(ECOSYSTEM_MARKERS) as [Ecosystem, string[]][]) {
    if (markers.some((m) => markerExists(projectDir, m, checkExists))) {
      detected.push(ecosystem);
    }
  }

  let suggestedPreset: string | undefined;

  if (detected.length === 0) {
    suggestedPreset = undefined;
  } else if (detected.length === 1) {
    suggestedPreset = ECOSYSTEM_TO_PRESET[detected[0]];
  } else {
    // Multiple ecosystems: if one primary language + devops/make, use the language preset.
    // Otherwise suggest "full".
    const auxiliary = new Set<Ecosystem>(["devops", "make"]);
    const primary = detected.filter((e) => !auxiliary.has(e));

    if (primary.length === 1) {
      suggestedPreset = ECOSYSTEM_TO_PRESET[primary[0]];
    } else {
      suggestedPreset = "full";
    }
  }

  return { ecosystems: detected, suggestedPreset };
}
