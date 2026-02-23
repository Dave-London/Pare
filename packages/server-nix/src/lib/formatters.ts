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

export function formatBuild(data: NixBuildResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix build: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix build: success (${data.duration}ms).`);
  } else {
    lines.push(`nix build: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  for (const output of data.outputs) {
    lines.push(`  ${output.path}`);
  }
  for (const err of data.errors ?? []) {
    lines.push(`error: ${err}`);
  }
  return lines.join("\n");
}

export interface NixBuildCompact {
  [key: string]: unknown;
  success: boolean;
  outputCount: number;
  duration: number;
  timedOut: boolean;
}

export function compactBuildMap(data: NixBuildResult): NixBuildCompact {
  return {
    success: data.success,
    outputCount: data.outputs.length,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatBuildCompact(data: NixBuildCompact): string {
  if (data.timedOut) return `nix build: TIMED OUT after ${data.duration}ms.`;
  if (data.success)
    return `nix build: success, ${data.outputCount} output(s) (${data.duration}ms).`;
  return `nix build: failed (${data.duration}ms).`;
}

// ── nix run ──────────────────────────────────────────────────────────

export function formatRun(data: NixRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix run: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix run: success (${data.duration}ms).`);
  } else {
    lines.push(`nix run: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

export interface NixRunCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactRunMap(data: NixRunResult): NixRunCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: NixRunCompact): string {
  if (data.timedOut) return `nix run: TIMED OUT after ${data.duration}ms.`;
  if (data.success) return `nix run: success (${data.duration}ms).`;
  return `nix run: exit code ${data.exitCode} (${data.duration}ms).`;
}

// ── nix develop ──────────────────────────────────────────────────────

export function formatDevelop(data: NixDevelopResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix develop: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix develop: success (${data.duration}ms).`);
  } else {
    lines.push(`nix develop: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

export interface NixDevelopCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactDevelopMap(data: NixDevelopResult): NixDevelopCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatDevelopCompact(data: NixDevelopCompact): string {
  if (data.timedOut) return `nix develop: TIMED OUT after ${data.duration}ms.`;
  if (data.success) return `nix develop: success (${data.duration}ms).`;
  return `nix develop: exit code ${data.exitCode} (${data.duration}ms).`;
}

// ── nix shell ────────────────────────────────────────────────────────

export function formatShell(data: NixShellResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix shell: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix shell: success (${data.duration}ms).`);
  } else {
    lines.push(`nix shell: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

export interface NixShellCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactShellMap(data: NixShellResult): NixShellCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatShellCompact(data: NixShellCompact): string {
  if (data.timedOut) return `nix shell: TIMED OUT after ${data.duration}ms.`;
  if (data.success) return `nix shell: success (${data.duration}ms).`;
  return `nix shell: exit code ${data.exitCode} (${data.duration}ms).`;
}

// ── nix flake show ───────────────────────────────────────────────────

export function formatFlakeShow(data: NixFlakeShowResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix flake show: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix flake show: success (${data.duration}ms).`);
  } else {
    lines.push(`nix flake show: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.outputs) {
    for (const [key, value] of Object.entries(data.outputs)) {
      lines.push(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
    }
  }
  for (const err of data.errors ?? []) {
    lines.push(`error: ${err}`);
  }
  return lines.join("\n");
}

export interface NixFlakeShowCompact {
  [key: string]: unknown;
  success: boolean;
  outputCategories: string[];
  duration: number;
  timedOut: boolean;
}

export function compactFlakeShowMap(data: NixFlakeShowResult): NixFlakeShowCompact {
  return {
    success: data.success,
    outputCategories: data.outputs ? Object.keys(data.outputs) : [],
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatFlakeShowCompact(data: NixFlakeShowCompact): string {
  if (data.timedOut) return `nix flake show: TIMED OUT after ${data.duration}ms.`;
  if (data.success) {
    const cats = data.outputCategories.length > 0 ? data.outputCategories.join(", ") : "none";
    return `nix flake show: success, outputs: ${cats} (${data.duration}ms).`;
  }
  return `nix flake show: failed (${data.duration}ms).`;
}

// ── nix flake check ──────────────────────────────────────────────────

export function formatFlakeCheck(data: NixFlakeCheckResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`nix flake check: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`nix flake check: success, ${data.checks.length} check(s) (${data.duration}ms).`);
  } else {
    lines.push(`nix flake check: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  for (const check of data.checks) {
    lines.push(`  ${check.name}: ${check.status}`);
  }
  for (const warn of data.warnings) {
    lines.push(`warning: ${warn}`);
  }
  for (const err of data.errors) {
    lines.push(`error: ${err}`);
  }
  return lines.join("\n");
}

export interface NixFlakeCheckCompact {
  [key: string]: unknown;
  success: boolean;
  checkCount: number;
  errorCount: number;
  duration: number;
  timedOut: boolean;
}

export function compactFlakeCheckMap(data: NixFlakeCheckResult): NixFlakeCheckCompact {
  return {
    success: data.success,
    checkCount: data.checks.length,
    errorCount: data.errors.length,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatFlakeCheckCompact(data: NixFlakeCheckCompact): string {
  if (data.timedOut) return `nix flake check: TIMED OUT after ${data.duration}ms.`;
  if (data.success)
    return `nix flake check: ${data.checkCount} check(s) passed (${data.duration}ms).`;
  return `nix flake check: failed, ${data.errorCount} error(s) (${data.duration}ms).`;
}

// ── nix flake update ─────────────────────────────────────────────────

export function formatFlakeUpdate(data: NixFlakeUpdateResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `nix flake update: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(
      `nix flake update: success, ${data.updatedInputs.length} input(s) updated (${data.duration}ms).`,
    );
  } else {
    lines.push(`nix flake update: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  for (const input of data.updatedInputs) {
    const parts = [`  ${input.name}`];
    if (input.oldRev) parts.push(`${input.oldRev}`);
    if (input.newRev) parts.push(`-> ${input.newRev}`);
    lines.push(parts.join(" "));
  }
  for (const err of data.errors) {
    lines.push(`error: ${err}`);
  }
  return lines.join("\n");
}

export interface NixFlakeUpdateCompact {
  [key: string]: unknown;
  success: boolean;
  updatedCount: number;
  duration: number;
  timedOut: boolean;
}

export function compactFlakeUpdateMap(data: NixFlakeUpdateResult): NixFlakeUpdateCompact {
  return {
    success: data.success,
    updatedCount: data.updatedInputs.length,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatFlakeUpdateCompact(data: NixFlakeUpdateCompact): string {
  if (data.timedOut) return `nix flake update: TIMED OUT after ${data.duration}ms.`;
  if (data.success)
    return `nix flake update: ${data.updatedCount} input(s) updated (${data.duration}ms).`;
  return `nix flake update: failed (${data.duration}ms).`;
}
