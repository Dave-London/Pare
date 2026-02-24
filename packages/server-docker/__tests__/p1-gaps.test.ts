/**
 * Tests for P1 gap implementations (#97-#125).
 * Covers all 29 gaps across build, compose, exec, images, inspect,
 * logs, network-ls, ps, pull, run, stats, and volume-ls.
 */
import { describe, it, expect } from "vitest";
import {
  parseBuildOutput,
  parseLogsOutput,
  parseImagesJson,
  parseRunOutput,
  parseExecOutput,
  parseComposeUpOutput,
  parseComposeDownOutput,
  parsePullOutput,
  parseInspectJson,
  parseNetworkLsJson,
  parseVolumeLsJson,
  parseComposePsJson,
  parseComposeLogsOutput,
  parseComposeBuildOutput,
  parseStatsJson,
  parsePsJson,
  parseSizeToBytes,
} from "../src/lib/parsers.js";
import {
  formatLogs,
  formatExec,
  formatComposeUp,
  formatComposeDown,
  formatInspect,
  formatNetworkLs,
  formatVolumeLs,
  formatComposePs,
  formatComposeBuild,
} from "../src/lib/formatters.js";

// ── #97: Build error parsing with line numbers ───────────────────────

describe("#97: Build error parsing", () => {
  it("captures structured errors with line numbers from Dockerfile references", () => {
    const stdout = "";
    const stderr = [
      "Dockerfile:5: unknown instruction: RUNN",
      "ERROR: failed to solve: process '/bin/sh -c npm install' did not complete successfully",
    ].join("\n");

    const result = parseBuildOutput(stdout, stderr, 1, 3.0);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);

    // Check that at least one error has a line number
    const withLine = result.errors!.find((e) => e.line != null);
    expect(withLine).toBeDefined();
    expect(withLine!.line).toBe(5);
  });

  it("returns errors array for failed builds", () => {
    const stderr = "Error: something went wrong\nAnother error occurred";
    const result = parseBuildOutput("", stderr, 1, 1.0);

    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("returns errors as objects with message field", () => {
    const stderr = "ERROR: build failed";
    const result = parseBuildOutput("", stderr, 1, 1.0);

    for (const err of result.errors ?? []) {
      expect(typeof err).toBe("object");
      expect(err.message).toBeDefined();
    }
  });

  it("successful build has no errors field", () => {
    const stdout = "#1 [internal] load build definition\nwriting image sha256:abc123def456";
    const result = parseBuildOutput(stdout, "", 0, 1.0);
    expect(result.errors).toBeUndefined();
  });
});

// ── #98: Multiple tags (tested via input schema, verify multi-tag in build.ts) ──

describe("#98: Multiple tags support", () => {
  it("build tool accepts tag as string (backward compat)", () => {
    // This is a schema-level test; we verify parseBuildOutput still works
    const result = parseBuildOutput("writing image sha256:abc123def456", "", 0, 1.0);
    expect(result.success).toBe(true);
    expect(result.imageId).toBe("abc123def456");
  });
});

// ── #99: Compose build per-service duration ──────────────────────────

describe("#99: Compose build per-service duration", () => {
  it("populates duration for single service", () => {
    const stderr = " ✔ Service web Built";
    const result = parseComposeBuildOutput("", stderr, 0, 10.0);

    expect(result.services).toHaveLength(1);
    expect(result.services![0].duration).toBeDefined();
    expect(result.services![0].duration).toBe(10.0);
  });

  it("distributes duration across multiple services", () => {
    const stderr = " ✔ Service web Built\n ✔ Service api Built";
    const result = parseComposeBuildOutput("", stderr, 0, 20.0);

    expect(result.services).toHaveLength(2);
    for (const s of result.services!) {
      expect(s.duration).toBeDefined();
      expect(s.duration).toBeGreaterThan(0);
    }
  });

  it("formats per-service duration in human output", () => {
    const data = {
      success: true,
      services: [{ service: "web", success: true, duration: 5.0 }],
    };
    const output = formatComposeBuild(data);
    expect(output).toContain("5s");
  });
});

// ── #100: Compose down per-container details ─────────────────────────

describe("#100: Compose down per-container details", () => {
  it("captures per-container name and action", () => {
    const stderr = [
      " ✔ Container myapp-web-1  Stopped",
      " ✔ Container myapp-db-1   Stopped",
      " ✔ Container myapp-web-1  Removed",
      " ✔ Container myapp-db-1   Removed",
    ].join("\n");

    const result = parseComposeDownOutput("", stderr, 0);

    expect(result.containers).toBeDefined();
    expect(result.containers!.length).toBe(4);
    expect(result.containers![0]).toEqual({ name: "myapp-web-1", action: "Stopped" });
    expect(result.containers![2]).toEqual({ name: "myapp-web-1", action: "Removed" });
  });

  it("formats with per-container details", () => {
    const data = {
      success: true,
      stopped: 1,
      containers: [
        { name: "app-1", action: "Stopped" },
        { name: "app-1", action: "Removed" },
      ],
    };
    const output = formatComposeDown(data);
    expect(output).toContain("app-1: Stopped");
    expect(output).toContain("app-1: Removed");
  });
});

// ── #101: Separate volume/network removal counts ─────────────────────

describe("#101: Separate volume/network counts", () => {
  it("counts volumes removed separately", () => {
    const stderr = [
      " ✔ Container app-1   Stopped",
      " ✔ Container app-1   Removed",
      " ✔ Volume app_data   Removed",
      " ✔ Network app_default  Removed",
    ].join("\n");

    const result = parseComposeDownOutput("", stderr, 0);

    expect(result.volumesRemoved).toBe(1);
    expect(result.networksRemoved).toBe(1);
    expect(result.stopped).toBe(1);
  });

  it("formats volume and network counts", () => {
    const data = {
      success: true,
      stopped: 2,
      volumesRemoved: 1,
      networksRemoved: 2,
    };
    const output = formatComposeDown(data);
    expect(output).toContain("1 volumes removed");
    expect(output).toContain("2 networks removed");
  });
});

// ── #102: Compose logs follow param ──────────────────────────────────

describe("#102: Compose logs follow param", () => {
  // This is a tool-level param test; parser doesn't need changes for -f flag
  it("compose logs parser still works with follow output", () => {
    const stdout = "web-1  | 2024-01-01T00:00:00.000Z Starting...\ndb-1   | Ready";
    const result = parseComposeLogsOutput(stdout);
    expect(result.entries).toHaveLength(2);
  });
});

// ── #103: Improved timestamp parsing ─────────────────────────────────

describe("#103: Improved timestamp parsing", () => {
  it("parses timestamps with timezone offsets", () => {
    const stdout = "web-1  | 2024-01-15T10:30:00+05:30 Hello world";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].timestamp).toBe("2024-01-15T10:30:00+05:30");
    expect(result.entries![0].message).toBe("Hello world");
  });

  it("parses timestamps with nanoseconds", () => {
    const stdout = "web-1  | 2024-01-15T10:30:00.123456789Z Starting...";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].timestamp).toBe("2024-01-15T10:30:00.123456789Z");
  });

  it("parses timestamps with negative timezone offset", () => {
    const stdout = "app-1  | 2024-06-15T08:00:00-0700 Ready";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].timestamp).toBe("2024-06-15T08:00:00-0700");
  });
});

