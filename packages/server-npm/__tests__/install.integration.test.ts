import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NpmInstallSchema } from "../src/schemas/index.js";

const serverPath = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/index.js");

describe("install through the MCP server", () => {
  let client: Client;
  let fixture: string;
  let project: string;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      stderr: "pipe",
    });
    client = new Client({ name: "install-test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    fixture = mkdtempSync(join(tmpdir(), "pare-install-mcp-"));
    project = join(fixture, "project with spaces");
    const dependency = join(fixture, "dependency");
    mkdirSync(project);
    mkdirSync(dependency);
    writeFileSync(
      join(dependency, "package.json"),
      JSON.stringify({ name: "fixture-dependency", version: "1.0.0", main: "index.js" }),
    );
    writeFileSync(join(dependency, "index.js"), "module.exports = 'installed';\n");
    writeFileSync(
      join(project, "package.json"),
      JSON.stringify({
        name: "install-fixture",
        version: "1.0.0",
        private: true,
        dependencies: { "fixture-dependency": "file:../dependency" },
        scripts: { postinstall: "node postinstall.cjs" },
      }),
    );
    writeFileSync(join(project, ".npmrc"), "update-notifier=false\n");
    writePostinstall(false);
  });

  afterEach(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  function writePostinstall(fail: boolean, output = "added 99 packages") {
    writeFileSync(
      join(project, "postinstall.cjs"),
      "require('node:fs').writeFileSync('postinstall-ran', 'yes');\n" +
        `console.log(${JSON.stringify(output)});\n` +
        (fail ? "process.exit(9);\n" : ""),
    );
  }

  function install(params: Record<string, unknown> = {}) {
    return client.callTool(
      {
        name: "install",
        arguments: {
          path: project,
          packageManager: "pnpm",
          pnpmReporter: "silent",
          ...params,
        },
      },
      undefined,
      { timeout: 180_000 },
    );
  }

  function textContent(result: Awaited<ReturnType<typeof install>>) {
    return result.content.flatMap((item) => (item.type === "text" ? [item.text] : [])).join("\n");
  }

  it("publishes the typed reporter in the MCP input schema", async () => {
    const { tools } = await client.listTools();
    expect(tools.find((tool) => tool.name === "install")?.inputSchema.properties).toHaveProperty(
      "pnpmReporter",
    );
  });

  it("installs a local dependency and runs explicitly enabled lifecycle scripts", async () => {
    const result = await install({ ignoreScripts: false });
    expect(result.isError).not.toBe(true);
    expect(NpmInstallSchema.parse(result.structuredContent)).toEqual({
      packageManager: "pnpm",
      lockfileChanged: true,
    });
    expect(textContent(result)).toContain("package counts unavailable");
    expect(readFileSync(join(project, "postinstall-ran"), "utf8")).toBe("yes");
    expect(
      readFileSync(join(project, "node_modules/fixture-dependency/index.js"), "utf8"),
    ).toContain("installed");
  });

  it("skips lifecycle scripts by default while still installing dependencies", async () => {
    const result = await install();
    expect(result.isError).not.toBe(true);
    expect(existsSync(join(project, "node_modules/fixture-dependency/package.json"))).toBe(true);
    expect(existsSync(join(project, "postinstall-ran"))).toBe(false);
    expect(result.structuredContent).not.toHaveProperty("added");
  });

  it("reports a silent lifecycle failure even when node_modules already exists", async () => {
    expect((await install()).isError).not.toBe(true);
    writePostinstall(true);
    const result = await install({ ignoreScripts: false });
    expect(readFileSync(join(project, "postinstall-ran"), "utf8")).toBe("yes");
    expect(result.isError).toBe(true);
    expect(textContent(result)).toMatch(/pnpm install failed \(exit code [1-9]/);
    expect(textContent(result)).not.toContain("up to date");
    expect(result.structuredContent).toBeUndefined();
  });

  it("preserves package-operand flag protection", async () => {
    const result = await install({ args: ["--reporter=silent"] });
    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain('must not start with "-"');
    expect(existsSync(join(project, "pnpm-lock.yaml"))).toBe(false);
  });

  it("sanitizes lifecycle stdout when reporting a non-silent install failure", async () => {
    const original = "C:\\Users\\review-user\\project\\error.log";
    writePostinstall(true, original);
    const result = await install({ pnpmReporter: undefined, ignoreScripts: false });
    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain("~\\project\\error.log");
    expect(textContent(result)).not.toContain(original);
  });

  it.each(["npm", "yarn"])("rejects the reporter for %s through MCP", async (pm) => {
    const result = await install({ packageManager: pm });
    expect(result.isError).toBe(true);
    expect(textContent(result)).toMatch(new RegExp(`pnpmReporter.*${pm}`));
    expect(existsSync(join(project, "node_modules"))).toBe(false);
  });

  it("sanitizes JSON-encoded lifecycle output from a real npm failure", async () => {
    const original = "C:\\Users\\review-user\\project\\error.log";
    writePostinstall(true, JSON.stringify({ message: original }));
    const result = await install({
      packageManager: "npm",
      pnpmReporter: undefined,
      ignoreScripts: false,
      noAudit: true,
    });
    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain(JSON.stringify({ message: "~\\project\\error.log" }));
    expect(textContent(result)).not.toContain(JSON.stringify(original).slice(1, -1));
  });
});
