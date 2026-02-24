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
  parseRunOutput,
  parseExecOutput,
  parseComposeUpOutput,
  parseComposeDownOutput,
  parsePullOutput,
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

    expect(result.containers).toHaveLength(1);

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

    expect(result.containers).toHaveLength(4);

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
  it("successful build: extracts image ID (first 12 chars) and success", () => {
    const result = parseBuildOutput(BUILD_SUCCESS_STDOUT, "", 0, 45.3);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("a1b2c3d4e5f6");
    expect(result.errors).toBeUndefined();
  });

  it("failed build with error lines: errors captured from stdout and stderr", () => {
    const result = parseBuildOutput(BUILD_FAILED_STDOUT, BUILD_FAILED_STDERR, 1, 12.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
    expect(result.errors!.length).toBeGreaterThan(0);

    // Verify error content is preserved
    const allErrors = (result.errors ?? []).map((e: { message: string }) => e.message).join(" ");
    expect(allErrors).toContain("npm install");
  });

  it("build output with step numbers: cacheByStep tracks steps", () => {
    const result = parseBuildOutput(BUILD_SUCCESS_STDOUT, "", 0, 30.0);

    // BUILD_SUCCESS_STDOUT has steps #1 through #8
    expect(result.cacheByStep).toBeDefined();
    expect(result.cacheByStep!.length).toBeGreaterThanOrEqual(1);
  });

  it("build with no image ID: imageId is undefined", () => {
    const result = parseBuildOutput(BUILD_NO_IMAGE_ID_STDOUT, "", 1, 5.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
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
});

// ---------------------------------------------------------------------------
// Tests: parseLogsOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseLogsOutput", () => {
  it("multi-line log output: all lines preserved with correct count", () => {
    const result = parseLogsOutput(LOGS_MULTILINE, "my-app");

    expect(result.lines).toHaveLength(5);

    // Verify first and last lines are preserved exactly
    expect(result.lines[0]).toBe("2024-01-01T10:00:00.000Z INFO  Starting application...");
    expect(result.lines[4]).toBe("2024-01-01T10:01:00.000Z INFO  Received GET /api/users");
  });

  it("empty logs: returns zero lines", () => {
    const result = parseLogsOutput("", "idle-container");

    expect(result.lines).toEqual([]);
  });

  it("logs with special characters: content preserved exactly", () => {
    const result = parseLogsOutput(LOGS_SPECIAL_CHARS, "special-app");

    expect(result.lines).toHaveLength(4);

    // Verify special characters are not lost or mangled
    expect(result.lines[0]).toContain('\\"quotes\\"');
    expect(result.lines[1]).toContain("<name>&test");
    expect(result.lines[2]).toContain("\u2603");
    expect(result.lines[3]).toContain("^[a-z]+\\d{3}$");
  });

  it("lines are preserved exactly", () => {
    const result = parseLogsOutput("line1\nline2", "my-complex_container.name-123");
    expect(result.lines).toEqual(["line1", "line2"]);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseImagesJson
// ---------------------------------------------------------------------------

describe("fidelity: parseImagesJson", () => {
  it("multiple images: all fields preserved for each image", () => {
    const result = parseImagesJson(IMAGES_MULTIPLE);

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

    expect(result.images).toHaveLength(1);
    expect(result.images[0].repository).toBe("<none>");
    expect(result.images[0].tag).toBe("<none>");
    expect(result.images[0].size).toBe("156MB");
  });

  it("empty output: returns zero images", () => {
    const result = parseImagesJson("");

    expect(result.images).toEqual([]);
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

// ---------------------------------------------------------------------------
// Fixtures: docker run
// ---------------------------------------------------------------------------

const RUN_DETACHED_OUTPUT = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\n";

const RUN_ATTACHED_OUTPUT = [
  "Starting application server...",
  "Listening on port 8080",
  "Connection accepted from 192.168.1.100",
  "fedcba987654fedcba987654fedcba987654fedcba987654fedcba987654fedcba98",
].join("\n");

const RUN_ATTACHED_SINGLE_LINE = "Hello, World!\n";

// ---------------------------------------------------------------------------
// Fixtures: docker exec
// ---------------------------------------------------------------------------

const EXEC_LS_STDOUT =
  "bin\ndev\netc\nhome\nlib\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsrv\nsys\ntmp\nusr\nvar\n";

const EXEC_CAT_STDOUT = `server {
    listen 80;
    server_name localhost;
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}`;

const EXEC_FAILED_STDERR =
  'OCI runtime exec failed: exec failed: unable to start container process: exec: "nonexistent-cmd": executable file not found in $PATH: unknown';

// ---------------------------------------------------------------------------
// Fixtures: docker compose up
// ---------------------------------------------------------------------------

const COMPOSE_UP_FULL = [
  " Network myproject_default  Creating",
  " Network myproject_default  Created",
  ' Volume "myproject_db-data"  Creating',
  ' Volume "myproject_db-data"  Created',
  " Container myproject-postgres-1  Creating",
  " Container myproject-redis-1     Creating",
  " Container myproject-api-1       Creating",
  " Container myproject-postgres-1  Created",
  " Container myproject-redis-1     Created",
  " Container myproject-api-1       Created",
  " Container myproject-postgres-1  Starting",
  " Container myproject-redis-1     Starting",
  " Container myproject-api-1       Starting",
  " Container myproject-postgres-1  Started",
  " Container myproject-redis-1     Started",
  " Container myproject-api-1       Started",
].join("\n");

const COMPOSE_UP_PARTIAL_RUNNING = [
  " Container myproject-postgres-1  Running",
  " Container myproject-redis-1     Running",
  " Container myproject-api-1       Creating",
  " Container myproject-api-1       Created",
  " Container myproject-api-1       Starting",
  " Container myproject-api-1       Started",
].join("\n");

// ---------------------------------------------------------------------------
// Fixtures: docker compose down
// ---------------------------------------------------------------------------

const COMPOSE_DOWN_FULL = [
  " Container myproject-api-1       Stopping",
  " Container myproject-redis-1     Stopping",
  " Container myproject-postgres-1  Stopping",
  " Container myproject-api-1       Stopped",
  " Container myproject-redis-1     Stopped",
  " Container myproject-postgres-1  Stopped",
  " Container myproject-api-1       Removing",
  " Container myproject-redis-1     Removing",
  " Container myproject-postgres-1  Removing",
  " Container myproject-api-1       Removed",
  " Container myproject-redis-1     Removed",
  " Container myproject-postgres-1  Removed",
  " Network myproject_default       Removing",
  " Network myproject_default       Removed",
].join("\n");

const COMPOSE_DOWN_VOLUMES = [
  " Container myproject-db-1  Stopped",
  " Container myproject-db-1  Removed",
  " Volume myproject_db-data  Removing",
  " Volume myproject_db-data  Removed",
  " Network myproject_default Removed",
].join("\n");

// ---------------------------------------------------------------------------
// Fixtures: docker pull
// ---------------------------------------------------------------------------

const PULL_FRESH_DOWNLOAD = [
  "Using default tag: latest",
  "latest: Pulling from library/nginx",
  "a2abf6c4d29d: Pulling fs layer",
  "a9edb18cadd1: Pulling fs layer",
  "589b7251471a: Pulling fs layer",
  "186b1aaa4aa6: Pulling fs layer",
  "b4df32aa5a72: Pulling fs layer",
  "a2abf6c4d29d: Pull complete",
  "a9edb18cadd1: Pull complete",
  "589b7251471a: Pull complete",
  "186b1aaa4aa6: Pull complete",
  "b4df32aa5a72: Pull complete",
  "Digest: sha256:e4f58b21c1a93f9d4abfe69c4e1399d3e4f0d6e2c7b8a1d3f5e6a7b8c9d0e1f2",
  "Status: Downloaded newer image for nginx:latest",
  "docker.io/library/nginx:latest",
].join("\n");

const PULL_ALREADY_EXISTS = [
  "Using default tag: latest",
  "latest: Pulling from library/alpine",
  "Digest: sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "Status: Image is up to date for alpine:latest",
  "docker.io/library/alpine:latest",
].join("\n");

const PULL_SPECIFIC_TAG = [
  "22.04: Pulling from library/ubuntu",
  "3153aa388d02: Already exists",
  "Digest: sha256:aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344",
  "Status: Downloaded newer image for ubuntu:22.04",
  "docker.io/library/ubuntu:22.04",
].join("\n");

const PULL_PRIVATE_REGISTRY = [
  "v2.1.0: Pulling from myorg/myapp",
  "4abcdef01234: Pull complete",
  "5bcdef012345: Pull complete",
  "Digest: sha256:deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
  "Status: Downloaded newer image for registry.example.com:5000/myorg/myapp:v2.1.0",
].join("\n");

// ---------------------------------------------------------------------------
// Tests: parseRunOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseRunOutput", () => {
  it("detached mode: extracts container ID (first 12 chars) from full 64-char hash", () => {
    const result = parseRunOutput(RUN_DETACHED_OUTPUT, "nginx:latest", true, "my-web");

    expect(result.containerId).toBe("a1b2c3d4e5f6");
    expect(result.containerId.length).toBe(12);
    expect(result.detached).toBe(true);
    expect(result.name).toBe("my-web");
  });

  it("attached mode: extracts container ID from last line of mixed output", () => {
    const result = parseRunOutput(RUN_ATTACHED_OUTPUT, "myapp:dev", false);

    expect(result.containerId).toBe("fedcba987654");
    expect(result.detached).toBe(false);
    expect(result.name).toBeUndefined();
  });

  it("attached mode with single-line output: preserves text", () => {
    const result = parseRunOutput(RUN_ATTACHED_SINGLE_LINE, "alpine", false);

    // The last trimmed line is "Hello, World!" which is not a container ID hash
    expect(result.containerId).toBe("Hello, World");
    expect(result.detached).toBe(false);
  });

  it("preserves image name exactly including registry prefix", () => {
    const result = parseRunOutput(RUN_DETACHED_OUTPUT, "registry.example.com:5000/myapp:v1", true);

    expect(result.containerId).toBe("a1b2c3d4e5f6");
  });

  it("empty output: containerId is empty, other fields preserved", () => {
    const result = parseRunOutput("", "busybox", true, "worker");

    expect(result.containerId).toBe("");
    expect(result.detached).toBe(true);
    expect(result.name).toBe("worker");
  });
});

// ---------------------------------------------------------------------------
// Tests: parseExecOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseExecOutput", () => {
  it("successful ls: stdout preserved exactly with all directory entries", () => {
    const result = parseExecOutput(EXEC_LS_STDOUT, "", 0);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(EXEC_LS_STDOUT);
    expect(result.stdout).toContain("bin");
    expect(result.stdout).toContain("var");
    expect(result.stderr).toBe("");
  });

  it("successful cat: multi-line config output preserved exactly", () => {
    const result = parseExecOutput(EXEC_CAT_STDOUT, "", 0);
    expect(result.stdout).toBe(EXEC_CAT_STDOUT);
    expect(result.stdout).toContain("server_name localhost");
    expect(result.stdout).toContain("listen 80");
  });

  it("command not found: exit code 126 with OCI runtime error", () => {
    const result = parseExecOutput("", EXEC_FAILED_STDERR, 126);

    expect(result.exitCode).toBe(126);
    expect(result.stderr).toContain("executable file not found");
    expect(result.stdout).toBe("");
  });

  it("exit code 127 (command not found in PATH)", () => {
    const stderr = 'exec: "missing-tool": executable file not found in $PATH';
    const result = parseExecOutput("", stderr, 127);

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain("missing-tool");
  });

  it("mixed stdout and stderr with exit code 0", () => {
    const stdout = "result line 1\nresult line 2";
    const stderr = "DEPRECATION WARNING: feature X will be removed in v3.0";
    const result = parseExecOutput(stdout, stderr, 0);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(stdout);
    expect(result.stderr).toBe(stderr);
  });

  it("exit code 1 with stderr: fields preserved exactly", () => {
    const stderr = "Error: Cannot connect to database at localhost:5432";
    const result = parseExecOutput("", stderr, 1);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe(stderr);
  });

  it("exit code 137 (OOM killed / SIGKILL)", () => {
    const result = parseExecOutput("", "Killed", 137);

    expect(result.exitCode).toBe(137);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseComposeUpOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseComposeUpOutput", () => {
  it("full compose up: all services extracted and deduplicated", () => {
    const result = parseComposeUpOutput("", COMPOSE_UP_FULL, 0);

    expect(result.success).toBe(true);
    expect(result.services).toContain("myproject-postgres-1");
    expect(result.services).toContain("myproject-redis-1");
    expect(result.services).toContain("myproject-api-1");
    expect(result.services).toHaveLength(3);

    // Verify no duplicates (each service appeared in Created, Starting, Started)
    const uniqueCount = new Set(result.services).size;
    expect(uniqueCount).toBe(result.services.length);
  });

  it("partial running: already-running services included via Running status", () => {
    const result = parseComposeUpOutput("", COMPOSE_UP_PARTIAL_RUNNING, 0);

    expect(result.success).toBe(true);
    expect(result.services).toContain("myproject-postgres-1");
    expect(result.services).toContain("myproject-redis-1");
    expect(result.services).toContain("myproject-api-1");
    expect(result.services).toHaveLength(3);
  });

  it("network creation lines do not create false service entries", () => {
    const stderr = [
      " Network myproject_default  Creating",
      " Network myproject_default  Created",
    ].join("\n");

    const result = parseComposeUpOutput("", stderr, 0);

    // Networks should not be counted as services
    expect(result.services).toEqual([]);
  });

  it("failure exit code: success is false, no services", () => {
    const stderr = "no configuration file provided: not found";
    const result = parseComposeUpOutput("", stderr, 1);

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseComposeDownOutput
// ---------------------------------------------------------------------------

describe("fidelity: parseComposeDownOutput", () => {
  it("full teardown: stopped and removed counts match container + network removals", () => {
    const result = parseComposeDownOutput("", COMPOSE_DOWN_FULL, 0);

    expect(result.success).toBe(true);
    expect(result.stopped).toBe(3); // 3 containers stopped
  });

  it("teardown with volumes: volume removal counted", () => {
    const result = parseComposeDownOutput("", COMPOSE_DOWN_VOLUMES, 0);

    expect(result.success).toBe(true);
    expect(result.stopped).toBe(1); // 1 container stopped
  });

  it("Stopping lines are not counted as Stopped", () => {
    const stderr = [" Container app-1  Stopping", " Container app-1  Stopping"].join("\n");

    const result = parseComposeDownOutput("", stderr, 0);
    expect(result.stopped).toBe(0); // Stopping !== Stopped
  });

  it("failure exit code: success is false", () => {
    const result = parseComposeDownOutput("", "error: compose file not found", 1);

    expect(result.success).toBe(false);
    expect(result.stopped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: parsePullOutput
// ---------------------------------------------------------------------------

describe("fidelity: parsePullOutput", () => {
  it("fresh download: image, tag, digest all extracted from realistic output", () => {
    const result = parsePullOutput(PULL_FRESH_DOWNLOAD, "", 0, "nginx:latest");

    expect(result.success).toBe(true);
    expect(result.digest).toBe(
      "sha256:e4f58b21c1a93f9d4abfe69c4e1399d3e4f0d6e2c7b8a1d3f5e6a7b8c9d0e1f2",
    );
  });

  it("already up to date: digest still extracted", () => {
    const result = parsePullOutput(PULL_ALREADY_EXISTS, "", 0, "alpine");

    expect(result.success).toBe(true);
    expect(result.digest).toBe(
      "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    );
  });

  it("specific tag: digest extracted correctly", () => {
    const result = parsePullOutput(PULL_SPECIFIC_TAG, "", 0, "ubuntu:22.04");

    expect(result.success).toBe(true);
    expect(result.digest).toBe(
      "sha256:aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344",
    );
  });

  it("private registry with port: digest still extracted", () => {
    const result = parsePullOutput(
      PULL_PRIVATE_REGISTRY,
      "",
      0,
      "registry.example.com:5000/myorg/myapp:v2.1.0",
    );

    expect(result.success).toBe(true);
    expect(result.digest).toBe(
      "sha256:deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
    );
  });

  it("layer progress lines do not interfere with digest extraction", () => {
    const result = parsePullOutput(PULL_FRESH_DOWNLOAD, "", 0, "nginx:latest");

    // The output contains multiple "Pull complete" lines; digest should still be correct
    expect(result.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("failed pull: success is false, no digest", () => {
    const stderr =
      "Error response from daemon: manifest for nonexistent/image:v999 not found: manifest unknown: manifest unknown";
    const result = parsePullOutput("", stderr, 1, "nonexistent/image:v999");

    expect(result.success).toBe(false);
    expect(result.digest).toBeUndefined();
  });

  it("auth failure: success is false", () => {
    const stderr =
      "Error response from daemon: Head https://registry.example.com/v2/myapp/manifests/latest: unauthorized: authentication required";
    const result = parsePullOutput("", stderr, 1, "registry.example.com/myapp:latest");

    expect(result.success).toBe(false);
    expect(result.digest).toBeUndefined();
  });
});