// ── #104: Log level extraction ───────────────────────────────────────

describe("#104: Log level extraction", () => {
  it("extracts level from bracket pattern [ERROR]", () => {
    const stdout = "web-1  | [ERROR] Connection refused";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBe("error");
  });

  it("extracts level from level= pattern", () => {
    const stdout = 'web-1  | level=warn msg="disk space low"';
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBe("warn");
  });

  it("extracts level from prefix pattern", () => {
    const stdout = "web-1  | INFO: Server started on port 3000";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBe("info");
  });

  it("handles WARNING as warn", () => {
    const stdout = "web-1  | [WARNING] deprecated feature used";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBe("warn");
  });

  it("returns undefined when no level pattern found", () => {
    const stdout = "web-1  | Just a normal log line";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBeUndefined();
  });

  it("extracts level with timestamp", () => {
    const stdout = "web-1  | 2024-01-01T00:00:00Z [FATAL] out of memory";
    const result = parseComposeLogsOutput(stdout);

    expect(result.entries![0].level).toBe("fatal");
    expect(result.entries![0].timestamp).toBe("2024-01-01T00:00:00Z");
  });
});

// ── #105: Compose PS health field ────────────────────────────────────

describe("#105: Compose PS health field", () => {
  it("parses Health field from JSON output", () => {
    const stdout = JSON.stringify({
      Name: "app-web-1",
      Service: "web",
      State: "running",
      Status: "Up 2 hours (healthy)",
      Health: "healthy",
      Publishers: [],
    });

    const result = parseComposePsJson(stdout);

    expect(result.services[0].health).toBe("healthy");
  });

  it("omits health when not present", () => {
    const stdout = JSON.stringify({
      Name: "app-db-1",
      Service: "db",
      State: "running",
      Status: "Up 1 hour",
      Publishers: [],
    });

    const result = parseComposePsJson(stdout);

    expect(result.services[0].health).toBeUndefined();
  });

  it("formats health in human output", () => {
    const data = {
      services: [
        {
          name: "app-1",
          service: "web",
          state: "running" as const,
          status: "Up",
          health: "healthy",
        },
      ],
    };
    const output = formatComposePs(data);
    expect(output).toContain("health=healthy");
  });
});

