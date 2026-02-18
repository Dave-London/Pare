#!/usr/bin/env npx tsx
/**
 * Smoke test coverage report.
 *
 * Parses all scenario mapping files in tests/smoke/scenarios/ and reports
 * coverage by status (mocked / recorded / complete) and priority (P0-P2).
 *
 * Usage:
 *   pnpm smoke:coverage          # print coverage report
 *   pnpm smoke:coverage --json   # output as JSON (for CI)
 *   pnpm smoke:coverage --check  # exit 1 if any P0 scenario is not complete
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const SCENARIOS_DIR = resolve(ROOT, "tests/smoke/scenarios");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = "pending" | "mocked" | "recorded" | "complete";
type Priority = "P0" | "P1" | "P2";

interface Scenario {
  file: string;
  number: number;
  name: string;
  priority: Priority;
  status: Status;
}

interface FileSummary {
  file: string;
  total: number;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, Record<Status, number>>;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const STATUS_VALUES: Status[] = ["pending", "mocked", "recorded", "complete"];
const PRIORITY_VALUES: Priority[] = ["P0", "P1", "P2"];

function parseScenarioFile(filePath: string, fileName: string): Scenario[] {
  const content = readFileSync(filePath, "utf-8");
  const scenarios: Scenario[] = [];

  // Match markdown table rows with status column
  // Format: | # | Scenario | Params | Expected Output | Priority | Status |
  // The status is always the last column before the trailing |
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip non-table rows and header/separator rows
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 3) continue;

    // Find status column (last cell) and priority column (second to last)
    const statusCell = cells[cells.length - 1].toLowerCase();
    const priorityCell = cells[cells.length - 2].toUpperCase();

    // Validate this is a data row with valid status and priority
    const status = STATUS_VALUES.find((s) => statusCell === s);
    const priority = PRIORITY_VALUES.find((p) => priorityCell === p);

    if (!status || !priority) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    scenarios.push({
      file: fileName,
      number: num,
      name: cells[1],
      priority,
      status,
    });
  }

  return scenarios;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function summarizeFile(fileName: string, scenarios: Scenario[]): FileSummary {
  const byStatus: Record<Status, number> = { pending: 0, mocked: 0, recorded: 0, complete: 0 };
  const byPriority: Record<Priority, Record<Status, number>> = {
    P0: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
    P1: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
    P2: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
  };

  for (const s of scenarios) {
    byStatus[s.status]++;
    byPriority[s.priority][s.status]++;
  }

  return { file: fileName, total: scenarios.length, byStatus, byPriority };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printReport(summaries: FileSummary[]) {
  const totals: Record<Status, number> = { pending: 0, mocked: 0, recorded: 0, complete: 0 };
  const totalByPriority: Record<Priority, Record<Status, number>> = {
    P0: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
    P1: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
    P2: { pending: 0, mocked: 0, recorded: 0, complete: 0 },
  };
  let grandTotal = 0;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              Smoke Test Coverage Report                     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("");

  for (const s of summaries) {
    const pct = s.total > 0 ? Math.round((s.byStatus.complete / s.total) * 100) : 0;
    const bar = progressBar(pct, 20);
    console.log(`  ${s.file.padEnd(25)} ${bar} ${pct}% (${s.byStatus.complete}/${s.total})`);

    for (const status of STATUS_VALUES) {
      totals[status] += s.byStatus[status];
    }
    for (const p of PRIORITY_VALUES) {
      for (const status of STATUS_VALUES) {
        totalByPriority[p][status] += s.byPriority[p][status];
      }
    }
    grandTotal += s.total;
  }

  const overallPct = grandTotal > 0 ? Math.round((totals.complete / grandTotal) * 100) : 0;

  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("");
  console.log("  By Status:");
  console.log(`    complete:  ${totals.complete}`);
  console.log(`    recorded:  ${totals.recorded}`);
  console.log(`    mocked:    ${totals.mocked}`);
  console.log(`    pending:   ${totals.pending}`);
  console.log(`    TOTAL:     ${grandTotal}`);
  console.log("");
  console.log("  By Priority:");
  for (const p of PRIORITY_VALUES) {
    const row = totalByPriority[p];
    const pTotal = row.pending + row.mocked + row.recorded + row.complete;
    const pPct = pTotal > 0 ? Math.round((row.complete / pTotal) * 100) : 0;
    console.log(
      `    ${p}: ${row.complete}/${pTotal} complete (${pPct}%) | recorded: ${row.recorded} | mocked: ${row.mocked}`,
    );
  }
  console.log("");
  console.log(`  Overall: ${progressBar(overallPct, 30)} ${overallPct}% complete`);
  console.log("");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function progressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return "[" + "#".repeat(filled) + "-".repeat(empty) + "]";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const files = readdirSync(SCENARIOS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

const allScenarios: Scenario[] = [];
const summaries: FileSummary[] = [];

for (const file of files) {
  const scenarios = parseScenarioFile(resolve(SCENARIOS_DIR, file), file);
  allScenarios.push(...scenarios);
  summaries.push(summarizeFile(file, scenarios));
}

if (jsonMode) {
  const totals: Record<Status, number> = { pending: 0, mocked: 0, recorded: 0, complete: 0 };
  let grandTotal = 0;
  for (const s of summaries) {
    for (const status of STATUS_VALUES) {
      totals[status] += s.byStatus[status];
    }
    grandTotal += s.total;
  }
  console.log(
    JSON.stringify(
      {
        files: summaries,
        totals,
        grandTotal,
        completePct: grandTotal > 0 ? Math.round((totals.complete / grandTotal) * 100) : 0,
      },
      null,
      2,
    ),
  );
} else {
  printReport(summaries);
}

if (checkMode) {
  const incompleteP0 = allScenarios.filter((s) => s.priority === "P0" && s.status !== "complete");
  if (incompleteP0.length > 0) {
    console.error(`\nFAIL: ${incompleteP0.length} P0 scenarios are not complete:\n`);
    for (const s of incompleteP0.slice(0, 20)) {
      console.error(`  ${s.file} #${s.number}: ${s.name} (${s.status})`);
    }
    if (incompleteP0.length > 20) {
      console.error(`  ... and ${incompleteP0.length - 20} more`);
    }
    process.exit(1);
  }
  console.log("\nPASS: All P0 scenarios are complete.");
}
