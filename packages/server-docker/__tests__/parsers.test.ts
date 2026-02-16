import { describe, it, expect } from "vitest";
import {
  parsePsJson,
  parseBuildOutput,
  parseLogsOutput,
  parseImagesJson,
  parseInspectJson,
  parseNetworkLsJson,
  parseVolumeLsJson,
  parseComposePsJson,
  parseComposeLogsOutput,
  parseStatsJson,
} from "../src/lib/parsers.js";

describe("parsePsJson", () => {
  it("parses multiple containers", () => {
    const stdout = [
      JSON.stringify({
        ID: "abc123def456",
        Names: "web-app",
        Image: "nginx:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: "0.0.0.0:8080->80/tcp",
        CreatedAt: "2024-01-01 10:00:00",
      }),
      JSON.stringify({
        ID: "def456abc789",
        Names: "db",
        Image: "postgres:16",
        Status: "Exited (0) 3 hours ago",
        State: "exited",
        Ports: "",
        CreatedAt: "2024-01-01 09:00:00",
      }),
    ].join("\n");

    const result = parsePsJson(stdout);

    expect(result.total).toBe(2);
    expect(result.running).toBe(1);
    expect(result.stopped).toBe(1);
    expect(result.containers[0].id).toBe("abc123def456");
    expect(result.containers[0].name).toBe("web-app");
    expect(result.containers[0].image).toBe("nginx:latest");
    expect(result.containers[0].state).toBe("running");
    expect(result.containers[0].ports).toHaveLength(1);
    expect(result.containers[0].ports[0]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
  });

  it("parses empty output", () => {
    const result = parsePsJson("");
    expect(result.total).toBe(0);
    expect(result.running).toBe(0);
    expect(result.stopped).toBe(0);
    expect(result.containers).toEqual([]);
  });

  it("parses container with multiple ports", () => {
    const stdout = JSON.stringify({
      ID: "aaa111",
      Names: "multi-port",
      Image: "myapp",
      Status: "Up 1 hour",
      State: "running",
      Ports: "0.0.0.0:443->443/tcp, 0.0.0.0:8080->80/tcp, 53/udp",
      CreatedAt: "2024-01-01",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].ports).toHaveLength(3);
    expect(result.containers[0].ports[0]).toEqual({ host: 443, container: 443, protocol: "tcp" });
    expect(result.containers[0].ports[1]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
    expect(result.containers[0].ports[2]).toEqual({ container: 53, protocol: "udp" });
  });

  it("handles container with no ports", () => {
    const stdout = JSON.stringify({
      ID: "bbb222",
      Names: "worker",
      Image: "worker:1",
      Status: "Up 5 minutes",
      State: "running",
      Ports: "",
      CreatedAt: "2024-01-01",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].ports).toEqual([]);
  });

  it("preserves full container IDs (no truncation) since --no-trunc is passed", () => {
    const stdout = JSON.stringify({
      ID: "abc123def456789012345678901234567890123456789012345678901234abcd",
      Names: "long-id-app",
      Image: "node:20",
      Status: "Up 1 hour",
      State: "running",
      Ports: "",
      CreatedAt: "2024-01-15 10:30:00",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].id).toBe(
      "abc123def456789012345678901234567890123456789012345678901234abcd",
    );
  });
  it("prefers RunningFor over CreatedAt for relative timestamps", () => {
    const stdout = JSON.stringify({
      ID: "abc123def456",
      Names: "relative-ts",
      Image: "node:20",
      Status: "Up 2 hours",
      State: "running",
      Ports: "",
      CreatedAt: "2024-01-15 10:30:00 +0000 UTC",
      RunningFor: "2 hours ago",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].created).toBe("2 hours ago");
  });

  it("falls back to CreatedAt when RunningFor is absent", () => {
    const stdout = JSON.stringify({
      ID: "abc123def456",
      Names: "iso-ts",
      Image: "node:20",
      Status: "Up 1 hour",
      State: "running",
      Ports: "",
      CreatedAt: "2024-01-15 10:30:00",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].created).toBe("2024-01-15 10:30:00");
  });
});

// ---------------------------------------------------------------------------
// parsePorts() indirect tests via parsePsJson — edge cases
// ---------------------------------------------------------------------------

describe("parsePorts (via parsePsJson)", () => {
  /** Helper to extract parsed ports from a Ports string via parsePsJson */
  function portsFor(portsStr: string) {
    const stdout = JSON.stringify({
      ID: "test123456789",
      Names: "ports-test",
      Image: "test:1",
      Status: "Up",
      State: "running",
      Ports: portsStr,
      CreatedAt: "2024-01-01",
    });
    return parsePsJson(stdout).containers[0].ports;
  }

  it("returns empty array for empty string", () => {
    expect(portsFor("")).toEqual([]);
  });

  it("parses simple host:container format '8080:80' as container-only (no arrow)", () => {
    // "8080:80" without "->" is parsed as a bare port string
    // The parser expects "host->container" with "->"; "8080:80" lacks a protocol, defaults to tcp
    const ports = portsFor("8080:80");
    // Without "->", the parser treats the whole thing as a container-only port
    expect(ports).toHaveLength(1);
    expect(ports[0].protocol).toBe("tcp");
  });

  it("parses bare port number '80' as container-only", () => {
    // "80" without protocol defaults to tcp
    const ports = portsFor("80");
    expect(ports).toHaveLength(1);
    expect(ports[0].container).toBe(80);
    expect(ports[0].protocol).toBe("tcp");
    expect(ports[0].host).toBeUndefined();
  });

  it("parses standard Docker format '0.0.0.0:8080->80/tcp'", () => {
    const ports = portsFor("0.0.0.0:8080->80/tcp");
    expect(ports).toHaveLength(1);
    expect(ports[0]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
  });

  it("parses mixed format '443->443/tcp, 53/udp'", () => {
    const ports = portsFor("443->443/tcp, 53/udp");
    expect(ports).toHaveLength(2);
    expect(ports[0]).toEqual({ host: 443, container: 443, protocol: "tcp" });
    expect(ports[1]).toEqual({ container: 53, protocol: "udp" });
  });

  it("parses port with udp protocol '53/udp'", () => {
    const ports = portsFor("53/udp");
    expect(ports).toHaveLength(1);
    expect(ports[0]).toEqual({ container: 53, protocol: "udp" });
  });

  it("parses multiple comma-separated ports", () => {
    const ports = portsFor("0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:8080->8080/tcp");
    expect(ports).toHaveLength(3);
    expect(ports[0]).toEqual({ host: 80, container: 80, protocol: "tcp" });
    expect(ports[1]).toEqual({ host: 443, container: 443, protocol: "tcp" });
    expect(ports[2]).toEqual({ host: 8080, container: 8080, protocol: "tcp" });
  });

  it("parses IPv6 binding format ':::8080->80/tcp'", () => {
    const ports = portsFor(":::8080->80/tcp");
    expect(ports).toHaveLength(1);
    expect(ports[0].host).toBe(8080);
    expect(ports[0].container).toBe(80);
    expect(ports[0].protocol).toBe("tcp");
  });

  it("parses port range-like string without crashing", () => {
    // Docker can output port ranges; parser should not crash
    const ports = portsFor("0.0.0.0:9000->9000/tcp");
    expect(ports).toHaveLength(1);
    expect(ports[0]).toEqual({ host: 9000, container: 9000, protocol: "tcp" });
  });

  it("handles port with no protocol specified (defaults to tcp)", () => {
    const ports = portsFor("3000");
    expect(ports).toHaveLength(1);
    expect(ports[0].container).toBe(3000);
    expect(ports[0].protocol).toBe("tcp");
  });

  it("handles NaN port gracefully (non-numeric string)", () => {
    const ports = portsFor("abc/tcp");
    expect(ports).toHaveLength(1);
    // parseInt("abc") returns NaN
    expect(ports[0].container).toBeNaN();
    expect(ports[0].protocol).toBe("tcp");
  });

  it("parses port > 65535 without error (parser does not validate range)", () => {
    const ports = portsFor("99999/tcp");
    expect(ports).toHaveLength(1);
    expect(ports[0].container).toBe(99999);
    expect(ports[0].protocol).toBe("tcp");
  });

  it("handles whitespace-only port string", () => {
    const ports = portsFor("   ");
    // After trim and filter(Boolean), an all-whitespace segment is empty
    expect(ports).toEqual([]);
  });
});

describe("parseBuildOutput", () => {
  it("parses successful build", () => {
    const stdout = `#1 [internal] load build definition
#2 [internal] load metadata
#3 [1/3] FROM docker.io/library/node:20
#4 [2/3] COPY package.json .
#5 [3/3] RUN npm install
#6 exporting to image
#6 writing image sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`;
    const stderr = "";

    const result = parseBuildOutput(stdout, stderr, 0, 12.5);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("a1b2c3d4e5f6");
    expect(result.duration).toBe(12.5);
    expect(result.steps).toBe(6);
    expect(result.errors).toEqual([]);
  });

  it("parses failed build", () => {
    const stdout = `#1 [internal] load build definition
#2 [1/2] FROM docker.io/library/node:20
#3 [2/2] RUN npm install`;
    const stderr = 'ERROR: process "/bin/sh -c npm install" did not complete successfully';

    const result = parseBuildOutput(stdout, stderr, 1, 8.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
    expect(result.duration).toBe(8.0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("parses build with no image ID", () => {
    const result = parseBuildOutput("step 1 done\nstep 2 done", "", 0, 5.0);
    expect(result.success).toBe(true);
    expect(result.imageId).toBeUndefined();
  });
});

describe("parseLogsOutput", () => {
  it("parses log lines", () => {
    const stdout =
      "2024-01-01 Starting app\n2024-01-01 Listening on port 3000\n2024-01-01 Request received";
    const result = parseLogsOutput(stdout, "web-app");

    expect(result.container).toBe("web-app");
    expect(result.lines).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.lines[0]).toBe("2024-01-01 Starting app");
  });

  it("handles empty logs", () => {
    const result = parseLogsOutput("", "empty-container");
    expect(result.container).toBe("empty-container");
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("truncates lines when limit is exceeded", () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`);
    const stdout = lines.join("\n");
    const result = parseLogsOutput(stdout, "busy-app", 50);

    expect(result.lines).toHaveLength(50);
    expect(result.total).toBe(50);
    expect(result.isTruncated).toBe(true);
    expect(result.totalLines).toBe(200);
    expect(result.lines[0]).toBe("line 1");
    expect(result.lines[49]).toBe("line 50");
  });

  it("does not truncate when lines are within limit", () => {
    const stdout = "line 1\nline 2\nline 3";
    const result = parseLogsOutput(stdout, "small-app", 100);

    expect(result.lines).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.isTruncated).toBeUndefined();
    expect(result.totalLines).toBeUndefined();
  });

  it("does not truncate when no limit is provided", () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`);
    const stdout = lines.join("\n");
    const result = parseLogsOutput(stdout, "unlimited-app");

    expect(result.lines).toHaveLength(200);
    expect(result.total).toBe(200);
    expect(result.isTruncated).toBeUndefined();
    expect(result.totalLines).toBeUndefined();
  });
});

describe("parseImagesJson", () => {
  it("parses multiple images", () => {
    const stdout = [
      JSON.stringify({
        ID: "sha256:abc123def456abc123",
        Repository: "nginx",
        Tag: "latest",
        Size: "187MB",
        CreatedSince: "2 weeks ago",
      }),
      JSON.stringify({
        ID: "sha256:def456abc789def456",
        Repository: "node",
        Tag: "20-alpine",
        Size: "126MB",
        CreatedSince: "3 weeks ago",
      }),
    ].join("\n");

    const result = parseImagesJson(stdout);

    expect(result.total).toBe(2);
    expect(result.images[0].id).toBe("sha256:abc12");
    expect(result.images[0].repository).toBe("nginx");
    expect(result.images[0].tag).toBe("latest");
    expect(result.images[0].size).toBe("187MB");
    expect(result.images[1].repository).toBe("node");
    expect(result.images[1].tag).toBe("20-alpine");
  });

  it("parses empty image list", () => {
    const result = parseImagesJson("");
    expect(result.total).toBe(0);
    expect(result.images).toEqual([]);
  });

  it("handles image with CreatedAt fallback", () => {
    const stdout = JSON.stringify({
      ID: "sha256:111222333444555666",
      Repository: "myapp",
      Tag: "v1",
      Size: "50MB",
      CreatedAt: "2024-01-01T00:00:00Z",
    });

    const result = parseImagesJson(stdout);
    expect(result.images[0].created).toBe("2024-01-01T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// parseInspectJson
// ---------------------------------------------------------------------------

describe("parseInspectJson", () => {
  it("parses a running container inspect output", () => {
    const stdout = JSON.stringify([
      {
        Id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        Name: "/web-app",
        State: {
          Status: "running",
          Running: true,
          StartedAt: "2024-06-01T10:00:00Z",
        },
        Config: {
          Image: "nginx:latest",
        },
        Created: "2024-06-01T09:00:00Z",
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.id).toBe("abc123def456");
    expect(result.name).toBe("web-app");
    expect(result.state.status).toBe("running");
    expect(result.state.running).toBe(true);
    expect(result.state.startedAt).toBe("2024-06-01T10:00:00Z");
    expect(result.image).toBe("nginx:latest");
    expect(result.created).toBe("2024-06-01T09:00:00Z");
  });

  it("parses a stopped container without startedAt", () => {
    const stdout = JSON.stringify([
      {
        Id: "def456abc789def456abc789def456abc789def456abc789def456abc789def4",
        Name: "/stopped-app",
        State: {
          Status: "exited",
          Running: false,
          StartedAt: "0001-01-01T00:00:00Z",
        },
        Config: {
          Image: "myapp:v1",
        },
        Created: "2024-05-15T08:00:00Z",
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.id).toBe("def456abc789");
    expect(result.name).toBe("stopped-app");
    expect(result.state.status).toBe("exited");
    expect(result.state.running).toBe(false);
    expect(result.state.startedAt).toBeUndefined();
    expect(result.image).toBe("myapp:v1");
  });

  it("handles non-array JSON (single object)", () => {
    const stdout = JSON.stringify({
      Id: "aaa111bbb222",
      Name: "/single",
      State: { Status: "running", Running: true },
      Config: { Image: "test:1" },
      Created: "2024-01-01T00:00:00Z",
    });

    const result = parseInspectJson(stdout);
    expect(result.name).toBe("single");
    expect(result.state.running).toBe(true);
  });

  it("includes platform when present", () => {
    const stdout = JSON.stringify([
      {
        Id: "ccc333ddd444",
        Name: "/plat-test",
        State: { Status: "running", Running: true },
        Config: { Image: "node:20" },
        Platform: "linux",
        Created: "2024-01-01T00:00:00Z",
      },
    ]);

    const result = parseInspectJson(stdout);
    expect(result.platform).toBe("linux");
  });
});

// ---------------------------------------------------------------------------
// parseNetworkLsJson
// ---------------------------------------------------------------------------

describe("parseNetworkLsJson", () => {
  it("parses multiple networks", () => {
    const stdout = [
      JSON.stringify({
        ID: "aaa111bbb222ccc333",
        Name: "bridge",
        Driver: "bridge",
        Scope: "local",
      }),
      JSON.stringify({ ID: "ddd444eee555fff666", Name: "host", Driver: "host", Scope: "local" }),
      JSON.stringify({
        ID: "ggg777hhh888iii999",
        Name: "mynet",
        Driver: "overlay",
        Scope: "swarm",
      }),
    ].join("\n");

    const result = parseNetworkLsJson(stdout);

    expect(result.total).toBe(3);
    expect(result.networks[0].id).toBe("aaa111bbb222");
    expect(result.networks[0].name).toBe("bridge");
    expect(result.networks[0].driver).toBe("bridge");
    expect(result.networks[0].scope).toBe("local");
    expect(result.networks[2].name).toBe("mynet");
    expect(result.networks[2].driver).toBe("overlay");
    expect(result.networks[2].scope).toBe("swarm");
  });

  it("parses empty output", () => {
    const result = parseNetworkLsJson("");
    expect(result.total).toBe(0);
    expect(result.networks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseVolumeLsJson
// ---------------------------------------------------------------------------

describe("parseVolumeLsJson", () => {
  it("parses multiple volumes", () => {
    const stdout = [
      JSON.stringify({
        Name: "my-data",
        Driver: "local",
        Mountpoint: "/var/lib/docker/volumes/my-data/_data",
        Scope: "local",
      }),
      JSON.stringify({
        Name: "pg-data",
        Driver: "local",
        Mountpoint: "/var/lib/docker/volumes/pg-data/_data",
        Scope: "local",
      }),
    ].join("\n");

    const result = parseVolumeLsJson(stdout);

    expect(result.total).toBe(2);
    expect(result.volumes[0].name).toBe("my-data");
    expect(result.volumes[0].driver).toBe("local");
    expect(result.volumes[0].mountpoint).toContain("my-data");
    expect(result.volumes[0].scope).toBe("local");
    expect(result.volumes[1].name).toBe("pg-data");
  });

  it("parses empty output", () => {
    const result = parseVolumeLsJson("");
    expect(result.total).toBe(0);
    expect(result.volumes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseComposePsJson
// ---------------------------------------------------------------------------

describe("parseComposePsJson", () => {
  it("parses multiple compose services with Ports string fallback", () => {
    const stdout = [
      JSON.stringify({
        Name: "myapp-web-1",
        Service: "web",
        State: "running",
        Status: "Up 2 hours",
        Ports: "0.0.0.0:8080->80/tcp",
      }),
      JSON.stringify({
        Name: "myapp-db-1",
        Service: "db",
        State: "running",
        Status: "Up 2 hours",
        Ports: "",
      }),
    ].join("\n");

    const result = parseComposePsJson(stdout);

    expect(result.total).toBe(2);
    expect(result.services[0].name).toBe("myapp-web-1");
    expect(result.services[0].service).toBe("web");
    expect(result.services[0].state).toBe("running");
    expect(result.services[0].status).toBe("Up 2 hours");
    expect(result.services[0].ports).toEqual([{ host: 8080, container: 80, protocol: "tcp" }]);
    expect(result.services[1].name).toBe("myapp-db-1");
    expect(result.services[1].ports).toBeUndefined();
  });

  it("parses structured Publishers array from compose v2 JSON", () => {
    const stdout = JSON.stringify({
      Name: "myapp-web-1",
      Service: "web",
      State: "running",
      Status: "Up 2 hours",
      Publishers: [
        { URL: "0.0.0.0", TargetPort: 80, PublishedPort: 8080, Protocol: "tcp" },
        { URL: "", TargetPort: 443, PublishedPort: 0, Protocol: "tcp" },
      ],
    });

    const result = parseComposePsJson(stdout);

    expect(result.services[0].ports).toHaveLength(2);
    expect(result.services[0].ports![0]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
    expect(result.services[0].ports![1]).toEqual({ container: 443, protocol: "tcp" });
  });

  it("parses Publishers with snake_case keys", () => {
    const stdout = JSON.stringify({
      Name: "myapp-api-1",
      Service: "api",
      State: "running",
      Status: "Up 1 hour",
      Publishers: [{ target_port: 3000, published_port: 3000, protocol: "tcp" }],
    });

    const result = parseComposePsJson(stdout);

    expect(result.services[0].ports).toHaveLength(1);
    expect(result.services[0].ports![0]).toEqual({ host: 3000, container: 3000, protocol: "tcp" });
  });

  it("handles empty Publishers array", () => {
    const stdout = JSON.stringify({
      Name: "myapp-worker-1",
      Service: "worker",
      State: "running",
      Status: "Up 1 hour",
      Publishers: [],
    });

    const result = parseComposePsJson(stdout);
    expect(result.services[0].ports).toBeUndefined();
  });

  it("parses empty output", () => {
    const result = parseComposePsJson("");
    expect(result.total).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("handles service with exited state", () => {
    const stdout = JSON.stringify({
      Name: "myapp-worker-1",
      Service: "worker",
      State: "Exited",
      Status: "Exited (0) 5 minutes ago",
      Ports: "",
    });

    const result = parseComposePsJson(stdout);
    expect(result.services[0].state).toBe("exited");
    expect(result.services[0].status).toBe("Exited (0) 5 minutes ago");
  });
});

// ---------------------------------------------------------------------------

// parseComposeLogsOutput
// ---------------------------------------------------------------------------

describe("parseComposeLogsOutput", () => {
  it("parses multi-service compose logs with timestamps", () => {
    const stdout = [
      "web-1  | 2024-06-01T10:00:00.000000000Z Starting server...",
      "web-1  | 2024-06-01T10:00:01.000000000Z Listening on port 3000",
      "db-1   | 2024-06-01T10:00:00.500000000Z PostgreSQL init",
      "db-1   | 2024-06-01T10:00:02.000000000Z Ready to accept connections",
    ].join("\n");

    const result = parseComposeLogsOutput(stdout);

    expect(result.services).toContain("web-1");
    expect(result.services).toContain("db-1");
    expect(result.total).toBe(4);
    expect(result.entries[0]).toEqual({
      timestamp: "2024-06-01T10:00:00.000000000Z",
      service: "web-1",
      message: "Starting server...",
    });
    expect(result.entries[2]).toEqual({
      timestamp: "2024-06-01T10:00:00.500000000Z",
      service: "db-1",
      message: "PostgreSQL init",
    });
  });

  it("parses logs without timestamps", () => {
    const stdout = ["web-1  | Starting server...", "web-1  | Listening on port 3000"].join("\n");

    const result = parseComposeLogsOutput(stdout);

    expect(result.services).toEqual(["web-1"]);
    expect(result.total).toBe(2);
    expect(result.entries[0]).toEqual({
      service: "web-1",
      message: "Starting server...",
    });
    expect(result.entries[0].timestamp).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseComposeLogsOutput("");
    expect(result.services).toEqual([]);
    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("truncates entries when limit is exceeded", () => {
    const lines = Array.from(
      { length: 100 },
      (_, i) => `svc-1  | 2024-01-01T00:00:${String(i).padStart(2, "0")}.000Z line ${i + 1}`,
    );
    const stdout = lines.join("\n");
    const result = parseComposeLogsOutput(stdout, 10);

    expect(result.total).toBe(10);
    expect(result.entries).toHaveLength(10);
    expect(result.isTruncated).toBe(true);
    expect(result.totalEntries).toBe(100);
  });

  it("does not truncate when within limit", () => {
    const stdout = "svc-1  | line 1\nsvc-1  | line 2";
    const result = parseComposeLogsOutput(stdout, 100);

    expect(result.total).toBe(2);
    expect(result.isTruncated).toBeUndefined();
    expect(result.totalEntries).toBeUndefined();
  });

  it("handles lines without pipe separator", () => {
    const stdout = "some raw output without pipe";
    const result = parseComposeLogsOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.entries[0].service).toBe("unknown");
    expect(result.entries[0].message).toBe("some raw output without pipe");
  });
});

// parseStatsJson
// ---------------------------------------------------------------------------

describe("parseStatsJson", () => {
  it("parses multiple container stats", () => {
    const stdout = [
      JSON.stringify({
        Container: "abc123def456",
        Name: "web-app",
        CPUPerc: "1.23%",
        MemUsage: "150MiB / 1GiB",
        MemPerc: "14.65%",
        NetIO: "1.5kB / 2.3kB",
        BlockIO: "8.19kB / 0B",
        PIDs: "12",
      }),
      JSON.stringify({
        Container: "def456abc789",
        Name: "db",
        CPUPerc: "0.50%",
        MemUsage: "256MiB / 2GiB",
        MemPerc: "12.50%",
        NetIO: "500B / 1kB",
        BlockIO: "4.1MB / 12kB",
        PIDs: "8",
      }),
    ].join("\n");

    const result = parseStatsJson(stdout);

    expect(result.total).toBe(2);
    expect(result.containers[0].id).toBe("abc123def456");
    expect(result.containers[0].name).toBe("web-app");
    expect(result.containers[0].cpuPercent).toBe(1.23);
    expect(result.containers[0].memoryUsage).toBe("150MiB");
    expect(result.containers[0].memoryLimit).toBe("1GiB");
    expect(result.containers[0].memoryPercent).toBe(14.65);
    expect(result.containers[0].netIO).toBe("1.5kB / 2.3kB");
    expect(result.containers[0].blockIO).toBe("8.19kB / 0B");
    expect(result.containers[0].pids).toBe(12);
    expect(result.containers[1].name).toBe("db");
    expect(result.containers[1].cpuPercent).toBe(0.5);
  });

  it("parses empty output", () => {
    const result = parseStatsJson("");
    expect(result.total).toBe(0);
    expect(result.containers).toEqual([]);
  });

  it("handles missing fields gracefully", () => {
    const stdout = JSON.stringify({
      Container: "aaa111bbb222",
      Name: "minimal",
    });

    const result = parseStatsJson(stdout);
    expect(result.containers[0].id).toBe("aaa111bbb222");
    expect(result.containers[0].name).toBe("minimal");
    expect(result.containers[0].cpuPercent).toBe(0);
    expect(result.containers[0].memoryPercent).toBe(0);
    expect(result.containers[0].pids).toBe(0);
  });

  it("strips leading slash from container name", () => {
    const stdout = JSON.stringify({
      Container: "abc123def456",
      Name: "/my-container",
      CPUPerc: "0%",
      MemUsage: "0B / 0B",
      MemPerc: "0%",
      NetIO: "0B / 0B",
      BlockIO: "0B / 0B",
      PIDs: "0",
    });

    const result = parseStatsJson(stdout);
    expect(result.containers[0].name).toBe("my-container");
  });

  it("truncates long container IDs to 12 characters", () => {
    const stdout = JSON.stringify({
      Container: "abc123def456789012345678901234567890",
      Name: "long-id",
      CPUPerc: "0.01%",
      MemUsage: "10MiB / 512MiB",
      MemPerc: "1.95%",
      NetIO: "0B / 0B",
      BlockIO: "0B / 0B",
      PIDs: "1",
    });

    const result = parseStatsJson(stdout);
    expect(result.containers[0].id).toBe("abc123def456");
    expect(result.containers[0].id).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// parseInspectJson — image-type inspect
// ---------------------------------------------------------------------------

describe("parseInspectJson — image inspect", () => {
  it("parses an image inspect output with RepoTags, Size, Architecture, Os", () => {
    const stdout = JSON.stringify([
      {
        Id: "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        RepoTags: ["nginx:latest", "nginx:1.25"],
        RepoDigests: ["nginx@sha256:abcdef1234567890"],
        Created: "2024-06-01T09:00:00Z",
        Size: 187432960,
        Architecture: "amd64",
        Os: "linux",
        Config: {
          Env: ["PATH=/usr/local/sbin:/usr/local/bin", "NGINX_VERSION=1.25.4"],
          Cmd: ["nginx", "-g", "daemon off;"],
          Entrypoint: ["/docker-entrypoint.sh"],
        },
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.inspectType).toBe("image");
    expect(result.id).toBe("sha256:abc12");
    expect(result.name).toBe("nginx:latest");
    expect(result.image).toBe("nginx:latest");
    expect(result.platform).toBe("linux/amd64");
    expect(result.created).toBe("2024-06-01T09:00:00Z");
    expect(result.repoTags).toEqual(["nginx:latest", "nginx:1.25"]);
    expect(result.repoDigests).toEqual(["nginx@sha256:abcdef1234567890"]);
    expect(result.size).toBe(187432960);
    expect(result.env).toEqual(["PATH=/usr/local/sbin:/usr/local/bin", "NGINX_VERSION=1.25.4"]);
    expect(result.cmd).toEqual(["nginx", "-g", "daemon off;"]);
    expect(result.entrypoint).toEqual(["/docker-entrypoint.sh"]);
    // Image should NOT have container state
    expect(result.state).toBeUndefined();
    expect(result.healthStatus).toBeUndefined();
    expect(result.restartPolicy).toBeUndefined();
  });

  it("parses image inspect with minimal fields", () => {
    const stdout = JSON.stringify([
      {
        Id: "sha256:def456abc789",
        RepoTags: ["myapp:v1"],
        Created: "2024-01-01T00:00:00Z",
        Config: {},
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.inspectType).toBe("image");
    expect(result.name).toBe("myapp:v1");
    expect(result.repoTags).toEqual(["myapp:v1"]);
    expect(result.env).toBeUndefined();
    expect(result.cmd).toBeUndefined();
    expect(result.entrypoint).toBeUndefined();
    expect(result.size).toBeUndefined();
  });

  it("falls back to ID for name when no RepoTags", () => {
    const stdout = JSON.stringify([
      {
        Id: "sha256:abc123def456abc123",
        RepoTags: [],
        RootFS: { Type: "layers" },
        Created: "2024-01-01T00:00:00Z",
        Config: {},
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.inspectType).toBe("image");
    expect(result.name).toBe("sha256:abc12");
  });

  it("still parses containers correctly (backward compatibility)", () => {
    const stdout = JSON.stringify([
      {
        Id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        Name: "/web-app",
        State: {
          Status: "running",
          Running: true,
          StartedAt: "2024-06-01T10:00:00Z",
        },
        Config: {
          Image: "nginx:latest",
        },
        Created: "2024-06-01T09:00:00Z",
      },
    ]);

    const result = parseInspectJson(stdout);

    expect(result.inspectType).toBe("container");
    expect(result.id).toBe("abc123def456");
    expect(result.name).toBe("web-app");
    expect(result.state?.status).toBe("running");
    expect(result.state?.running).toBe(true);
    expect(result.image).toBe("nginx:latest");
    // Container should NOT have image-specific fields
    expect(result.repoTags).toBeUndefined();
    expect(result.repoDigests).toBeUndefined();
    expect(result.size).toBeUndefined();
    expect(result.cmd).toBeUndefined();
    expect(result.entrypoint).toBeUndefined();
  });
});
