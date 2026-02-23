import type { HealthResult } from "./health-check.js";

/** Format doctor results as a terminal-friendly report. */
export function formatReport(results: HealthResult[]): string {
  const lines: string[] = [];
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  lines.push("");
  lines.push("Pare Doctor Report");
  lines.push("─".repeat(60));

  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : "FAIL";
    const tools = r.toolCount !== undefined ? `${r.toolCount} tools` : "";
    const latency = r.latencyMs !== undefined ? `${r.latencyMs}ms` : "";
    const info = [tools, latency].filter(Boolean).join(", ");
    const detail = r.error ? ` — ${r.error}` : "";

    lines.push(`  [${icon}] ${r.serverId}${info ? ` (${info})` : ""}${detail}`);
    if (r.warning) {
      lines.push(`         Warning: ${r.warning}`);
    }
  }

  lines.push("─".repeat(60));
  lines.push(`  ${passed} passed, ${failed} failed, ${results.length} total`);
  lines.push("");

  return lines.join("\n");
}