// ── #106: Compose PS running/stopped counts ──────────────────────────

describe("#106: Compose PS running/stopped counts", () => {
  it("calculates running and stopped counts", () => {
    const stdout = [
      JSON.stringify({
        Name: "app-web-1",
        Service: "web",
        State: "running",
        Status: "Up",
        Publishers: [],
      }),
      JSON.stringify({
        Name: "app-db-1",
        Service: "db",
        State: "exited",
        Status: "Exited (0)",
        Publishers: [],
      }),
      JSON.stringify({
        Name: "app-cache-1",
        Service: "cache",
        State: "running",
        Status: "Up",
        Publishers: [],
      }),
    ].join("\n");

    const result = parseComposePsJson(stdout);

    expect(result.services.filter((s) => s.state === "running")).toHaveLength(2);
    expect(result.services.filter((s) => s.state === "exited")).toHaveLength(1);
  });

  it("formats counts in human output", () => {
    const data = {
      services: [
        { name: "web-1", service: "web", state: "running" as const, status: "Up" },
        { name: "db-1", service: "db", state: "exited" as const, status: "Exited" },
      ],
    };
    const output = formatComposePs(data);
    expect(output).toContain("1 running, 1 stopped");
  });
});

// ── #107: Compose up per-service state ───────────────────────────────

describe("#107: Compose up per-service state", () => {
  it("captures per-service actions", () => {
    const stderr = [
      " ✔ Container myapp-db-1   Created",
      " ✔ Container myapp-db-1   Started",
      " ✔ Container myapp-web-1  Started",
    ].join("\n");

    const result = parseComposeUpOutput("", stderr, 0);

    expect(result.serviceStates).toBeDefined();
    expect(result.serviceStates!.length).toBeGreaterThanOrEqual(2);

    // Check that we have both Created and Started
    const actions = result.serviceStates!.map((s) => s.action);
    expect(actions).toContain("Created");
    expect(actions).toContain("Started");
  });

  it("formats per-service states", () => {
    const data = {
      success: true,
      services: ["app-1"],
      serviceStates: [
        { name: "app-1", action: "Created" },
        { name: "app-1", action: "Started" },
      ],
    };
    const output = formatComposeUp(data);
    expect(output).toContain("app-1: Created");
    expect(output).toContain("app-1: Started");
  });
});

