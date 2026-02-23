import type {
  NixBuildResult,
  NixRunResult,
  NixDevelopResult,
  NixShellResult,
  NixFlakeShowResult,
  NixFlakeCheckResult,
  NixFlakeUpdateResult,
} from "../schemas/index.js";

// ── nix build ────────────────────────────────────────────────────────

/**
 * Parses `nix build` output into structured result data.
 *
 * When `--print-out-paths` is used, stdout contains one output path per line.
 * Errors appear on stderr prefixed with `error:`.
 */
export function parseBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixBuildResult {
  const success = exitCode === 0 && !timedOut;

  // Parse output paths from stdout (one per line, from --print-out-paths)
  const outputs = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("/nix/store/"))
    .map((path) => ({ path }));

  // Parse errors from stderr
  const errors = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("error:"))
    .map((line) => line.replace(/^error:\s*/, ""));

  return {
    success,
    exitCode,
    outputs,
    errors: errors.length > 0 ? errors : undefined,
    duration,
    timedOut,
  };
}

// ── nix run ──────────────────────────────────────────────────────────

/**
 * Parses `nix run` output into structured result data.
 */
export function parseRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixRunResult {
  const success = exitCode === 0 && !timedOut;
  return {
    success,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── nix develop ──────────────────────────────────────────────────────

/**
 * Parses `nix develop` output into structured result data.
 */
export function parseDevelopOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixDevelopResult {
  const success = exitCode === 0 && !timedOut;
  return {
    success,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── nix shell ────────────────────────────────────────────────────────

/**
 * Parses `nix shell` output into structured result data.
 */
export function parseShellOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixShellResult {
  const success = exitCode === 0 && !timedOut;
  return {
    success,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── nix flake show ───────────────────────────────────────────────────

/**
 * Parses `nix flake show --json` output into structured result data.
 *
 * The JSON output is a nested tree of flake outputs:
 * ```json
 * {
 *   "packages": {"x86_64-linux": {"default": {"type": "derivation", "name": "hello"}}},
 *   "devShells": { ... },
 *   "checks": { ... }
 * }
 * ```
 */
export function parseFlakeShowOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixFlakeShowResult {
  const success = exitCode === 0 && !timedOut;

  let outputs: Record<string, unknown> | undefined;
  if (success && stdout.trim()) {
    try {
      outputs = JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch {
      // JSON parse failed — leave outputs undefined
    }
  }

  const errors = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("error:"))
    .map((line) => line.replace(/^error:\s*/, ""));

  return {
    success,
    exitCode,
    outputs,
    errors: errors.length > 0 ? errors : undefined,
    duration,
    timedOut,
  };
}

// ── nix flake check ──────────────────────────────────────────────────

/**
 * Parses `nix flake check` stderr output into structured result data.
 *
 * Example stderr:
 * ```
 * warning: Git tree '/home/user/project' is dirty
 * checking NixOS configuration 'nixosConfigurations.default'...
 * checking derivation 'checks.x86_64-linux.tests'...
 * ```
 *
 * Error lines start with `error:`. Check lines contain `checking`.
 */
export function parseFlakeCheckOutput(
  _stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixFlakeCheckResult {
  const success = exitCode === 0 && !timedOut;
  const lines = stderr.split("\n").map((line) => line.trim());

  const checks: { name: string; status: "pass" | "fail" | "unknown" }[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    if (!line) continue;

    if (line.startsWith("error:")) {
      errors.push(line.replace(/^error:\s*/, ""));
      continue;
    }

    if (line.startsWith("warning:")) {
      warnings.push(line.replace(/^warning:\s*/, ""));
      continue;
    }

    // Match "checking derivation 'checks.x86_64-linux.tests'..." or
    // "checking NixOS configuration 'nixosConfigurations.default'..."
    const checkMatch = line.match(/^checking\s+(?:derivation|NixOS configuration)\s+'([^']+)'/);
    if (checkMatch) {
      checks.push({
        name: checkMatch[1],
        status: success ? "pass" : "unknown",
      });
    }
  }

  // If there were errors, mark all checks as "unknown" since we can't tell which failed
  if (errors.length > 0) {
    for (const check of checks) {
      check.status = "unknown";
    }
  }

  return {
    success,
    exitCode,
    checks,
    errors,
    warnings,
    duration,
    timedOut,
  };
}

// ── nix flake update ─────────────────────────────────────────────────

/**
 * Parses `nix flake update` stderr output into structured result data.
 *
 * Nix 2.19+ format:
 * ```
 * * Updated input 'nixpkgs':
 *     'github:NixOS/nixpkgs/abc123' (2024-01-01)
 *   -> 'github:NixOS/nixpkgs/def456' (2024-02-01)
 * ```
 *
 * The bullet may be `*` or a Unicode bullet `\u2022`.
 */
export function parseFlakeUpdateOutput(
  _stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): NixFlakeUpdateResult {
  const success = exitCode === 0 && !timedOut;
  const lines = stderr.split("\n");

  const updatedInputs: { name: string; oldRev?: string; newRev?: string }[] = [];
  const errors: string[] = [];

  let currentInput: { name: string; oldRev?: string; newRev?: string } | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("error:")) {
      errors.push(trimmed.replace(/^error:\s*/, ""));
      continue;
    }

    // Match "* Updated input 'nixpkgs':" or "\u2022 Updated input 'nixpkgs':"
    const updatedMatch = trimmed.match(/^[*\u2022]\s+Updated input '([^']+)'/);
    if (updatedMatch) {
      currentInput = { name: updatedMatch[1] };
      updatedInputs.push(currentInput);
      continue;
    }

    if (currentInput) {
      // Match old rev: "'github:NixOS/nixpkgs/abc123' (2024-01-01)"
      const oldMatch = trimmed.match(/^'[^/]+\/[^/]+\/([^']+)'/);
      if (oldMatch && !currentInput.oldRev) {
        currentInput.oldRev = oldMatch[1];
        continue;
      }

      // Match new rev: "-> 'github:NixOS/nixpkgs/def456' (2024-02-01)" or with unicode arrow
      const newMatch = trimmed.match(/^(?:->|\u2192)\s+'[^/]+\/[^/]+\/([^']+)'/);
      if (newMatch) {
        currentInput.newRev = newMatch[1];
        currentInput = undefined;
        continue;
      }
    }
  }

  return {
    success,
    exitCode,
    updatedInputs,
    errors,
    duration,
    timedOut,
  };
}
