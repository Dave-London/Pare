import { describe, it, expect } from "vitest";
import {
  parseSshRunOutput,
  parseSshTestOutput,
  parseSshKeyscanOutput,
  parseRsyncOutput,
} from "../src/lib/parsers.js";

// ── SSH Run ─────────────────────────────────────────────────────────────

describe("parseSshRunOutput", () => {
  it("parses successful command execution", () => {
    const result = parseSshRunOutput(
      "server.example.com",
      "deploy",
      "uptime",
      " 12:34:56 up 42 days,  3:21,  1 user,  load average: 0.01, 0.02, 0.03\n",
      "",
      0,
      234,
    );

    expect(result.host).toBe("server.example.com");
    expect(result.user).toBe("deploy");
    expect(result.command).toBe("uptime");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("up 42 days");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(234);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed command execution", () => {
    const result = parseSshRunOutput(
      "server.example.com",
      "deploy",
      "cat /nonexistent",
      "",
      "cat: /nonexistent: No such file or directory\n",
      1,
      150,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("cat: /nonexistent: No such file or directory");
    expect(result.timedOut).toBe(false);
  });

  it("handles timed out command", () => {
    const result = parseSshRunOutput(
      "slow.example.com",
      undefined,
      "sleep 1000",
      "",
      "timed out",
      124,
      300000,
      true,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(124);
    expect(result.timedOut).toBe(true);
    expect(result.user).toBeUndefined();
  });

  it("handles both stdout and stderr", () => {
    const result = parseSshRunOutput(
      "server.example.com",
      "root",
      "make build",
      "Building...\nDone.",
      "Warning: deprecated function",
      0,
      5000,
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Building...\nDone.");
    expect(result.stderr).toBe("Warning: deprecated function");
  });

  it("handles empty stdout and stderr", () => {
    const result = parseSshRunOutput("host", "user", "true", "", "", 0, 50);

    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });

  it("handles undefined user", () => {
    const result = parseSshRunOutput("host", undefined, "ls", "file.txt\n", "", 0, 100);

    expect(result.user).toBeUndefined();
    expect(result.host).toBe("host");
  });
});

// ── SSH Test ────────────────────────────────────────────────────────────

describe("parseSshTestOutput", () => {
  it("parses successful connection test", () => {
    const result = parseSshTestOutput(
      "github.com",
      "git",
      "",
      "Hi user! You've successfully authenticated, but GitHub does not provide shell access.\n",
      0,
      450,
    );

    expect(result.host).toBe("github.com");
    expect(result.user).toBe("git");
    expect(result.reachable).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.banner).toContain("successfully authenticated");
    expect(result.error).toBeUndefined();
    expect(result.duration).toBe(450);
  });

  it("parses failed connection test", () => {
    const result = parseSshTestOutput(
      "nonexistent.example.com",
      undefined,
      "",
      "ssh: Could not resolve hostname nonexistent.example.com: Name or service not known\n",
      255,
      2000,
    );

    expect(result.reachable).toBe(false);
    expect(result.exitCode).toBe(255);
    expect(result.error).toContain("Could not resolve hostname");
    expect(result.user).toBeUndefined();
  });

  it("parses connection refused", () => {
    const result = parseSshTestOutput(
      "192.168.1.100",
      "admin",
      "",
      "ssh: connect to host 192.168.1.100 port 22: Connection refused\n",
      255,
      1500,
    );

    expect(result.reachable).toBe(false);
    expect(result.error).toContain("Connection refused");
  });
});

// ── SSH Keyscan ─────────────────────────────────────────────────────────

describe("parseSshKeyscanOutput", () => {
  it("parses multiple host keys", () => {
    const stdout = [
      "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
      "github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM09fhXNJN7nGFvRcj0uzF/LkvFF+eiY",
      "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=",
    ].join("\n");

    const result = parseSshKeyscanOutput("github.com", stdout, "", 0);

    expect(result.host).toBe("github.com");
    expect(result.success).toBe(true);
    expect(result.keys).toHaveLength(3);
    expect(result.keys[0].host).toBe("github.com");
    expect(result.keys[0].keyType).toBe("ssh-ed25519");
    expect(result.keys[0].key).toContain("AAAAC3Nza");
    expect(result.keys[1].keyType).toBe("ssh-rsa");
    expect(result.keys[2].keyType).toBe("ecdsa-sha2-nistp256");
    expect(result.error).toBeUndefined();
  });

  it("parses single key type", () => {
    const stdout =
      "example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n";

    const result = parseSshKeyscanOutput("example.com", stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].keyType).toBe("ssh-ed25519");
  });

  it("handles failed keyscan", () => {
    const result = parseSshKeyscanOutput(
      "unreachable.example.com",
      "",
      "getaddrinfo unreachable.example.com: Name or service not known\n",
      1,
    );

    expect(result.success).toBe(false);
    expect(result.keys).toHaveLength(0);
    expect(result.error).toContain("Name or service not known");
  });

  it("skips comment lines", () => {
    const stdout = [
      "# github.com:22 SSH-2.0-babeld-f345ed5d",
      "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
    ].join("\n");

    const result = parseSshKeyscanOutput("github.com", stdout, "", 0);

    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].keyType).toBe("ssh-ed25519");
  });

  it("handles empty output", () => {
    const result = parseSshKeyscanOutput("empty.example.com", "", "", 0);

    expect(result.success).toBe(false);
    expect(result.keys).toHaveLength(0);
  });
});