// ── #108: Exec output truncation ─────────────────────────────────────

describe("#108: Exec output truncation", () => {
  it("truncates stdout when over limit", () => {
    const longOutput = "x".repeat(1000);
    const result = parseExecOutput(longOutput, "", 0, 1.0, 100);

    expect(result.stdout).toHaveLength(100);
    expect(result.isTruncated).toBe(true);
  });

  it("does not truncate when under limit", () => {
    const output = "hello";
    const result = parseExecOutput(output, "", 0, 1.0, 100);

    expect(result.stdout).toBe("hello");
    expect(result.isTruncated).toBeUndefined();
  });

  it("does not truncate when no limit", () => {
    const longOutput = "x".repeat(10000);
    const result = parseExecOutput(longOutput, "", 0, 1.0);

    expect(result.stdout).toHaveLength(10000);
    expect(result.isTruncated).toBeUndefined();
  });

  it("formats truncation indicator", () => {
    const data = {
      exitCode: 0,
      stdout: "truncated...",
      stderr: "",
      isTruncated: true,
    };
    const output = formatExec(data);
    expect(output).toContain("[truncated]");
  });
});

// ── #109: Images 'reference' param (schema-level, no parser change) ──

describe("#109: Images reference param", () => {
  it("parser works the same regardless of param name", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Repository: "nginx",
      Tag: "latest",
      Size: "142MB",
    });
    const result = parseImagesJson(stdout);
    expect(result.images[0].repository).toBe("nginx");
  });
});

// ── #110: Images CreatedAt as ISO timestamp ──────────────────────────

describe("#110: Images CreatedAt as ISO timestamp", () => {
  it("parses Docker timestamp format to ISO", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Repository: "nginx",
      Tag: "latest",
      Size: "142MB",
      CreatedAt: "2024-01-15 10:30:00 +0000 UTC",
      CreatedSince: "2 weeks ago",
    });

    const result = parseImagesJson(stdout);

    expect(result.images[0].createdAt).toBe("2024-01-15T10:30:00+00:00");
    expect(result.images[0].created).toBe("2 weeks ago");
  });

  it("preserves already-ISO timestamps", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Repository: "myapp",
      Tag: "v1",
      Size: "50MB",
      CreatedAt: "2024-01-15T10:30:00Z",
    });

    const result = parseImagesJson(stdout);
    expect(result.images[0].createdAt).toBe("2024-01-15T10:30:00Z");
  });

  it("omits createdAt when CreatedAt not available", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Repository: "myapp",
      Tag: "v1",
      Size: "50MB",
    });

    const result = parseImagesJson(stdout);
    expect(result.images[0].createdAt).toBeUndefined();
  });
});

// ── #111: Inspect networkSettings ────────────────────────────────────

