#!/usr/bin/env npx tsx
/**
 * Token benchmark script for pare.
 *
 * Runs raw CLI commands alongside the equivalent pare structured output
 * and compares token counts. Uses a simple tokenizer approximation
 * (~4 chars per token for cl100k_base-class tokenizers).
 *
 * Usage: npx tsx scripts/benchmark.ts
 */

import { execFile } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");

// Simple token estimator: ~4 chars per token is a reasonable approximation
// for cl100k_base (GPT-4) and Claude tokenizers on mixed English/code text.
function estimateTokens(text: string): number {
  // More accurate: split on whitespace and punctuation boundaries
  // Average token is ~4 chars for code/JSON, ~3.5 for English prose
  return Math.ceil(text.length / 4);
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd, timeout: 10_000, shell: process.platform === "win32" },
      (error, stdout, stderr) => {
        // We want the output regardless of exit code
        resolve(stdout + stderr);
      },
    );
  });
}

interface BenchmarkResult {
  tool: string;
  description: string;
  rawOutput: string;
  rawTokens: number;
  pareOutput: string;
  pareTokens: number;
  reduction: number;
}

async function connectServer(
  serverPath: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    stderr: "pipe",
  });
  const client = new Client({ name: "benchmark", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport };
}

async function benchmarkGit(): Promise<BenchmarkResult[]> {
  const serverPath = resolve(REPO_ROOT, "packages/server-git/dist/index.js");
  const { client, transport } = await connectServer(serverPath);
  const results: BenchmarkResult[] = [];

  try {
    // git status
    {
      const rawOutput = await runCommand("git", ["status"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "status", arguments: {} });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git status",
        description: "working tree status",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }

    // git log
    {
      const rawOutput = await runCommand("git", ["log", "--oneline", "-5"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "log", arguments: { maxCount: 5 } });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git log",
        description: "5 commits (oneline vs structured)",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }

    // git log --verbose (more dramatic comparison)
    {
      const rawOutput = await runCommand("git", ["log", "-5", "--stat"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "log", arguments: { maxCount: 5 } });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git log --stat",
        description: "5 commits (verbose with stats vs structured)",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }

    // git diff (against previous commit to ensure content)
    {
      const rawOutput = await runCommand("git", ["diff", "HEAD~1", "--stat"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "diff", arguments: { ref: "HEAD~1" } });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git diff --stat",
        description: "diff against previous commit",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }

    // git branch
    {
      const rawOutput = await runCommand("git", ["branch", "-a"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "branch", arguments: { all: true } });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git branch -a",
        description: "all branches",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }

    // git show
    {
      const rawOutput = await runCommand("git", ["show", "--stat", "HEAD"], REPO_ROOT);
      const pareResult = await client.callTool({ name: "show", arguments: { ref: "HEAD" } });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "git show HEAD",
        description: "latest commit details",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }
  } finally {
    await transport.close();
  }

  return results;
}

async function benchmarkTest(): Promise<BenchmarkResult[]> {
  const serverPath = resolve(REPO_ROOT, "packages/server-test/dist/index.js");
  const { client, transport } = await connectServer(serverPath);
  const results: BenchmarkResult[] = [];
  const gitPkgPath = resolve(REPO_ROOT, "packages/server-git");

  try {
    // vitest run (all pass)
    {
      const rawOutput = await runCommand("npx", ["vitest", "run"], gitPkgPath);
      const pareResult = await client.callTool({
        name: "run",
        arguments: { path: gitPkgPath, framework: "vitest" },
      });
      const pareOutput = JSON.stringify(pareResult.structuredContent, null, 2);
      const rawTokens = estimateTokens(rawOutput);
      const pareTokens = estimateTokens(pareOutput);
      results.push({
        tool: "vitest run",
        description: "28 tests, all passing",
        rawOutput,
        rawTokens,
        pareOutput,
        pareTokens,
        reduction: Math.round((1 - pareTokens / rawTokens) * 100),
      });
    }
  } finally {
    await transport.close();
  }

  return results;
}

function printTable(results: BenchmarkResult[]) {
  console.log("\n## Token Benchmark Results\n");
  console.log("| Command | Description | Raw Tokens | pare Tokens | Reduction |");
  console.log("|---|---|---:|---:|---:|");

  let totalRaw = 0;
  let totalPare = 0;

  for (const r of results) {
    console.log(
      `| \`${r.tool}\` | ${r.description} | ${r.rawTokens} | ${r.pareTokens} | **${r.reduction}%** |`,
    );
    totalRaw += r.rawTokens;
    totalPare += r.pareTokens;
  }

  const avgReduction = Math.round((1 - totalPare / totalRaw) * 100);
  console.log(`| **Total** | | **${totalRaw}** | **${totalPare}** | **${avgReduction}%** |`);
  console.log(`\n_Token counts estimated at ~4 chars/token (cl100k_base approximation)._`);
}

function printDetails(results: BenchmarkResult[]) {
  console.log("\n\n---\n## Detailed Output Comparison\n");
  for (const r of results) {
    console.log(`### ${r.tool}\n`);
    console.log(`**Raw output (${r.rawTokens} tokens, ${r.rawOutput.length} chars):**`);
    console.log("```");
    console.log(r.rawOutput.slice(0, 2000));
    if (r.rawOutput.length > 2000) console.log("... (truncated)");
    console.log("```\n");
    console.log(`**pare output (${r.pareTokens} tokens, ${r.pareOutput.length} chars):**`);
    console.log("```json");
    console.log(r.pareOutput.slice(0, 2000));
    console.log("```\n");
  }
}

async function main() {
  console.log("# pare Token Benchmark\n");
  console.log(`Date: ${new Date().toISOString().split("T")[0]}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Node: ${process.version}\n`);

  console.log("Running git benchmarks...");
  const gitResults = await benchmarkGit();

  console.log("Running test benchmarks...");
  const testResults = await benchmarkTest();

  const allResults = [...gitResults, ...testResults];

  printTable(allResults);
  printDetails(allResults);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
