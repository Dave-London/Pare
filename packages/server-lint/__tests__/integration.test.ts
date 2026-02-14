import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const FIXTURES_DIR = resolve(__dirname, "fixtures");

/** MCP SDK defaults to 60 s request timeout; override for CI where npx + cmd.exe is slow. */
const CALL_TIMEOUT = { timeout: 120_000 };

// ---------------------------------------------------------------------------
// Tool listing & schema tests
// ---------------------------------------------------------------------------

describe("@paretools/lint integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
  });

  it("lists all 7 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "biome-check",
      "biome-format",
      "format-check",
      "lint",
      "oxlint",
      "prettier-format",
      "stylelint",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  it("each tool has a title and description", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.title).toBeDefined();
      expect(typeof tool.title).toBe("string");
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.description!.length).toBeGreaterThan(10);
    }
  });

  // -------------------------------------------------------------------------
  // ESLint (lint tool)
  // -------------------------------------------------------------------------

  describe("lint", () => {
    it("returns structured ESLint diagnostics for clean code", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        { name: "lint", arguments: { path: pkgPath, patterns: ["src/"], compact: false } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.filesChecked).toEqual(expect.any(Number));
      // With compact=false, diagnostics should always be present as array
      expect(Array.isArray(sc.diagnostics)).toBe(true);
    });

    it("detects lint errors in a fixture project with intentional issues", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "eslint-project");
      const result = await client.callTool(
        { name: "lint", arguments: { path: fixturePath, patterns: ["src/"], compact: false } },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.filesChecked).toEqual(expect.any(Number));
      expect(sc.filesChecked as number).toBeGreaterThanOrEqual(1);
      // The fixture has intentional errors (no-console, eqeqeq)
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.total as number).toBeGreaterThan(0);

      // Verify diagnostics array contains actual diagnostic objects
      const diagnostics = sc.diagnostics as Array<Record<string, unknown>>;
      expect(Array.isArray(diagnostics)).toBe(true);
      expect(diagnostics.length).toBeGreaterThan(0);

      // Each diagnostic should have the required fields
      for (const diag of diagnostics) {
        expect(diag.file).toEqual(expect.any(String));
        expect(diag.line).toEqual(expect.any(Number));
        expect(["error", "warning", "info"]).toContain(diag.severity);
        expect(diag.rule).toEqual(expect.any(String));
        expect(diag.message).toEqual(expect.any(String));
      }
    });

    it("returns text content alongside structured content", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "eslint-project");
      const result = await client.callTool(
        { name: "lint", arguments: { path: fixturePath, patterns: ["src/"] } },
        undefined,
        CALL_TIMEOUT,
      );

      // Verify text content is present and non-empty
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent.length).toBeGreaterThan(0);
      expect(textContent[0].type).toBe("text");
      expect(typeof textContent[0].text).toBe("string");
      expect(textContent[0].text.length).toBeGreaterThan(0);
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "lint", arguments: { patterns: ["--fix-dry-run"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Prettier (format-check tool)
  // -------------------------------------------------------------------------

  describe("format-check", () => {
    it("returns structured Prettier check result for a known-formatted file", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        {
          name: "format-check",
          arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.formatted).toBe("boolean");
      expect(sc.total).toEqual(expect.any(Number));
      // With compact=false, files should always be present
      expect(Array.isArray(sc.files)).toBe(true);
    });

    it("detects unformatted files in a fixture project", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "prettier-project");
      const result = await client.callTool(
        {
          name: "format-check",
          arguments: { path: fixturePath, patterns: ["unformatted.js"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      // The unformatted file should fail the check
      expect(sc.formatted).toBe(false);
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.total as number).toBeGreaterThan(0);
    });

    it("passes check for well-formatted files", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "prettier-project");
      const result = await client.callTool(
        {
          name: "format-check",
          arguments: { path: fixturePath, patterns: ["formatted.js"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.formatted).toBe(true);
      expect(sc.total).toBe(0);
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "format-check", arguments: { patterns: ["--config"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Prettier (prettier-format / write tool)
  // -------------------------------------------------------------------------

  describe("prettier-format", () => {
    let tempDir: string;

    beforeEach(() => {
      // Copy the prettier fixture to a temp dir so we can safely modify files
      tempDir = mkdtempSync(join(tmpdir(), "pare-lint-prettier-"));
      cpSync(resolve(FIXTURES_DIR, "prettier-project"), tempDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it("returns structured Prettier write result for already-formatted file", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        {
          name: "prettier-format",
          arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] },
        },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      expect(sc.files === undefined || Array.isArray(sc.files)).toBe(true);
    });

    it("formats an unformatted file in a temp copy of the fixture", async () => {
      const result = await client.callTool(
        {
          name: "prettier-format",
          arguments: { path: tempDir, patterns: ["unformatted.js"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.success).toBe(true);
      expect(sc.filesChanged).toEqual(expect.any(Number));

      // Verify the file was actually formatted by re-checking
      const checkResult = await client.callTool(
        {
          name: "format-check",
          arguments: { path: tempDir, patterns: ["unformatted.js"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const checkSc = checkResult.structuredContent as Record<string, unknown>;
      expect(checkSc.formatted).toBe(true);
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "prettier-format", arguments: { patterns: ["--write"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Biome (biome-check tool)
  // -------------------------------------------------------------------------

  describe("biome-check", () => {
    it("returns structured result when biome is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        { name: "biome-check", arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    });

    it("detects lint issues in a biome-configured fixture project", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "biome-project");
      const result = await client.callTool(
        {
          name: "biome-check",
          arguments: { path: fixturePath, patterns: ["src/"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(Array.isArray(sc.diagnostics)).toBe(true);

      // The fixture has intentional issues (noDoubleEquals, useConst)
      // so total should be > 0
      expect(sc.total as number).toBeGreaterThan(0);

      const diagnostics = sc.diagnostics as Array<Record<string, unknown>>;
      for (const diag of diagnostics) {
        expect(diag.file).toEqual(expect.any(String));
        expect(diag.line).toEqual(expect.any(Number));
        expect(["error", "warning", "info"]).toContain(diag.severity);
        expect(diag.rule).toEqual(expect.any(String));
        expect(diag.message).toEqual(expect.any(String));
      }
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "biome-check", arguments: { patterns: ["--reporter"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Biome (biome-format tool)
  // -------------------------------------------------------------------------

  describe("biome-format", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "pare-lint-biome-"));
      cpSync(resolve(FIXTURES_DIR, "biome-project"), tempDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it("returns structured result when biome is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        { name: "biome-format", arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      expect(sc.files === undefined || Array.isArray(sc.files)).toBe(true);
    });

    it("formats files in a biome-configured fixture project", async () => {
      const result = await client.callTool(
        { name: "biome-format", arguments: { path: tempDir, patterns: ["src/"], compact: false } },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      expect(Array.isArray(sc.files)).toBe(true);
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "biome-format", arguments: { patterns: ["--write"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Stylelint
  // -------------------------------------------------------------------------

  describe("stylelint", () => {
    it("returns structured result when stylelint is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        { name: "stylelint", arguments: { path: pkgPath, patterns: ["."] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    });

    it("returns structured result when run against a CSS fixture", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "stylelint-project");
      const result = await client.callTool(
        {
          name: "stylelint",
          arguments: { path: fixturePath, patterns: ["bad.css"], compact: false },
        },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(Array.isArray(sc.diagnostics)).toBe(true);

      // If diagnostics were found, verify their structure
      const diagnostics = sc.diagnostics as Array<Record<string, unknown>>;
      for (const diag of diagnostics) {
        expect(diag.file).toEqual(expect.any(String));
        expect(diag.line).toEqual(expect.any(Number));
        expect(["error", "warning", "info"]).toContain(diag.severity);
        expect(diag.rule).toEqual(expect.any(String));
        expect(diag.message).toEqual(expect.any(String));
      }
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "stylelint", arguments: { patterns: ["--formatter"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Oxlint
  // -------------------------------------------------------------------------

  describe("oxlint", () => {
    it("returns structured result", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        { name: "oxlint", arguments: { path: pkgPath, patterns: ["src/"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    });

    it("returns structured result when run against a fixture", async () => {
      const fixturePath = resolve(FIXTURES_DIR, "eslint-project");
      const result = await client.callTool(
        { name: "oxlint", arguments: { path: fixturePath, patterns: ["src/"], compact: false } },
        undefined,
        CALL_TIMEOUT,
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(Array.isArray(sc.diagnostics)).toBe(true);
    });

    it("rejects flag injection in patterns via MCP", async () => {
      const result = await client.callTool(
        { name: "oxlint", arguments: { patterns: ["--format"] } },
        undefined,
        CALL_TIMEOUT,
      );

      expect(result.isError).toBe(true);
    });
  });
});