describe("#111: Inspect networkSettings", () => {
  it("extracts IP address and port bindings from container inspect", () => {
    const inspectJson = JSON.stringify([
      {
        Id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123",
        Name: "/web-app",
        State: { Status: "running", Running: true, StartedAt: "2024-01-01T00:00:00Z" },
        Config: { Image: "nginx:latest" },
        HostConfig: { RestartPolicy: { Name: "" } },
        NetworkSettings: {
          IPAddress: "172.17.0.2",
          Ports: {
            "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }],
            "443/tcp": null,
          },
        },
      },
    ]);

    const result = parseInspectJson(inspectJson);

    expect(result.networkSettings).toBeDefined();
    expect(result.networkSettings!.ipAddress).toBe("172.17.0.2");
    expect(result.networkSettings!.ports).toBeDefined();
    expect(result.networkSettings!.ports!["80/tcp"]).toHaveLength(1);
    expect(result.networkSettings!.ports!["80/tcp"]![0].hostPort).toBe("8080");
    expect(result.networkSettings!.ports!["443/tcp"]).toBeNull();
  });

  it("omits networkSettings when not present", () => {
    const inspectJson = JSON.stringify([
      {
        Id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123",
        Name: "/test",
        State: { Status: "running", Running: true },
        Config: { Image: "test" },
        HostConfig: { RestartPolicy: { Name: "" } },
      },
    ]);

    const result = parseInspectJson(inspectJson);
    expect(result.networkSettings).toBeUndefined();
  });

  it("formats network settings in human output", () => {
    const data = {
      id: "abc123",
      name: "web",
      inspectType: "container" as const,
      state: { status: "running", running: true },
      image: "nginx",
      networkSettings: {
        ipAddress: "172.17.0.2",
        ports: { "80/tcp": [{ hostIp: "0.0.0.0", hostPort: "8080" }] },
      },
    };
    const output = formatInspect(data);
    expect(output).toContain("Network: IP=172.17.0.2");
  });
});

// ── #112: Inspect mounts ─────────────────────────────────────────────

describe("#112: Inspect mounts", () => {
  it("extracts mounts from container inspect", () => {
    const inspectJson = JSON.stringify([
      {
        Id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123",
        Name: "/web-app",
        State: { Status: "running", Running: true },
        Config: { Image: "nginx" },
        HostConfig: { RestartPolicy: { Name: "" } },
        Mounts: [
          { Source: "/host/data", Destination: "/container/data", Mode: "rw" },
          { Source: "/host/config", Destination: "/etc/config", Mode: "ro" },
        ],
      },
    ]);

    const result = parseInspectJson(inspectJson);

    expect(result.mounts).toBeDefined();
    expect(result.mounts).toHaveLength(2);
    expect(result.mounts![0]).toEqual({
      source: "/host/data",
      destination: "/container/data",
      mode: "rw",
    });
    expect(result.mounts![1]).toEqual({
      source: "/host/config",
      destination: "/etc/config",
      mode: "ro",
    });
  });

  it("formats mounts in human output", () => {
    const data = {
      id: "abc123",
      name: "web",
      inspectType: "container" as const,
      state: { status: "running", running: true },
      image: "nginx",
      mounts: [{ source: "/data", destination: "/app/data", mode: "rw" }],
    };
    const output = formatInspect(data);
    expect(output).toContain("Mounts: 1 mount(s)");
    expect(output).toContain("/data");
    expect(output).toContain("/app/data");
    expect(output).toContain("[rw]");
  });
});

// ── #113: Separate stdout/stderr in logs ─────────────────────────────

describe("#113: Separate stdout/stderr in logs", () => {
  it("captures separate stdout and stderr lines", () => {
    const stdout = "line 1\nline 2\nline 3";
    const stderr = "error 1\nerror 2";

    const result = parseLogsOutput(stdout, "mycontainer", undefined, stderr);

    expect(result.stdoutLines).toEqual(["line 1", "line 2", "line 3"]);
    expect(result.stderrLines).toEqual(["error 1", "error 2"]);
  });

  it("omits stderrLines when stderr is empty", () => {
    const result = parseLogsOutput("hello", "mycontainer", undefined, "");

    expect(result.stdoutLines).toEqual(["hello"]);
    expect(result.stderrLines).toBeUndefined();
  });

  it("formats with stream info when available", () => {
    const data = {
      lines: ["line 1"],
      stdoutLines: ["line 1"],
      stderrLines: ["err 1"],
    };
    const output = formatLogs(data);
    expect(output).toContain("[stdout=1, stderr=1]");
  });
});

// ── #114: Clarify tail vs limit (tested via tool schema description) ──

describe("#114: Clarify tail vs limit", () => {
  it("limit truncates structured output independently of docker --tail", () => {
    // Simulate: docker returned 100 lines (via --tail 100), but limit is 10
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join("\n");
    const result = parseLogsOutput(lines, "app", 10);

    expect(result.lines).toHaveLength(10);
    expect(result.isTruncated).toBe(true);
  });
});

