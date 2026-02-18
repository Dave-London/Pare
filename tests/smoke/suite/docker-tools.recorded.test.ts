/**
 * Smoke tests: docker tools — Phase 3 (recorded)
 *
 * Feeds realistic Docker CLI output fixtures through the tool handlers.
 * Validates that parsers, formatters, and schema chain work with genuine
 * CLI output shapes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  DockerPsSchema,
  DockerImagesSchema,
  DockerLogsSchema,
  DockerBuildSchema,
  DockerPullSchema,
  DockerStatsSchema,
  DockerNetworkLsSchema,
  DockerVolumeLsSchema,
} from "../../../packages/server-docker/src/schemas/index.js";

// Mock the docker runner module used by all docker tools
vi.mock("../../../packages/server-docker/src/lib/docker-runner.js", () => ({
  docker: vi.fn(),
}));

import { docker } from "../../../packages/server-docker/src/lib/docker-runner.js";
import { registerPsTool } from "../../../packages/server-docker/src/tools/ps.js";
import { registerImagesTool } from "../../../packages/server-docker/src/tools/images.js";
import { registerLogsTool } from "../../../packages/server-docker/src/tools/logs.js";
import { registerBuildTool } from "../../../packages/server-docker/src/tools/build.js";
import { registerPullTool } from "../../../packages/server-docker/src/tools/pull.js";
import { registerStatsTool } from "../../../packages/server-docker/src/tools/stats.js";
import { registerNetworkLsTool } from "../../../packages/server-docker/src/tools/network-ls.js";
import { registerVolumeLsTool } from "../../../packages/server-docker/src/tools/volume-ls.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const FIXTURE_DIR = resolve(__dirname, "../fixtures/docker");

function loadFixture(subpath: string): string {
  return readFileSync(resolve(FIXTURE_DIR, subpath), "utf-8");
}

function mockDocker(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(docker).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// ps tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.ps", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerPsTool(server as never);
    handler = server.tools.get("ps")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerPsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] lists running and stopped containers", async () => {
    mockDocker(loadFixture("ps/s01-containers.txt"));
    const { parsed } = await callAndValidate({ all: true, compact: false });
    expect(parsed.total).toBe(2);
    expect(parsed.running).toBe(1);
    expect(parsed.stopped).toBe(1);
    expect(parsed.containers[0].name).toBe("my-nginx");
    expect(parsed.containers[0].state).toBe("running");
    expect(parsed.containers[0].image).toBe("nginx:latest");
    expect(parsed.containers[0].ports).toEqual([{ host: 8080, container: 80, protocol: "tcp" }]);
    expect(parsed.containers[0].labels).toEqual({ maintainer: "NGINX" });
    expect(parsed.containers[0].networks).toEqual(["bridge"]);
    expect(parsed.containers[1].name).toBe("my-postgres");
    expect(parsed.containers[1].state).toBe("exited");
  });

  it("S02 [recorded] empty — no containers", async () => {
    mockDocker(loadFixture("ps/s02-empty.txt"));
    const { parsed } = await callAndValidate({ all: true, compact: false });
    expect(parsed.total).toBe(0);
    expect(parsed.running).toBe(0);
    expect(parsed.stopped).toBe(0);
    expect(parsed.containers).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// images tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.images", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerImagesTool(server as never);
    handler = server.tools.get("images")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerImagesSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] lists images with repo, tag, and size", async () => {
    mockDocker(loadFixture("images/s01-list.txt"));
    const { parsed } = await callAndValidate({ all: false, compact: false });
    expect(parsed.total).toBe(2);
    expect(parsed.images[0].repository).toBe("nginx");
    expect(parsed.images[0].tag).toBe("latest");
    expect(parsed.images[0].size).toBe("187MB");
    expect(parsed.images[0].created).toBe("8 days ago");
    expect(parsed.images[0].createdAt).toBe("2026-02-10T10:00:00Z");
    expect(parsed.images[1].repository).toBe("postgres");
    expect(parsed.images[1].tag).toBe("15");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// logs tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.logs", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerLogsTool(server as never);
    handler = server.tools.get("logs")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerLogsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] parses container logs with timestamps", async () => {
    mockDocker(loadFixture("logs/s01-container-logs.txt"));
    const { parsed } = await callAndValidate({
      container: "my-nginx",
      tail: 100,
      timestamps: false,
      details: false,
      compact: false,
    });
    expect(parsed.container).toBe("my-nginx");
    expect(parsed.total).toBe(3);
    expect(parsed.entries).toBeDefined();
    expect(parsed.entries!.length).toBe(3);
    expect(parsed.entries![0].timestamp).toBe("2026-02-18T10:00:00.000000000Z");
    expect(parsed.entries![0].message).toBe("Starting nginx...");
    expect(parsed.entries![1].message).toContain("ready for connections");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// build tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerBuildTool(server as never);
    handler = server.tools.get("build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerBuildSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] successful build with image ID and cache info", async () => {
    mockDocker(loadFixture("build/s01-success.txt"));
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      tag: "myapp:latest",
      noCache: false,
      pull: false,
      buildArgs: [],
      label: [],
      cacheFrom: [],
      cacheTo: [],
      secret: [],
      ssh: [],
      args: [],
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.imageId).toBe("a1b2c3d4e5f6");
    expect(parsed.steps).toBeGreaterThanOrEqual(1);
    expect(parsed.cacheHits).toBeGreaterThanOrEqual(1);
    expect(parsed.cacheByStep).toBeDefined();
    const cachedStep = parsed.cacheByStep!.find((s) => s.step === "1/3");
    expect(cachedStep?.cached).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pull tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.pull", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerPullTool(server as never);
    handler = server.tools.get("pull")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerPullSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] successfully pulled image with digest", async () => {
    mockDocker(loadFixture("pull/s01-pulled.txt"));
    const { parsed } = await callAndValidate({
      image: "alpine:latest",
      allTags: false,
      quiet: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe("pulled");
    expect(parsed.image).toBe("alpine");
    expect(parsed.tag).toBe("latest");
    expect(parsed.digest).toBe("sha256:abcdef1234567890");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// stats tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.stats", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerStatsTool(server as never);
    handler = server.tools.get("stats")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerStatsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] running container stats with CPU, memory, I/O", async () => {
    mockDocker(loadFixture("stats/s01-running.txt"));
    const { parsed } = await callAndValidate({
      all: false,
      noTrunc: false,
      compact: false,
    });
    expect(parsed.total).toBe(1);
    expect(parsed.containers[0].name).toBe("my-nginx");
    expect(parsed.containers[0].cpuPercent).toBe(0.5);
    expect(parsed.containers[0].memoryPercent).toBe(0.32);
    expect(parsed.containers[0].pids).toBe(3);
    expect(parsed.containers[0].memoryUsage).toBe("25.5MiB");
    expect(parsed.containers[0].memoryLimit).toBe("7.77GiB");
    expect(parsed.containers[0].memoryUsageBytes).toBeGreaterThan(0);
    expect(parsed.containers[0].memoryLimitBytes).toBeGreaterThan(0);
    expect(parsed.containers[0].netIn).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// network-ls tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.network-ls", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerNetworkLsTool(server as never);
    handler = server.tools.get("network-ls")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerNetworkLsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] lists networks with driver and scope", async () => {
    mockDocker(loadFixture("network-ls/s01-networks.txt"));
    const { parsed } = await callAndValidate({
      noTrunc: false,
      compact: false,
    });
    expect(parsed.total).toBe(3);
    expect(parsed.networks[0].name).toBe("bridge");
    expect(parsed.networks[0].driver).toBe("bridge");
    expect(parsed.networks[0].scope).toBe("local");
    expect(parsed.networks[0].ipv6).toBe(false);
    expect(parsed.networks[0].internal).toBe(false);
    expect(parsed.networks[1].name).toBe("host");
    expect(parsed.networks[1].driver).toBe("host");
    expect(parsed.networks[2].name).toBe("none");
    expect(parsed.networks[2].driver).toBe("null");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// volume-ls tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: docker.volume-ls", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(docker).mockReset();
    const server = new FakeServer();
    registerVolumeLsTool(server as never);
    handler = server.tools.get("volume-ls")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerVolumeLsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S01 [recorded] lists volumes with driver and labels", async () => {
    mockDocker(loadFixture("volume-ls/s01-volumes.txt"));
    const { parsed } = await callAndValidate({
      cluster: false,
      compact: false,
    });
    expect(parsed.total).toBe(2);
    expect(parsed.volumes[0].name).toBe("my-data");
    expect(parsed.volumes[0].driver).toBe("local");
    expect(parsed.volumes[0].mountpoint).toBe("/var/lib/docker/volumes/my-data/_data");
    expect(parsed.volumes[0].createdAt).toBe("2026-02-10T10:00:00Z");
    expect(parsed.volumes[1].name).toBe("pg-data");
    expect(parsed.volumes[1].labels).toEqual({ "com.docker.compose.project": "myapp" });
  });
});
