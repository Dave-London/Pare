/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw Docker CLI output.
 *
 * These tests use realistic fixtures (no Docker required) to ensure parsers
 * extract every container field, port mapping, image ID, and log line
 * without data loss.
 */
import { describe, it, expect } from "vitest";
import {
  parsePsJson,
  parseBuildOutput,
  parseLogsOutput,
  parseImagesJson,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// Fixtures: docker ps --format json
// ---------------------------------------------------------------------------

const PS_SINGLE_RUNNING = JSON.stringify({
  ID: "abc123def456",
  Names: "my-app",
  Image: "node:20",
  Status: "Up 2 hours",
  State: "running",
  Ports: "0.0.0.0:3000->3000/tcp",
  CreatedAt: "2024-01-01 10:00:00",
});

const PS_MULTIPLE_MIXED = [
  JSON.stringify({
    ID: "aaa111bbb222",
    Names: "web-server",
    Image: "nginx:latest",
    Status: "Up 5 hours",
    State: "running",
    Ports: "0.0.0.0:8080->80/tcp",
    CreatedAt: "2024-01-01 08:00:00",
  }),
  JSON.stringify({
    ID: "ccc333ddd444",
    Names: "database",
    Image: "postgres:16",
    Status: "Exited (0) 1 hour ago",
    State: "exited",
    Ports: "",
    CreatedAt: "2024-01-01 07:00:00",
  }),
  JSON.stringify({
    ID: "eee555fff666",
    Names: "cache",
    Image: "redis:7",
    Status: "Up 3 hours",
    State: "running",
    Ports: "0.0.0.0:6379->6379/tcp",
    CreatedAt: "2024-01-01 09:00:00",
  }),
  JSON.stringify({
    ID: "ggg777hhh888",
    Names: "worker",
    Image: "myapp-worker:latest",
    Status: "Exited (1) 30 minutes ago",
    State: "exited",
    Ports: "",
    CreatedAt: "2024-01-01 10:30:00",
  }),
].join("\n");

const PS_MULTIPLE_PORTS = JSON.stringify({
  ID: "mp1234567890",
  Names: "reverse-proxy",
  Image: "traefik:v3",
  Status: "Up 12 hours",
  State: "running",
  Ports: "0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:8080->8080/tcp",
  CreatedAt: "2024-01-01 00:00:00",
});

const PS_NO_PORTS = JSON.stringify({
  ID: "np1234567890",
  Names: "background-job",
  Image: "worker:1.0",
  Status: "Up 1 hour",
  State: "running",
  Ports: "",
  CreatedAt: "2024-01-01 11:00:00",
});

// ---------------------------------------------------------------------------
// Fixtures: docker build
// ---------------------------------------------------------------------------

const BUILD_SUCCESS_STDOUT = `#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 512B done
#2 [internal] load metadata for docker.io/library/node:20-alpine
#3 [1/5] FROM docker.io/library/node:20-alpine@sha256:abcdef123456
#4 [2/5] WORKDIR /app
#5 [3/5] COPY package*.json ./
#6 [4/5] RUN npm ci --production
#7 [5/5] COPY . .
#8 exporting to image
#8 exporting layers done
#8 writing image sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456 done
#8 naming to docker.io/library/my-app:latest done`;

const BUILD_FAILED_STDOUT = `#1 [internal] load build definition from Dockerfile
#2 [internal] load metadata for docker.io/library/node:20
#3 [1/3] FROM docker.io/library/node:20
#4 [2/3] COPY package.json .
#5 [3/3] RUN npm install`;

const BUILD_FAILED_STDERR = `ERROR: process "/bin/sh -c npm install" did not complete successfully: exit code: 1
error: failed to solve: process "/bin/sh -c npm install" did not complete successfully`;

const BUILD_LEGACY_STDOUT = `Step 1/4 : FROM node:20
Step 2/4 : WORKDIR /app
Step 3/4 : COPY . .
Step 4/4 : RUN npm install
Successfully built a1b2c3d4e5f6`;

const BUILD_NO_IMAGE_ID_STDOUT = `#1 [internal] load build definition
#2 [internal] load .dockerignore
#3 resolve image config`;

// ---------------------------------------------------------------------------
// Fixtures: docker logs
// ---------------------------------------------------------------------------

const LOGS_MULTILINE = [
  "2024-01-01T10:00:00.000Z INFO  Starting application...",
  "2024-01-01T10:00:01.123Z INFO  Connected to database",
  "2024-01-01T10:00:01.456Z INFO  Listening on port 3000",
  "2024-01-01T10:00:05.789Z DEBUG Healthcheck passed",
  "2024-01-01T10:01:00.000Z INFO  Received GET /api/users",
].join("\n");

const LOGS_SPECIAL_CHARS = [
  'ERROR: Failed to parse JSON: {"key": "value with \\"quotes\\""}',
  "WARN: Path contains special chars: /tmp/file<name>&test",
  "INFO: Unicode test: \u2603 \u2764 \u2602",
  "DEBUG: Regex pattern: ^[a-z]+\\d{3}$",
].join("\n");

// ---------------------------------------------------------------------------
// Fixtures: docker images --format json
// ---------------------------------------------------------------------------

const IMAGES_MULTIPLE = [
  JSON.stringify({
    ID: "sha256:aabbccddee11aabbccddee11",
    Repository: "nginx",
    Tag: "1.25-alpine",
    Size: "43.2MB",
    CreatedSince: "2 weeks ago",
  }),
  JSON.stringify({
    ID: "sha256:112233445566112233445566",
    Repository: "node",
    Tag: "20-slim",
    Size: "238MB",
    CreatedSince: "3 days ago",
  }),
  JSON.stringify({
    ID: "sha256:ffeeddccbbaa99ffeeddccbbaa99",
    Repository: "postgres",
    Tag: "16.1",
    Size: "412MB",
    CreatedSince: "1 month ago",
  }),
].join("\n");

const IMAGES_NONE_TAG = JSON.stringify({
  ID: "sha256:deadbeef1234deadbeef1234",
  Repository: "<none>",
  Tag: "<none>",
  Size: "156MB",
  CreatedSince: "4 hours ago",
});

// ---------------------------------------------------------------------------
// Tests: parsePsJson
// ---------------------------------------------------------------------------

describe("fidelity: parsePsJson", () => {
  it("single running container: preserves id, name, image, status, state, ports, created", () => {
    const result = parsePsJson(PS_SINGLE_RUNNING);

    expect(result.total).toBe(1);
    expect(result.running).toBe(1);
    expect(result.stopped).toBe(0);

    const c = result.containers[0];
    expect(c.id).toBe("abc123def456");
    expect(c.name).toBe("my-app");
    expect(c.image).toBe("node:20");
    expect(c.status).toBe("Up 2 hours");
    expect(c.state).toBe("running");
    expect(c.created).toBe("2024-01-01 10:00:00");

    expect(c.ports).toHaveLength(1);
    expect(c.ports[0]).toEqual({ host: 3000, container: 3000, protocol: "tcp" });
  });

  it("multiple containers with mixed running/exited: counts are accurate", () => {
    const result = parsePsJson(PS_MULTIPLE_MIXED);

    expect(result.total).toBe(4);
    expect(result.running).toBe(2);
    expect(result.stopped).toBe(2);

    // Verify all container names are preserved
    const names = result.containers.map((c) => c.name);
    expect(names).toContain("web-server");
    expect(names).toContain("database");
    expect(names).toContain("cache");
    expect(names).toContain("worker");

    // Verify states are correct
    const states = result.containers.map((c) => c.state);
    expect(states.filter((s) => s === "running")).toHaveLength(2);
    expect(states.filter((s) => s === "exited")).toHaveLength(2);
  });

  it("container with multiple port mappings: all ports extracted correctly", () => {
    const result = parsePsJson(PS_MULTIPLE_PORTS);

    const c = result.containers[0];
    expect(c.ports).toHaveLength(3);

    expect(c.ports[0]).toEqual({ host: 80, container: 80, protocol: "tcp" });
    expect(c.ports[1]).toEqual({ host: 443, container: 443, protocol: "tcp" });
    expect(c.ports[2]).toEqual({ host: 8080, container: 8080, protocol: "tcp" });
  });

  it("container with no ports: ports array is empty", () => {
    const result = parsePsJson(PS_NO_PORTS);

    expect(result.containers[0].ports).toEqual([]);
    expect(result.containers[0].name).toBe("background-job");
    expect(result.containers[0].state).toBe("running");
  });

  it("empty output: returns zero containers and counts", () => {
    const result = parsePsJson("");

    expect(result.containers).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.running).toBe(0);
    expect(result.stopped).toBe(0);
  });

  it("container with mixed tcp/udp ports: protocol is preserved", () => {
    const stdout = JSON.stringify({
      ID: "udp123456789",
      Names: "dns-server",
      Image: "coredns:1.11",
      Status: "Up 6 hours",
      State: "running",
      Ports: "0.0.0.0:53->53/tcp, 0.0.0.0:53->53/udp",
      CreatedAt: "2024-01-01 06:00:00",
    });

    const result = parsePsJson(stdout);
    const ports = result.containers[0].ports;

    expect(ports).toHaveLength(2);
    expect(ports[0]).toEqual({ host: 53, container: 53, protocol: "tcp" });
    expect(ports[1]).toEqual({ host: 53, container: 53, protocol: "udp" });
  });

  it("port without host binding: host is absent, container port preserved", () => {
    const stdout = JSON.stringify({
      ID: "exposed123456",
      Names: "internal-svc",
      Image: "myapp:dev",
      Status: "Up 10 minutes",
      State: "running",
      Ports: "3000/tcp",
      CreatedAt: "2024-01-02 12:00:00",
    });

    const result = parsePsJson(stdout);
    const ports = result.containers[0].ports;

    expect(ports).toHaveLength(1);
    expect(ports[0].container).toBe(3000);
    expect(ports[0].protocol).toBe("tcp");
    expect(ports[0].host).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: parseBuildOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseBuildOutput", () => {
  it("successful build: extracts image ID (first 12 chars), success, duration, steps", () => {
    const result = parseBuildOutput(BUILD_SUCCESS_STDOUT, "", 0, 45.3);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("a1b2c3d4e5f6");
    expect(result.duration).toBe(45.3);
    expect(result.errors).toEqual([]);
    expect(result.steps).toBeGreaterThanOrEqual(1);
  });

  it("failed build with error lines: errors captured from stdout and stderr", () => {
    const result = parseBuildOutput(BUILD_FAILED_STDOUT, BUILD_FAILED_STDERR, 1, 12.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
    expect(result.duration).toBe(12.0);
    expect(result.errors.length).toBeGreaterThan(0);

    // Verify error content is preserved
    const allErrors = result.errors.join(" ");
    expect(allErrors).toContain("npm install");
  });

  it("build output with step numbers: steps count matches unique step numbers", () => {
    const result = parseBuildOutput(BUILD_SUCCESS_STDOUT, "", 0, 30.0);

    // BUILD_SUCCESS_STDOUT has steps #1 through #8
    expect(result.steps).toBe(8);
  });

  it("build with no image ID: imageId is undefined", () => {
    const result = parseBuildOutput(BUILD_NO_IMAGE_ID_STDOUT, "", 1, 5.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
    expect(result.duration).toBe(5.0);
  });

  it("legacy build with 'Successfully built' format: image ID captured", () => {
    const result = parseBuildOutput(BUILD_LEGACY_STDOUT, "", 0, 20.0);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("a1b2c3d4e5f6");
  });

  it("image ID from stderr (BuildKit): captured correctly", () => {
    const stderr =
      "writing image sha256:ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00 done";
    const result = parseBuildOutput("", stderr, 0, 10.0);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("ff00ff00ff00");
  });

  it("duration is preserved exactly", () => {
    const result = parseBuildOutput("", "", 0, 99.999);
    expect(result.duration).toBe(99.999);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseLogsOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseLogsOutput", () => {
  it("multi-line log output: all lines preserved with correct count", () => {
    const result = parseLogsOutput(LOGS_MULTILINE, "my-app");

    expect(result.container).toBe("my-app");
    expect(result.total).toBe(5);
    expect(result.lines).toHaveLength(5);

    // Verify first and last lines are preserved exactly
    expect(result.lines[0]).toBe("2024-01-01T10:00:00.000Z INFO  Starting application...");
    expect(result.lines[4]).toBe("2024-01-01T10:01:00.000Z INFO  Received GET /api/users");
  });

  it("empty logs: returns zero lines", () => {
    const result = parseLogsOutput("", "idle-container");

    expect(result.container).toBe("idle-container");
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("logs with special characters: content preserved exactly", () => {
    const result = parseLogsOutput(LOGS_SPECIAL_CHARS, "special-app");

    expect(result.container).toBe("special-app");
    expect(result.total).toBe(4);

    // Verify special characters are not lost or mangled
    expect(result.lines[0]).toContain('\\"quotes\\"');
    expect(result.lines[1]).toContain("<name>&test");
    expect(result.lines[2]).toContain("\u2603");
    expect(result.lines[3]).toContain("^[a-z]+\\d{3}$");
  });

  it("container name is preserved exactly", () => {
    const result = parseLogsOutput("line1\nline2", "my-complex_container.name-123");
    expect(result.container).toBe("my-complex_container.name-123");
  });
});

// ---------------------------------------------------------------------------
// Tests: parseImagesJson
// ---------------------------------------------------------------------------

describe("fidelity: parseImagesJson", () => {
  it("multiple images: all fields preserved for each image", () => {
    const result = parseImagesJson(IMAGES_MULTIPLE);

    expect(result.total).toBe(3);
    expect(result.images).toHaveLength(3);

    // Verify first image fields — ID is sliced to 12 chars from raw
    expect(result.images[0].id).toBe("sha256:aabbc");
    expect(result.images[0].repository).toBe("nginx");
    expect(result.images[0].tag).toBe("1.25-alpine");
    expect(result.images[0].size).toBe("43.2MB");
    expect(result.images[0].created).toBe("2 weeks ago");

    // Verify all repositories are present
    const repos = result.images.map((img) => img.repository);
    expect(repos).toContain("nginx");
    expect(repos).toContain("node");
    expect(repos).toContain("postgres");
  });

  it("image with <none> tag: tag and repository preserved as-is", () => {
    const result = parseImagesJson(IMAGES_NONE_TAG);

    expect(result.total).toBe(1);
    expect(result.images[0].repository).toBe("<none>");
    expect(result.images[0].tag).toBe("<none>");
    expect(result.images[0].size).toBe("156MB");
  });

  it("empty output: returns zero images", () => {
    const result = parseImagesJson("");

    expect(result.images).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("image ID is truncated to 12 characters", () => {
    const result = parseImagesJson(IMAGES_MULTIPLE);

    for (const img of result.images) {
      expect(img.id.length).toBe(12);
    }
  });

  it("CreatedAt fallback when CreatedSince is absent", () => {
    const stdout = JSON.stringify({
      ID: "sha256:fallback12345fallback12345",
      Repository: "custom-app",
      Tag: "v2.0",
      Size: "89MB",
      CreatedAt: "2024-06-15T14:30:00Z",
    });

    const result = parseImagesJson(stdout);

    expect(result.images[0].created).toBe("2024-06-15T14:30:00Z");
    expect(result.images[0].repository).toBe("custom-app");
    expect(result.images[0].tag).toBe("v2.0");
  });
});