// ── #115: Network LS labels ──────────────────────────────────────────

describe("#115: Network LS labels", () => {
  it("parses labels from JSON output", () => {
    const stdout = JSON.stringify({
      ID: "abc123def456",
      Name: "mynet",
      Driver: "bridge",
      Scope: "local",
      Labels: "com.docker.compose.project=myapp,com.docker.compose.network=default",
    });

    const result = parseNetworkLsJson(stdout);

    expect(result.networks[0].labels).toBeDefined();
    expect(result.networks[0].labels!["com.docker.compose.project"]).toBe("myapp");
  });

  it("handles empty labels", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Name: "bridge",
      Driver: "bridge",
      Scope: "local",
      Labels: "",
    });

    const result = parseNetworkLsJson(stdout);
    expect(result.networks[0].labels).toBeUndefined();
  });
});

// ── #116: Network LS boolean fields ──────────────────────────────────

describe("#116: Network LS boolean fields", () => {
  it("parses ipv6, internal, attachable from JSON", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Name: "mynet",
      Driver: "bridge",
      Scope: "local",
      IPv6: "true",
      Internal: "false",
      Attachable: "true",
    });

    const result = parseNetworkLsJson(stdout);

    expect(result.networks[0].ipv6).toBe(true);
    expect(result.networks[0].internal).toBe(false);
    expect(result.networks[0].attachable).toBe(true);
  });

  it("omits boolean fields when not present in JSON", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Name: "bridge",
      Driver: "bridge",
      Scope: "local",
    });

    const result = parseNetworkLsJson(stdout);

    expect(result.networks[0].ipv6).toBeUndefined();
    expect(result.networks[0].internal).toBeUndefined();
    expect(result.networks[0].attachable).toBeUndefined();
  });

  it("formats flags in human output", () => {
    const data = {
      networks: [
        {
          id: "abc",
          name: "mynet",
          driver: "bridge",
          scope: "local",
          ipv6: true,
          internal: true,
          attachable: false,
        },
      ],
    };
    const output = formatNetworkLs(data);
    expect(output).toContain("[ipv6, internal]");
    expect(output).not.toContain("attachable");
  });
});

// ── #117: PS labels ──────────────────────────────────────────────────

describe("#117: PS labels", () => {
  it("parses labels from docker ps JSON", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Names: "web",
      Image: "nginx",
      Status: "Up 1 hour",
      State: "running",
      Ports: "",
      Labels: "maintainer=team,version=1.0",
    });

    const result = parsePsJson(stdout);

    expect(result.containers[0].labels).toBeDefined();
    expect(result.containers[0].labels!.maintainer).toBe("team");
    expect(result.containers[0].labels!.version).toBe("1.0");
  });

  it("omits labels when empty", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Names: "web",
      Image: "nginx",
      Status: "Up",
      State: "running",
      Ports: "",
      Labels: "",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].labels).toBeUndefined();
  });
});

// ── #118: PS networks ────────────────────────────────────────────────

describe("#118: PS networks", () => {
  it("parses networks from docker ps JSON", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Names: "web",
      Image: "nginx",
      Status: "Up 1 hour",
      State: "running",
      Ports: "",
      Networks: "bridge,mynet",
    });

    const result = parsePsJson(stdout);

    expect(result.containers[0].networks).toEqual(["bridge", "mynet"]);
  });

  it("omits networks when empty", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Names: "web",
      Image: "nginx",
      Status: "Up",
      State: "running",
      Ports: "",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].networks).toBeUndefined();
  });
});

// ── #119: Pull digest-only parsing ───────────────────────────────────

