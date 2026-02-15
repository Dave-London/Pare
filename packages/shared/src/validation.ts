/**
 * Validates that a string argument is safe to pass as a positional argument to a CLI tool.
 * Prevents flag injection attacks (e.g., passing "--output=/etc/passwd" as a ref name).
 * See: [CVE-2025-68144](https://nvd.nist.gov/vuln/detail/CVE-2025-68144), [CVE-2025-68145](https://nvd.nist.gov/vuln/detail/CVE-2025-68145)
 */
export function assertNoFlagInjection(value: string, paramName: string): void {
  if (value.trimStart().startsWith("-")) {
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

/**
 * Validates that a command is in the allowlist of safe build tools to prevent arbitrary command execution.
 *
 * Known limitation: only the basename is checked, so a path like `/tmp/evil/npm` would pass.
 * Rejecting paths entirely would break legitimate use cases (NixOS store paths, `C:\Program Files\...`,
 * non-PATH installs). Exploiting this requires placing a malicious binary on disk, which already
 * implies the system is compromised.
 *
 * Security note: When a full path is provided (containing `/` or `\`), a warning is logged because
 * basename-only validation cannot guarantee the binary at that path is the genuine tool. An attacker
 * with write access to the filesystem could place a malicious binary at a path like `/tmp/evil/npm`.
 * The warning serves as an audit trail for security-conscious deployments.
 */
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

  // Warn when a full path is used — basename-only validation cannot verify the actual binary
  if (command.includes("/") || command.includes("\\")) {
    console.warn(
      `[pare:security] Command uses a full path: "${command}". ` +
        `Only the basename "${base}" was validated against the allowlist. ` +
        `Ensure this path points to a trusted binary.`,
    );
  }
}
