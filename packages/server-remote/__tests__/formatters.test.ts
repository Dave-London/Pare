import { describe, it, expect } from "vitest";
import {
  formatSshRun,
  formatSshTest,
  formatSshKeyscan,
  formatRsync,
  compactSshRunMap,
  formatSshRunCompact,
  compactSshTestMap,
  formatSshTestCompact,
  compactSshKeyscanMap,
  formatSshKeyscanCompact,
  compactRsyncMap,
  formatRsyncCompact,
} from "../src/lib/formatters.js";
import type {
  SshRunResult,
  SshTestResult,
  SshKeyscanResult,
  RsyncResult,
} from "../src/schemas/index.js";

// ── SSH Run formatters ──────────────────────────────────────────────────

describe("formatSshRun", () => {
  it("formats successful command", () => {
    const data: SshRunResult = {
      host: "server.example.com",
      user: "deploy",
      command: "uptime",
      success: true,
      exitCode: 0,
      stdout: "up 42 days",
      duration: 234,
      timedOut: false,
    };
    const output = formatSshRun(data);
    expect(output).toContain("ssh deploy@server.example.com: success (234ms).");
    expect(output).toContain("command: uptime");
    expect(output).toContain("up 42 days");
  });

  it("formats failed command", () => {
    const data: SshRunResult = {
      host: "server.example.com",
      user: "deploy",
      command: "bad-command",
      success: false,
      exitCode: 127,
      stderr: "command not found",
      duration: 150,
      timedOut: false,
    };
    const output = formatSshRun(data);
    expect(output).toContain("ssh deploy@server.example.com: exit code 127 (150ms).");
    expect(output).toContain("command not found");
  });

  it("formats timed out command", () => {
    const data: SshRunResult = {
      host: "slow.example.com",
      command: "sleep 1000",
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatSshRun(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
  });

  it("formats without user", () => {
    const data: SshRunResult = {
      host: "server.example.com",
      command: "ls",
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
    };
    const output = formatSshRun(data);
    expect(output).toContain("ssh server.example.com: success");
  });
});

describe("compactSshRunMap / formatSshRunCompact", () => {
  it("maps to compact and formats", () => {
    const data: SshRunResult = {
      host: "server.example.com",
      user: "deploy",
      command: "uptime",
      success: true,
      exitCode: 0,
      stdout: "lots of output here",
      duration: 234,
      timedOut: false,
    };
    const compact = compactSshRunMap(data);
    expect(compact.host).toBe("server.example.com");
    expect(compact.success).toBe(true);
    expect((compact as Record<string, unknown>).stdout).toBeUndefined();

    const text = formatSshRunCompact(compact);
    expect(text).toContain("ssh deploy@server.example.com: success (234ms).");
  });
});

// ── SSH Test formatters ─────────────────────────────────────────────────

describe("formatSshTest", () => {
  it("formats reachable host", () => {
    const data: SshTestResult = {
      host: "github.com",
      user: "git",
      reachable: true,
      exitCode: 0,
      banner: "Hi user! You've successfully authenticated",
      duration: 450,
    };
    const output = formatSshTest(data);
    expect(output).toContain("ssh git@github.com: reachable (450ms).");
    expect(output).toContain("banner: Hi user!");
  });

  it("formats unreachable host", () => {
    const data: SshTestResult = {
      host: "nonexistent.example.com",
      reachable: false,
      exitCode: 255,
      error: "Could not resolve hostname",
      duration: 2000,
    };
    const output = formatSshTest(data);
    expect(output).toContain("ssh nonexistent.example.com: unreachable");
    expect(output).toContain("Could not resolve hostname");
  });
});

describe("compactSshTestMap / formatSshTestCompact", () => {
  it("maps to compact and formats", () => {
    const data: SshTestResult = {
      host: "github.com",
      user: "git",
      reachable: true,
      exitCode: 0,
      banner: "some long banner",
      duration: 450,
    };
    const compact = compactSshTestMap(data);
    expect(compact.reachable).toBe(true);
    expect((compact as Record<string, unknown>).banner).toBeUndefined();

    const text = formatSshTestCompact(compact);
    expect(text).toContain("ssh git@github.com: reachable (450ms).");
  });
});

// ── SSH Keyscan formatters ──────────────────────────────────────────────

describe("formatSshKeyscan", () => {
  it("formats successful keyscan", () => {
    const data: SshKeyscanResult = {
      host: "github.com",
      keys: [
        { host: "github.com", keyType: "ssh-ed25519", key: "AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnk" },
        { host: "github.com", keyType: "ssh-rsa", key: "AAAAB3NzaC1yc2EAAAADAQABAAABgQ" },
      ],
      success: true,
    };
    const output = formatSshKeyscan(data);
    expect(output).toContain("ssh-keyscan github.com: 2 keys found.");
    expect(output).toContain("ssh-ed25519:");
    expect(output).toContain("ssh-rsa:");
  });

  it("formats failed keyscan", () => {
    const data: SshKeyscanResult = {
      host: "unreachable.example.com",
      keys: [],
      error: "Name or service not known",
      success: false,
    };
    const output = formatSshKeyscan(data);
    expect(output).toContain("ssh-keyscan unreachable.example.com: failed.");
    expect(output).toContain("Name or service not known");
  });
});

describe("compactSshKeyscanMap / formatSshKeyscanCompact", () => {
  it("maps to compact and formats", () => {
    const data: SshKeyscanResult = {
      host: "github.com",
      keys: [
        { host: "github.com", keyType: "ssh-ed25519", key: "AAAA..." },
        { host: "github.com", keyType: "ssh-rsa", key: "AAAA..." },
      ],
      success: true,
    };
    const compact = compactSshKeyscanMap(data);
    expect(compact.keyCount).toBe(2);
    expect(compact.keyTypes).toEqual(["ssh-ed25519", "ssh-rsa"]);

    const text = formatSshKeyscanCompact(compact);
    expect(text).toContain("ssh-keyscan github.com: 2 keys (ssh-ed25519, ssh-rsa).");
  });
});

// ── Rsync formatters ────────────────────────────────────────────────────

describe("formatRsync", () => {
  it("formats successful dry-run", () => {
    const data: RsyncResult = {
      source: "./src/",
      destination: "deploy@server:/app/src/",
      dryRun: true,
      success: true,
      exitCode: 0,
      filesTransferred: 2,
      totalSize: "1,234,567",
      speedup: "2134.54",
      duration: 1234,
      timedOut: false,
    };
    const output = formatRsync(data);
    expect(output).toContain("rsync (dry-run): success (1234ms).");
    expect(output).toContain("source: ./src/");
    expect(output).toContain("files transferred: 2");
    expect(output).toContain("total size: 1,234,567");
    expect(output).toContain("speedup: 2134.54");
  });

  it("formats failed transfer", () => {
    const data: RsyncResult = {
      source: "./src/",
      destination: "deploy@server:/app/",
      dryRun: false,
      success: false,
      exitCode: 255,
      stderr: "connection unexpectedly closed",
      duration: 5000,
      timedOut: false,
    };
    const output = formatRsync(data);
    expect(output).toContain("rsync: exit code 255 (5000ms).");
    expect(output).toContain("connection unexpectedly closed");
  });

  it("formats timed out transfer", () => {
    const data: RsyncResult = {
      source: "/large/dir/",
      destination: "user@host:/backup/",
      dryRun: false,
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatRsync(data);
    expect(output).toContain("TIMED OUT");
  });
});

describe("compactRsyncMap / formatRsyncCompact", () => {
  it("maps to compact and formats", () => {
    const data: RsyncResult = {
      source: "./src/",
      destination: "deploy@server:/app/",
      dryRun: true,
      success: true,
      exitCode: 0,
      filesTransferred: 5,
      totalSize: "1,234",
      speedup: "10.5",
      stdout: "lots of verbose output",
      duration: 800,
      timedOut: false,
    };
    const compact = compactRsyncMap(data);
    expect(compact.filesTransferred).toBe(5);
    expect((compact as Record<string, unknown>).stdout).toBeUndefined();

    const text = formatRsyncCompact(compact);
    expect(text).toContain("rsync (dry-run): success (800ms, 5 files).");
  });

  it("formats compact failed", () => {
    const compact = compactRsyncMap({
      source: "a",
      destination: "b",
      dryRun: false,
      success: false,
      exitCode: 23,
      duration: 500,
      timedOut: false,
    });
    const text = formatRsyncCompact(compact);
    expect(text).toContain("rsync: exit code 23 (500ms).");
  });

  it("formats compact timed out", () => {
    const compact = compactRsyncMap({
      source: "a",
      destination: "b",
      dryRun: true,
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    });
    const text = formatRsyncCompact(compact);
    expect(text).toContain("rsync (dry-run): TIMED OUT after 300000ms.");
  });
});