describe("#119: Pull digest-only parsing", () => {
  it("parses digest-only reference", () => {
    const stdout = [
      "Digest: sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      "Status: Downloaded newer image",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "nginx@sha256:abc123def456");

    expect(result.success).toBe(true);
  });

  it("still parses normal tag references", () => {
    const result = parsePullOutput("Status: Downloaded newer image", "", 0, "nginx:1.25");

    expect(result.success).toBe(true);
  });
});

// ── #120: Pull size output ───────────────────────────────────────────

describe("#120: Pull size output", () => {
  it("extracts size from pull summary", () => {
    const stdout = [
      "latest: Pulling from library/nginx",
      "abc123: Pull complete",
      "Digest: sha256:abc123",
      "Status: Downloaded newer image for nginx:latest",
      "Total: 42.5MB",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "nginx:latest");

    expect(result.size).toBe("42.5MB");
  });

  it("omits size when not present", () => {
    const stdout = "Status: Image is up to date for nginx:latest";
    const result = parsePullOutput(stdout, "", 0, "nginx:latest");
    expect(result.size).toBeUndefined();
  });
});

// ── #121: Run structured error ───────────────────────────────────────

describe("#121: Run structured error", () => {
  it("returns exitCode and errorCategory for failed runs", () => {
    const result = parseRunOutput(
      "",
      "nginx",
      true,
      undefined,
      1,
      "Error response from daemon: No such image: nonexistent:latest",
    );

    expect(result.exitCode).toBe(1);
    expect(result.errorCategory).toBe("image-not-found");
    expect(result.stderr).toContain("No such image");
  });

  it("categorizes port conflict", () => {
    const result = parseRunOutput(
      "",
      "nginx",
      true,
      undefined,
      1,
      "Error: port is already allocated",
    );

    expect(result.errorCategory).toBe("port-conflict");
  });

  it("categorizes permission denied", () => {
    const result = parseRunOutput("", "nginx", true, undefined, 1, "Error: permission denied");

    expect(result.errorCategory).toBe("permission-denied");
  });

  it("categorizes daemon error", () => {
    const result = parseRunOutput(
      "",
      "nginx",
      true,
      undefined,
      1,
      "Cannot connect to the Docker daemon",
    );

    expect(result.errorCategory).toBe("daemon-error");
  });

  it("returns unknown for unrecognized errors", () => {
    const result = parseRunOutput("", "nginx", true, undefined, 1, "some random error");

    expect(result.errorCategory).toBe("unknown");
  });
});

// ── #122: Run stdout/stderr capture ──────────────────────────────────

describe("#122: Run stdout/stderr capture", () => {
  it("captures stdout for non-detached runs", () => {
    const result = parseRunOutput("Hello from container\n", "alpine", false, undefined, 0, "");

    expect(result.stdout).toBe("Hello from container\n");
    expect(result.exitCode).toBe(0);
    expect(result.detached).toBe(false);
  });

  it("captures stderr for non-detached runs", () => {
    const result = parseRunOutput("output", "alpine", false, undefined, 1, "error output");

    expect(result.stderr).toBe("error output");
    expect(result.exitCode).toBe(1);
  });

  it("does not capture stdout/stderr for detached runs without error", () => {
    const result = parseRunOutput("abc123def456\n", "nginx", true, undefined, 0, "");

    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

// ── #123: Stats memoryUsageBytes and memoryLimitBytes ────────────────

describe("#123: Stats numeric memory fields", () => {
  it("parses memory usage and limit to bytes", () => {
    const stdout = JSON.stringify({
      Container: "abc123def456",
      Name: "web",
      CPUPerc: "1.23%",
      MemUsage: "150MiB / 1GiB",
      MemPerc: "14.65%",
      NetIO: "0B / 0B",
      BlockIO: "0B / 0B",
      PIDs: "12",
    });

    const result = parseStatsJson(stdout);

    expect(result.containers[0].memoryUsageBytes).toBe(157286400); // 150 * 1024 * 1024
    expect(result.containers[0].memoryLimitBytes).toBe(1073741824); // 1 * 1024 * 1024 * 1024
  });

  it("handles kB units", () => {
    expect(parseSizeToBytes("500kB")).toBe(500000);
  });

  it("handles plain B", () => {
    expect(parseSizeToBytes("1024B")).toBe(1024);
  });

  it("handles GiB", () => {
    expect(parseSizeToBytes("2GiB")).toBe(2147483648);
  });

  it("handles unparseable values", () => {
    expect(parseSizeToBytes("--")).toBe(0);
    expect(parseSizeToBytes("")).toBe(0);
  });
});

// ── #124: Stats structured I/O fields ────────────────────────────────

describe("#124: Stats structured I/O fields", () => {
  it("parses network and block I/O to bytes", () => {
    const stdout = JSON.stringify({
      Container: "abc123",
      Name: "web",
      CPUPerc: "0.5%",
      MemUsage: "100MiB / 512MiB",
      MemPerc: "19.5%",
      NetIO: "1.5kB / 2.3kB",
      BlockIO: "8.19kB / 0B",
      PIDs: "5",
    });

    const result = parseStatsJson(stdout);

    expect(result.containers[0].netIn).toBe(1500);
    expect(result.containers[0].netOut).toBe(2300);
    expect(result.containers[0].blockRead).toBe(8190);
    expect(result.containers[0].blockWrite).toBe(0);
  });

  it("handles zero I/O", () => {
    const stdout = JSON.stringify({
      Container: "abc123",
      Name: "idle",
      CPUPerc: "0%",
      MemUsage: "1MiB / 1GiB",
      MemPerc: "0.1%",
      NetIO: "0B / 0B",
      BlockIO: "0B / 0B",
      PIDs: "1",
    });

    const result = parseStatsJson(stdout);

    expect(result.containers[0].netIn).toBe(0);
    expect(result.containers[0].netOut).toBe(0);
    expect(result.containers[0].blockRead).toBe(0);
    expect(result.containers[0].blockWrite).toBe(0);
  });

  it("handles MB units", () => {
    const stdout = JSON.stringify({
      Container: "abc123",
      Name: "busy",
      CPUPerc: "50%",
      MemUsage: "256MiB / 1GiB",
      MemPerc: "25%",
      NetIO: "100MB / 50MB",
      BlockIO: "1GB / 500MB",
      PIDs: "20",
    });

    const result = parseStatsJson(stdout);

    expect(result.containers[0].netIn).toBe(100_000_000);
    expect(result.containers[0].netOut).toBe(50_000_000);
    expect(result.containers[0].blockRead).toBe(1_000_000_000);
    expect(result.containers[0].blockWrite).toBe(500_000_000);
  });
});

// ── #125: Volume LS labels ───────────────────────────────────────────

describe("#125: Volume LS labels", () => {
  it("parses labels from volume JSON output", () => {
    const stdout = JSON.stringify({
      Name: "my-data",
      Driver: "local",
      Mountpoint: "/var/lib/docker/volumes/my-data/_data",
      Scope: "local",
      Labels: "com.docker.compose.project=myapp,com.docker.compose.volume=data",
    });

    const result = parseVolumeLsJson(stdout);

    expect(result.volumes[0].labels).toBeDefined();
    expect(result.volumes[0].labels!["com.docker.compose.project"]).toBe("myapp");
  });

  it("handles no labels", () => {
    const stdout = JSON.stringify({
      Name: "my-vol",
      Driver: "local",
      Mountpoint: "/var/lib/docker/volumes/my-vol/_data",
      Scope: "local",
    });

    const result = parseVolumeLsJson(stdout);
    expect(result.volumes[0].labels).toBeUndefined();
  });

  it("formats labels count", () => {
    const data = {
      volumes: [
        { name: "vol1", driver: "local", scope: "local", labels: { key1: "val1", key2: "val2" } },
      ],
    };
    const output = formatVolumeLs(data);
    expect(output).toContain("labels=2");
  });
});