// ── Rsync ───────────────────────────────────────────────────────────────

describe("parseRsyncOutput", () => {
  it("parses successful dry-run with stats", () => {
    const stdout = [
      "sending incremental file list",
      "src/index.ts",
      "src/lib/parsers.ts",
      "",
      "Number of files: 42 (reg: 30, dir: 12)",
      "Number of regular files transferred: 2",
      "Total file size: 1,234,567 bytes",
      "Total transferred file size: 4,567 bytes",
      "Literal data: 0 bytes",
      "Matched data: 0 bytes",
      "File list size: 0",
      "File list generation time: 0.001 seconds",
      "File list transfer time: 0.000 seconds",
      "Total bytes sent: 123",
      "Total bytes received: 456",
      "",
      "sent 123 bytes  received 456 bytes  1,158.00 bytes/sec",
      "total size is 1,234,567  speedup is 2134.54 (DRY RUN)",
    ].join("\n");

    const result = parseRsyncOutput("./src/", "deploy@server:/app/src/", true, stdout, "", 0, 1234);

    expect(result.source).toBe("./src/");
    expect(result.destination).toBe("deploy@server:/app/src/");
    expect(result.dryRun).toBe(true);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.filesTransferred).toBe(2);
    expect(result.totalSize).toBe("1,234,567");
    expect(result.speedup).toBe("2134.54");
    expect(result.duration).toBe(1234);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed transfer", () => {
    const result = parseRsyncOutput(
      "./src/",
      "deploy@server:/app/",
      false,
      "",
      "rsync: connection unexpectedly closed\nrsync error: unexplained error (code 255)\n",
      255,
      5000,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(255);
    expect(result.stderr).toContain("connection unexpectedly closed");
    expect(result.filesTransferred).toBeUndefined();
  });

  it("handles timed out transfer", () => {
    const result = parseRsyncOutput(
      "/large/dir/",
      "user@host:/backup/",
      false,
      "",
      "timed out",
      124,
      300000,
      true,
    );

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("handles empty stdout and stderr", () => {
    const result = parseRsyncOutput("./", "dest/", true, "", "", 0, 50);

    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
    expect(result.filesTransferred).toBeUndefined();
    expect(result.totalSize).toBeUndefined();
    expect(result.speedup).toBeUndefined();
  });

  it("parses real transfer with stats", () => {
    const stdout = [
      "sending incremental file list",
      "",
      "Number of files: 10 (reg: 8, dir: 2)",
      "Number of regular files transferred: 0",
      "Total file size: 98,765 bytes",
      "Total transferred file size: 0 bytes",
      "Literal data: 0 bytes",
      "Matched data: 0 bytes",
      "File list size: 0",
      "File list generation time: 0.001 seconds",
      "File list transfer time: 0.000 seconds",
      "Total bytes sent: 200",
      "Total bytes received: 12",
      "",
      "sent 200 bytes  received 12 bytes  424.00 bytes/sec",
      "total size is 98,765  speedup is 465.87",
    ].join("\n");

    const result = parseRsyncOutput("./dist/", "/var/www/", false, stdout, "", 0, 800);

    expect(result.dryRun).toBe(false);
    expect(result.success).toBe(true);
    expect(result.filesTransferred).toBe(0);
    expect(result.totalSize).toBe("98,765");
    expect(result.speedup).toBe("465.87");
  });
});
