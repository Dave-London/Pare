import type {
  CargoBuildResult,
  CargoTestResult,
  CargoClippyResult,
  CargoRunResult,
  CargoAddResult,
  CargoRemoveResult,
  CargoFmtResult,
  CargoDocResult,
} from "../schemas/index.js";

/** Formats structured cargo build results into a human-readable diagnostic summary. */
export function formatCargoBuild(data: CargoBuildResult): string {
  if (data.success && data.total === 0) return "cargo build: success, no diagnostics.";

  const status = data.success ? "success" : "failed";
  const lines = [`cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)`];
  for (const d of data.diagnostics) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo test results into a human-readable test summary with pass/fail status. */
export function formatCargoTest(data: CargoTestResult): string {
  const status = data.success ? "ok" : "FAILED";
  const lines = [
    `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored`,
  ];
  for (const t of data.tests) {
    lines.push(`  ${t.status.padEnd(7)} ${t.name}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo clippy results into a human-readable lint warning summary. */
export function formatCargoClippy(data: CargoClippyResult): string {
  if (data.total === 0) return "clippy: no warnings.";

  const lines = [`clippy: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo run output into a human-readable summary. */
export function formatCargoRun(data: CargoRunResult): string {
  const status = data.success ? "success" : "failed";
  const lines = [`cargo run: ${status} (exit code ${data.exitCode})`];
  if (data.stdout) lines.push(`stdout:\n${data.stdout}`);
  if (data.stderr) lines.push(`stderr:\n${data.stderr}`);
  return lines.join("\n");
}

/** Formats structured cargo add output into a human-readable summary. */
export function formatCargoAdd(data: CargoAddResult): string {
  if (!data.success) return "cargo add: failed";

  if (data.total === 0) return "cargo add: success, no packages added.";

  const lines = [`cargo add: ${data.total} package(s) added`];
  for (const pkg of data.added) {
    lines.push(`  ${pkg.name} v${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo remove output into a human-readable summary. */
export function formatCargoRemove(data: CargoRemoveResult): string {
  if (!data.success) return "cargo remove: failed";

  if (data.total === 0) return "cargo remove: success, no packages removed.";

  const lines = [`cargo remove: ${data.total} package(s) removed`];
  for (const name of data.removed) {
    lines.push(`  ${name}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo fmt output into a human-readable summary. */
export function formatCargoFmt(data: CargoFmtResult): string {
  if (data.success && data.filesChanged === 0) return "cargo fmt: all files formatted.";

  const status = data.success ? "success" : "needs formatting";
  const lines = [`cargo fmt: ${status} (${data.filesChanged} file(s))`];
  for (const f of data.files) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo doc output into a human-readable summary. */
export function formatCargoDoc(data: CargoDocResult): string {
  const status = data.success ? "success" : "failed";
  if (data.warnings === 0) return `cargo doc: ${status}.`;
  return `cargo doc: ${status} (${data.warnings} warning(s))`;
}
