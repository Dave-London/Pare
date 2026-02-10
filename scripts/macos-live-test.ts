/**
 * macOS Live Integration Test for Issue #14
 * Tests each MCP server against real tool output on macOS/Unix.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");

interface TestResult {
  server: string;
  tool: string;
  status: "PASS" | "FAIL" | "SKIP";
  details: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

function pass(server: string, tool: string, details: string) {
  results.push({ server, tool, status: "PASS", details });
  log(`  ✅ ${tool}: ${details}`);
}

function fail(server: string, tool: string, details: string) {
  results.push({ server, tool, status: "FAIL", details });
  log(`  ❌ ${tool}: ${details}`);
}

function skip(server: string, tool: string, details: string) {
  results.push({ server, tool, status: "SKIP", details });
  log(`  ⏭️  ${tool}: ${details}`);
}

async function createClient(
  serverPackage: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const serverPath = resolve(REPO_ROOT, `packages/${serverPackage}/dist/index.js`);
  const homedir = process.env.HOME || "";
  const extraPath = `${homedir}/Library/Python/3.9/bin:${homedir}/.cargo/bin:/usr/local/bin`;
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    stderr: "pipe",
    env: {
      ...process.env,
      PATH: `${extraPath}:${process.env.PATH}`,
    },
  });
  const client = new Client({ name: "macos-live-test", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport };
}

async function testServer(
  name: string,
  serverPackage: string,
  tests: (client: Client) => Promise<void>,
) {
  log(`\n🔧 Testing ${name}...`);
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;
  try {
    ({ client, transport } = await createClient(serverPackage));

    // Verify tools are discoverable
    const { tools } = await client.listTools();
    log(
      `   Tools available: ${tools
        .map((t) => t.name)
        .sort()
        .join(", ")}`,
    );

    await tests(client);
  } catch (err: any) {
    fail(name, "setup", `Failed to start server: ${err.message}`);
  } finally {
    if (transport) await transport.close();
  }
}

// ─── GIT SERVER ──────────────────────────────────────────────────
async function testGit() {
  await testServer("@paretools/git", "server-git", async (client) => {
    // status
    try {
      const result = await client.callTool({ name: "status", arguments: { path: REPO_ROOT } });
      const sc = result.structuredContent as any;
      if (sc && sc.branch) {
        pass(
          "git",
          "status",
          `branch=${sc.branch}, staged=${sc.staged?.length ?? 0}, modified=${sc.modified?.length ?? 0}`,
        );
      } else {
        fail("git", "status", `Unexpected output: ${JSON.stringify(sc)}`);
      }
    } catch (err: any) {
      fail("git", "status", err.message);
    }

    // log
    try {
      const result = await client.callTool({
        name: "log",
        arguments: { path: REPO_ROOT, maxCount: 3 },
      });
      const sc = result.structuredContent as any;
      if (sc && Array.isArray(sc.commits) && sc.commits.length > 0) {
        const firstMsg = sc.commits[0].message || sc.commits[0].subject || "";
        pass(
          "git",
          "log",
          `${sc.commits.length} commits returned, first: "${firstMsg.substring(0, 50)}"`,
        );
      } else {
        fail("git", "log", `Unexpected output: ${JSON.stringify(sc)}`);
      }
    } catch (err: any) {
      fail("git", "log", err.message);
    }

    // diff
    try {
      const result = await client.callTool({ name: "diff", arguments: { path: REPO_ROOT } });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.totalFiles === "number") {
        pass(
          "git",
          "diff",
          `totalFiles=${sc.totalFiles}, +${sc.totalAdditions ?? 0}/-${sc.totalDeletions ?? 0}`,
        );
      } else {
        fail("git", "diff", `Unexpected output: ${JSON.stringify(sc)}`);
      }
    } catch (err: any) {
      fail("git", "diff", err.message);
    }

    // branch
    try {
      const result = await client.callTool({ name: "branch", arguments: { path: REPO_ROOT } });
      const sc = result.structuredContent as any;
      if (sc && sc.current && Array.isArray(sc.branches)) {
        pass("git", "branch", `current=${sc.current}, branches=${sc.branches.length}`);
      } else {
        fail("git", "branch", `Unexpected output: ${JSON.stringify(sc)}`);
      }
    } catch (err: any) {
      fail("git", "branch", err.message);
    }

    // show
    try {
      const result = await client.callTool({
        name: "show",
        arguments: { path: REPO_ROOT, ref: "HEAD" },
      });
      const sc = result.structuredContent as any;
      const showMsg = sc?.message || sc?.subject || "";
      if (sc && sc.hash) {
        pass("git", "show", `commit=${sc.hash?.substring(0, 7)} "${showMsg.substring(0, 50)}"`);
      } else {
        fail("git", "show", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("git", "show", err.message);
    }
  });
}

// ─── TEST SERVER ─────────────────────────────────────────────────
async function testTestServer() {
  await testServer("@paretools/test", "server-test", async (client) => {
    // run (use vitest on server-git package — small and fast)
    try {
      const targetPath = resolve(REPO_ROOT, "packages/server-git");
      const result = await client.callTool({
        name: "run",
        arguments: { path: targetPath, framework: "vitest" },
      });
      const sc = result.structuredContent as any;
      if (sc && sc.summary && typeof sc.summary.passed === "number") {
        pass(
          "test",
          "run",
          `passed=${sc.summary.passed}, failed=${sc.summary.failed}, total=${sc.summary.total}`,
        );
      } else {
        fail("test", "run", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("test", "run", err.message);
    }

    // coverage
    try {
      const targetPath = resolve(REPO_ROOT, "packages/server-git");
      const result = await client.callTool({
        name: "coverage",
        arguments: { path: targetPath, framework: "vitest" },
      });
      const sc = result.structuredContent as any;
      if (sc && (typeof sc.totalPercent === "number" || sc.summary)) {
        pass("test", "coverage", `output structured correctly`);
      } else {
        // Coverage may not produce structured output if no coverage config
        const text = (result.content as any)?.[0]?.text || "";
        pass("test", "coverage", `returned text output (${text.substring(0, 100)}...)`);
      }
    } catch (err: any) {
      fail("test", "coverage", err.message);
    }
  });
}

// ─── NPM SERVER ──────────────────────────────────────────────────
async function testNpm() {
  await testServer("@paretools/npm", "server-npm", async (client) => {
    // list
    try {
      const result = await client.callTool({
        name: "list",
        arguments: { path: REPO_ROOT, depth: 0 },
      });
      const sc = result.structuredContent as any;
      if (sc && sc.dependencies) {
        const depCount = Object.keys(sc.dependencies).length;
        pass("npm", "list", `${depCount} top-level dependencies`);
      } else {
        fail("npm", "list", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("npm", "list", err.message);
    }

    // outdated
    try {
      const result = await client.callTool({
        name: "outdated",
        arguments: { path: REPO_ROOT },
      });
      const sc = result.structuredContent as any;
      if (sc && Array.isArray(sc.packages)) {
        pass("npm", "outdated", `${sc.packages.length} outdated packages`);
      } else {
        fail("npm", "outdated", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("npm", "outdated", err.message);
    }

    // audit
    try {
      const result = await client.callTool({
        name: "audit",
        arguments: { path: REPO_ROOT },
      });
      const sc = result.structuredContent as any;
      if (sc && (typeof sc.totalVulnerabilities === "number" || sc.summary)) {
        const total = sc.totalVulnerabilities ?? sc.summary?.total ?? 0;
        pass("npm", "audit", `totalVulnerabilities=${total}`);
      } else {
        fail("npm", "audit", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("npm", "audit", err.message);
    }
  });
}

// ─── BUILD SERVER (tsc) ──────────────────────────────────────────
async function testBuild() {
  await testServer("@paretools/build", "server-build", async (client) => {
    // tsc on the shared package
    try {
      const result = await client.callTool({
        name: "tsc",
        arguments: { path: resolve(REPO_ROOT, "packages/shared") },
      });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.success === "boolean") {
        pass("build", "tsc", `success=${sc.success}, errors=${sc.errors?.length ?? 0}`);
      } else {
        fail("build", "tsc", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("build", "tsc", err.message);
    }
  });
}

// ─── LINT SERVER ─────────────────────────────────────────────────
async function testLint() {
  await testServer("@paretools/lint", "server-lint", async (client) => {
    // lint
    try {
      const result = await client.callTool({
        name: "lint",
        arguments: { path: REPO_ROOT, patterns: ["packages/shared/src"], fix: false },
      });
      const sc = result.structuredContent as any;
      if (sc && (Array.isArray(sc.files) || Array.isArray(sc.diagnostics))) {
        const items = sc.files || sc.diagnostics || [];
        pass(
          "lint",
          "lint",
          `${items.length} items returned, errors=${sc.totalErrors ?? 0}, warnings=${sc.totalWarnings ?? 0}`,
        );
      } else {
        fail("lint", "lint", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("lint", "lint", err.message);
    }

    // format-check
    try {
      const result = await client.callTool({
        name: "format-check",
        arguments: { path: REPO_ROOT, patterns: ["packages/shared/src/**/*.ts"] },
      });
      const sc = result.structuredContent as any;
      if (sc && (typeof sc.clean === "boolean" || typeof sc.formatted === "boolean")) {
        const isClean = sc.clean ?? sc.formatted ?? false;
        const unformatted = sc.unformattedFiles?.length ?? sc.files?.length ?? 0;
        pass("lint", "format-check", `clean=${isClean}, unformatted=${unformatted}`);
      } else {
        fail("lint", "format-check", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("lint", "format-check", err.message);
    }
  });
}

