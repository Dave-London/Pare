import { run, type RunResult } from "@paretools/shared";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type JvmTool = "gradle" | "maven";

const TIMEOUT = 300_000;

/**
 * Detects whether to use Gradle or Maven based on project files.
 * Checks for Gradle wrapper / build files first, then Maven pom.xml.
 */
export function detectTool(cwd: string): JvmTool {
  if (
    existsSync(join(cwd, "gradlew")) ||
    existsSync(join(cwd, "gradlew.bat")) ||
    existsSync(join(cwd, "build.gradle")) ||
    existsSync(join(cwd, "build.gradle.kts")) ||
    existsSync(join(cwd, "settings.gradle")) ||
    existsSync(join(cwd, "settings.gradle.kts"))
  ) {
    return "gradle";
  }
  return "maven";
}

/**
 * Resolves which Gradle executable to use.
 * Prefers the Gradle wrapper (./gradlew) if present; falls back to `gradle`.
 */
function resolveGradleCmd(cwd: string): string {
  if (process.platform === "win32" && existsSync(join(cwd, "gradlew.bat"))) {
    return join(cwd, "gradlew.bat");
  }
  if (existsSync(join(cwd, "gradlew"))) {
    return join(cwd, "gradlew");
  }
  return "gradle";
}

/**
 * Resolves which Maven executable to use.
 * Prefers the Maven wrapper (./mvnw) if present; falls back to `mvn`.
 */
function resolveMvnCmd(cwd: string): string {
  if (process.platform === "win32" && existsSync(join(cwd, "mvnw.cmd"))) {
    return join(cwd, "mvnw.cmd");
  }
  if (existsSync(join(cwd, "mvnw"))) {
    return join(cwd, "mvnw");
  }
  return "mvn";
}

/** Runs a Gradle command with the given arguments. */
export async function gradleCmd(args: string[], cwd: string): Promise<RunResult> {
  const cmd = resolveGradleCmd(cwd);
  // Always use --console=plain for parseable output
  return run(cmd, ["--console=plain", ...args], { cwd, timeout: TIMEOUT });
}

/** Runs a Maven command with the given arguments. */
export async function mvnCmd(args: string[], cwd: string): Promise<RunResult> {
  const cmd = resolveMvnCmd(cwd);
  // Use batch mode for non-interactive, parseable output
  return run(cmd, ["-B", ...args], { cwd, timeout: TIMEOUT });
}
