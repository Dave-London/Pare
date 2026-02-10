/**
 * Validates that a string argument is safe to pass as a positional argument to a CLI tool.
 * Prevents flag injection attacks (e.g., passing "--output=/etc/passwd" as a ref name).
 * See: CVE-2025-68144, CVE-2025-68145
 */
export function assertNoFlagInjection(value: string, paramName: string): void {
  if (value.startsWith("-")) {
    throw new Error(
      `Invalid ${paramName}: "${value}". Values must not start with "-" to prevent argument injection.`,
    );
  }
}

/**
 * Allowlist of known safe build commands.
 * Prevents arbitrary command execution via the build tool's command parameter.
 */
const ALLOWED_BUILD_COMMANDS = new Set([
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "bunx",
  "make",
  "cmake",
  "gradle",
  "gradlew",
  "mvn",
  "ant",
  "cargo",
  "go",
  "dotnet",
  "msbuild",
  "tsc",
  "esbuild",
  "vite",
  "webpack",
  "rollup",
  "turbo",
  "nx",
  "bazel",
]);

export function assertAllowedCommand(command: string): void {
  // Extract the base command name (handle paths like /usr/bin/npm or C:\npm.cmd)
  const base =
    command
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/\.(cmd|exe|bat|sh)$/i, "") ?? "";

  if (!ALLOWED_BUILD_COMMANDS.has(base)) {
    throw new Error(
      `Command "${command}" is not in the allowed build commands list. ` +
        `Allowed: ${[...ALLOWED_BUILD_COMMANDS].sort().join(", ")}`,
    );
  }
}