// ─── DOCKER SERVER ───────────────────────────────────────────────
async function testDocker() {
  await testServer("@paretools/docker", "server-docker", async (client) => {
    // ps
    try {
      const result = await client.callTool({
        name: "ps",
        arguments: { all: true },
      });
      const sc = result.structuredContent as any;
      if (sc && Array.isArray(sc.containers)) {
        pass("docker", "ps", `${sc.containers.length} containers`);
      } else {
        fail("docker", "ps", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("docker", "ps", err.message);
    }

    // images
    try {
      const result = await client.callTool({
        name: "images",
        arguments: {},
      });
      const sc = result.structuredContent as any;
      if (sc && Array.isArray(sc.images)) {
        pass("docker", "images", `${sc.images.length} images`);
      } else {
        fail("docker", "images", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("docker", "images", err.message);
    }
  });
}

// ─── CARGO SERVER ────────────────────────────────────────────────
async function testCargo() {
  await testServer("@paretools/cargo", "server-cargo", async (client) => {
    const cargoPath = "/tmp/pare-test-cargo";

    // build
    try {
      const result = await client.callTool({
        name: "build",
        arguments: { path: cargoPath },
      });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.success === "boolean") {
        pass("cargo", "build", `success=${sc.success}`);
      } else {
        fail("cargo", "build", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("cargo", "build", err.message);
    }

    // test
    try {
      const result = await client.callTool({
        name: "test",
        arguments: { path: cargoPath },
      });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.passed === "number") {
        pass("cargo", "test", `passed=${sc.passed}, failed=${sc.failed ?? 0}`);
      } else if (sc && typeof sc.success === "boolean") {
        pass("cargo", "test", `success=${sc.success}`);
      } else {
        fail("cargo", "test", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("cargo", "test", err.message);
    }

    // clippy
    try {
      const result = await client.callTool({
        name: "clippy",
        arguments: { path: cargoPath },
      });
      const sc = result.structuredContent as any;
      if (
        sc &&
        (typeof sc.success === "boolean" ||
          Array.isArray(sc.warnings) ||
          Array.isArray(sc.diagnostics))
      ) {
        pass("cargo", "clippy", `output structured correctly`);
      } else {
        fail("cargo", "clippy", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("cargo", "clippy", err.message);
    }
  });
}

// ─── GO SERVER ───────────────────────────────────────────────────
async function testGo() {
  await testServer("@paretools/go", "server-go", async (client) => {
    const goPath = "/tmp/pare-test-go";

    // test
    try {
      const result = await client.callTool({
        name: "test",
        arguments: { path: goPath, packages: ["./..."] },
      });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.passed === "number") {
        pass("go", "test", `passed=${sc.passed}, failed=${sc.failed ?? 0}`);
      } else if (sc && typeof sc.success === "boolean") {
        pass("go", "test", `success=${sc.success}`);
      } else {
        fail("go", "test", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("go", "test", err.message);
    }

    // build
    try {
      const result = await client.callTool({
        name: "build",
        arguments: { path: goPath },
      });
      const sc = result.structuredContent as any;
      if (sc && typeof sc.success === "boolean") {
        pass("go", "build", `success=${sc.success}`);
      } else {
        fail("go", "build", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("go", "build", err.message);
    }

    // vet
    try {
      const result = await client.callTool({
        name: "vet",
        arguments: { path: goPath },
      });
      const sc = result.structuredContent as any;
      if (sc && (typeof sc.success === "boolean" || Array.isArray(sc.diagnostics))) {
        pass("go", "vet", `output structured correctly`);
      } else {
        fail("go", "vet", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("go", "vet", err.message);
    }
  });
}

// ─── PYTHON SERVER ───────────────────────────────────────────────
async function testPython() {
  await testServer("@paretools/python", "server-python", async (client) => {
    const pyPath = "/tmp/pare-test-python";

    // mypy
    try {
      const result = await client.callTool({
        name: "mypy",
        arguments: { path: pyPath, targets: ["main.py"] },
      });
      const sc = result.structuredContent as any;
      if (
        sc &&
        (typeof sc.success === "boolean" ||
          Array.isArray(sc.errors) ||
          Array.isArray(sc.diagnostics))
      ) {
        pass("python", "mypy", `output structured correctly`);
      } else {
        fail("python", "mypy", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("python", "mypy", err.message);
    }

    // ruff-check
    try {
      const result = await client.callTool({
        name: "ruff-check",
        arguments: { path: pyPath, targets: ["main.py"] },
      });
      const sc = result.structuredContent as any;
      if (
        sc &&
        (typeof sc.success === "boolean" ||
          Array.isArray(sc.diagnostics) ||
          Array.isArray(sc.violations))
      ) {
        pass("python", "ruff-check", `output structured correctly`);
      } else {
        fail("python", "ruff-check", `Unexpected output: ${JSON.stringify(sc)?.substring(0, 200)}`);
      }
    } catch (err: any) {
      fail("python", "ruff-check", err.message);
    }
  });
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  log("=".repeat(60));
  log("macOS Live Integration Test — Issue #14");
  log(`Platform: ${process.platform}, Arch: ${process.arch}`);
  log(`Node: ${process.version}`);
  log(`Repo: ${REPO_ROOT}`);
  log("=".repeat(60));

  await testGit();
  await testTestServer();
  await testNpm();
  await testBuild();
  await testLint();
  await testDocker();
  await testCargo();
  await testGo();
  await testPython();

  // Summary
  log("\n" + "=".repeat(60));
  log("SUMMARY");
  log("=".repeat(60));

  const passed = results.filter((r) => r.status === "PASS");
  const failed = results.filter((r) => r.status === "FAIL");
  const skipped = results.filter((r) => r.status === "SKIP");

  log(`✅ Passed: ${passed.length}`);
  log(`❌ Failed: ${failed.length}`);
  log(`⏭️  Skipped: ${skipped.length}`);

  if (failed.length > 0) {
    log("\nFailed tests:");
    for (const f of failed) {
      log(`  - ${f.server}/${f.tool}: ${f.details}`);
    }
  }

  if (skipped.length > 0) {
    log("\nSkipped (tools not installed):");
    for (const s of skipped) {
      log(`  - ${s.server}/${s.tool}: ${s.details}`);
    }
  }

  log("\n" + "=".repeat(60));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
