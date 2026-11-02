import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { registerInstallTool, assertInstallActuallyHappened } from "../src/tools/install.js";
import { runPm } from "../src/lib/npm-runner.js";
import { formatInstall } from "../src/lib/formatters.js";
import { NpmInstallSchema, type NpmInstall } from "../src/schemas/index.js";

vi.mock("../src/lib/npm-runner.js", () => ({ runPm: vi.fn() }));

type InstallResult = {
  structuredContent: unknown;
  content: { type: string; text?: string }[];
};

describe("install tool", () => {
  let fixture: string;
  let inputSchema: z.ZodRawShape;
  let handler: (params: Record<string, unknown>) => Promise<InstallResult>;

  beforeEach(() => {
    vi.mocked(runPm).mockReset();
    vi.mocked(runPm).mockResolvedValue({
      exitCode: 0,
      stdout: "added 3 packages\n2 packages are looking for funding\n1 vulnerability (1 high)",
      stderr: "",
    });
    fixture = mkdtempSync(join(tmpdir(), "pare-install-unit-"));
    mkdirSync(join(fixture, "node_modules"));
    registerInstallTool({
      registerTool(
        _name: string,
        config: { inputSchema: z.ZodRawShape },
        callback: typeof handler,
      ) {
        inputSchema = config.inputSchema;
        handler = callback;
      },
    } as never);
  });

  afterEach(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  function call(params: Record<string, unknown> = {}) {
    return handler(
      z.object(inputSchema).parse({ path: fixture, packageManager: "pnpm", ...params }),
    );
  }

  it("uses the typed silent reporter and omits all parsed statistics", async () => {
    const result = await call({ pnpmReporter: "silent" });
    expect(runPm).toHaveBeenCalledWith(
      "pnpm",
      ["install", "--ignore-scripts", "--reporter=silent"],
      fixture,
    );
    expect(result.structuredContent).toEqual({ packageManager: "pnpm", lockfileChanged: false });
    expect(NpmInstallSchema.safeParse(result.structuredContent).success).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "package counts unavailable\nLockfile changed: no" },
    ]);
  });

  it("retains package operands and enables requested lifecycle scripts", async () => {
    await call({ pnpmReporter: "silent", ignoreScripts: false, args: ["example-package"] });
    expect(runPm).toHaveBeenCalledWith(
      "pnpm",
      ["install", "--reporter=silent", "example-package"],
      fixture,
    );
  });

  it("rejects reporter values outside the allowlist", () => {
    expect(() => z.object(inputSchema).parse({ pnpmReporter: "--force" })).toThrow();
    expect(runPm).not.toHaveBeenCalled();
  });

  it.each(["npm", "yarn"])("rejects the pnpm reporter for %s before launching it", async (pm) => {
    await expect(call({ packageManager: pm, pnpmReporter: "silent" })).rejects.toThrow(
      new RegExp(`pnpmReporter.*${pm}`),
    );
    expect(runPm).not.toHaveBeenCalled();
  });

  it("validates against the detected package manager too", async () => {
    await expect(call({ packageManager: undefined, pnpmReporter: "silent" })).rejects.toThrow(
      /pnpmReporter.*npm/,
    );
    expect(runPm).not.toHaveBeenCalled();
  });

  it("keeps reporter flags out of package operands", async () => {
    await expect(call({ args: ["--reporter=silent"] })).rejects.toThrow(/must not start with/);
    expect(runPm).not.toHaveBeenCalled();
  });

  it("reports lockfile changes independently of silent output", async () => {
    vi.mocked(runPm).mockImplementationOnce(async () => {
      writeFileSync(join(fixture, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    expect((await call({ pnpmReporter: "silent" })).structuredContent).toEqual({
      packageManager: "pnpm",
      lockfileChanged: true,
    });
  });

  it.each(["npm", "pnpm", "yarn"])("preserves normal %s install summaries", async (pm) => {
    const result = await call({ packageManager: pm });
    expect(result.structuredContent).toMatchObject({ added: 3, removed: 0, changed: 0 });
    expect(runPm).toHaveBeenCalledWith(
      pm,
      ["install", "--ignore-scripts", ...(pm === "npm" ? ["--json"] : [])],
      fixture,
    );
  });

  it.each([
    { packageManager: "pnpm", pnpmReporter: "silent" },
    { packageManager: "pnpm" },
    { packageManager: "npm" },
    { packageManager: "yarn" },
    { packageManager: "npm", frozenLockfile: true },
    { packageManager: "pnpm", dryRun: true },
    { packageManager: "pnpm", global: true },
  ])("rejects a nonzero exit with existing node_modules: %j", async (params) => {
    vi.mocked(runPm).mockResolvedValueOnce({ exitCode: 7, stdout: "", stderr: "" });
    await expect(call(params)).rejects.toThrow(/failed.*exit code 7/);
  });

  it("reports process failure before the missing-directory guard", async () => {
    rmSync(join(fixture, "node_modules"), { recursive: true });
    vi.mocked(runPm).mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "" });
    await expect(call({ pnpmReporter: "silent" })).rejects.toThrow(/failed.*exit code 1/);
  });

  it("includes available failure diagnostics", async () => {
    vi.mocked(runPm).mockResolvedValueOnce({
      exitCode: 1,
      stdout: "Lifecycle script failed",
      stderr: "permission denied",
    });
    await expect(call()).rejects.toThrow(/permission denied[\s\S]*Lifecycle script failed/);
  });

  it.each([
    ["/home/review-user/project/error.log", "~/project/error.log"],
    ["C:\\Users\\review-user\\project\\error.log", "~\\project\\error.log"],
  ])("sanitizes home paths from failed-install stdout: %s", async (original, sanitized) => {
    vi.mocked(runPm).mockResolvedValueOnce({ exitCode: 1, stdout: original, stderr: "" });
    await expect(call()).rejects.toThrow(sanitized);
  });

  it("preserves launch and timeout errors", async () => {
    vi.mocked(runPm).mockRejectedValueOnce(new Error("Command pnpm timed out"));
    await expect(call({ pnpmReporter: "silent" })).rejects.toThrow("Command pnpm timed out");
  });

  it.each([
    { name: "single-line", stdout: "x".repeat(20_000) },
    {
      name: "wide-multiline",
      stdout: Array.from({ length: 60 }, () => "x".repeat(256)).join("\n"),
    },
    {
      name: "multiline",
      stdout: Array.from({ length: 1_000 }, () => "progress".repeat(12)).join("\n"),
    },
  ])("bounds long $name failure diagnostics", async ({ stdout }) => {
    vi.mocked(runPm).mockResolvedValueOnce({
      exitCode: 1,
      stdout,
      stderr: "fatal install error",
    });
    const error = await call().then(
      () => undefined,
      (error: Error) => error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toMatch(/pnpm install failed \(exit code 1\)/);
    expect(error!.message.length).toBeLessThan(8_500);
    expect(error!.message).toMatch(/omitted|truncated/);
    expect(error!.message).toContain("fatal install error");
  });

  it.each([45, 80])(
    "preserves the end of %i stderr warning lines alongside verbose stdout",
    async (warningLines) => {
      const stderr = [
        ...Array.from({ length: warningLines }, () => "dependency warning"),
        "fatal install error: C:\\Users\\review-user\\project\\error.log",
      ].join("\n");
      vi.mocked(runPm).mockResolvedValueOnce({
        exitCode: 1,
        stdout: Array.from({ length: 100 }, () => "progress ".repeat(32)).join("\n"),
        stderr,
      });
      const error = await call().then(
        () => undefined,
        (error: Error) => error,
      );
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toContain("fatal install error: ~\\project\\error.log");
      expect(error!.message).not.toContain("review-user");
      expect(error!.message.length).toBeLessThan(8_500);
      expect(error!.message).toMatch(/omitted|truncated/);
    },
  );

  it.each([
    { name: "wide lines", warnings: Array.from({ length: 60 }, () => "x".repeat(256)).join("\n") },
    { name: "single wide line", warnings: "x".repeat(20_000) },
  ])("preserves both ends of stderr exceeding the character cap: $name", async ({ warnings }) => {
    vi.mocked(runPm).mockResolvedValueOnce({
      exitCode: 1,
      stdout: "progress ".repeat(2_000),
      stderr:
        "install setup started\n" +
        warnings +
        "\nfatal install error: C:\\Users\\review-user\\project\\error.log",
    });
    const error = await call().then(
      () => undefined,
      (error: Error) => error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toContain("install setup started");
    expect(error!.message).toContain("fatal install error: ~\\project\\error.log");
    expect(error!.message).not.toContain("review-user");
    expect(error!.message).toContain("truncated");
    expect(error!.message.length).toBeLessThan(8_500);
  });

  it("sanitizes project paths in the successful-exit verification error", () => {
    const cwd = "C:\\Users\\review-user\\project";
    let caught: Error | undefined;
    try {
      assertInstallActuallyHappened({
        cwd,
        pm: "pnpm",
        subcommand: "install",
        exitCode: 0,
        stderr: "",
      });
    } catch (error) {
      caught = error as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught!.message).toMatch(/cwd=~\\project/);
    expect(caught!.message).not.toContain("review-user");
    expect(caught!.message).toMatch(/created at ~\\project[\\/]node_modules/);
  });

  it("bounds the verification error while retaining its context and fatal stderr tail", () => {
    let caught: Error | undefined;
    try {
      assertInstallActuallyHappened({
        cwd: "C:\\Users\\review-user\\project",
        pm: "pnpm",
        subcommand: "install",
        exitCode: 0,
        stderr: "x".repeat(20_000) + "\nfatal verification error",
      });
    } catch (error) {
      caught = error as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught!.message).toContain("reported success but no node_modules/");
    expect(caught!.message).toContain("fatal verification error");
    expect(caught!.message).not.toContain("review-user");
    expect(caught!.message).toContain("truncated");
    expect(caught!.message.length).toBeLessThan(8_500);
  });

  it("sanitizes JSON-encoded Windows paths from npm failure stdout", async () => {
    const original = { error: { summary: "C:\\Users\\review-user\\project\\error.log" } };
    const sanitized = { error: { summary: "~\\project\\error.log" } };
    vi.mocked(runPm).mockResolvedValueOnce({
      exitCode: 1,
      stdout: JSON.stringify(original),
      stderr: "",
    });
    await expect(call({ packageManager: "npm" })).rejects.toThrow(JSON.stringify(sanitized));
  });

  it("still verifies the directory after a successful silent install", async () => {
    rmSync(join(fixture, "node_modules"), { recursive: true });
    await expect(call({ pnpmReporter: "silent" })).rejects.toThrow(/no node_modules/);
  });

  it.each([{ dryRun: true }, { global: true }])(
    "preserves directory-guard exemptions: %j",
    async (params) => {
      rmSync(join(fixture, "node_modules"), { recursive: true });
      await expect(call({ pnpmReporter: "silent", ...params })).resolves.toBeDefined();
    },
  );
});

describe("install output with unavailable counts", () => {
  it("accepts omitted counts in the public output schema", () => {
    expect(
      NpmInstallSchema.safeParse({ packageManager: "pnpm", lockfileChanged: false }).success,
    ).toBe(true);
  });

  it("distinguishes unavailable counts from measured zeros", () => {
    expect(formatInstall({ packageManager: "pnpm" } as NpmInstall)).toBe(
      "package counts unavailable",
    );
    expect(formatInstall({ added: 0, removed: 0, changed: 0 })).toBe("up to date");
  });
});
