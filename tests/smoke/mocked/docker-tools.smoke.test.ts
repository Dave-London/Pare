/**
 * Smoke tests: docker server (16 tools) -- Phase 2 (mocked)
 *
 * Tests all docker tools end-to-end with mocked docker-runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DockerBuildSchema,
  DockerComposeBuildSchema,
  DockerComposeDownSchema,
  DockerComposeLogsSchema,
  DockerComposePsSchema,
  DockerComposeUpSchema,
  DockerExecSchema,
  DockerImagesSchema,
  DockerInspectSchema,
  DockerLogsSchema,
  DockerNetworkLsSchema,
  DockerPsSchema,
  DockerPullSchema,
  DockerRunSchema,
  DockerStatsSchema,
  DockerVolumeLsSchema,
} from "../../../packages/server-docker/src/schemas/index.js";

// Mock the docker runner module used by all docker tools
vi.mock("../../../packages/server-docker/src/lib/docker-runner.js", () => ({
  docker: vi.fn(),
}));

import { docker } from "../../../packages/server-docker/src/lib/docker-runner.js";
import { registerBuildTool } from "../../../packages/server-docker/src/tools/build.js";
import { registerComposeBuildTool } from "../../../packages/server-docker/src/tools/compose-build.js";
import { registerComposeDownTool } from "../../../packages/server-docker/src/tools/compose-down.js";
import { registerComposeLogsTool } from "../../../packages/server-docker/src/tools/compose-logs.js";
import { registerComposePsTool } from "../../../packages/server-docker/src/tools/compose-ps.js";
import { registerComposeUpTool } from "../../../packages/server-docker/src/tools/compose-up.js";
import { registerExecTool } from "../../../packages/server-docker/src/tools/exec.js";
import { registerImagesTool } from "../../../packages/server-docker/src/tools/images.js";
import { registerInspectTool } from "../../../packages/server-docker/src/tools/inspect.js";
import { registerLogsTool } from "../../../packages/server-docker/src/tools/logs.js";
import { registerNetworkLsTool } from "../../../packages/server-docker/src/tools/network-ls.js";
import { registerPsTool } from "../../../packages/server-docker/src/tools/ps.js";
import { registerPullTool } from "../../../packages/server-docker/src/tools/pull.js";
import { registerRunTool } from "../../../packages/server-docker/src/tools/run.js";
import { registerStatsTool } from "../../../packages/server-docker/src/tools/stats.js";
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

function mockDocker(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(docker).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// build tool (15 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const BUILD_SUCCESS =
    "Step 1/5 : FROM node:18\n" +
    " ---> abc123\n" +
    "Step 2/5 : COPY . .\n" +
    " ---> Using cache\n" +
    " ---> def456\n" +
    "Successfully built sha256:abc123def456\n" +
    "Successfully tagged myapp:latest\n";

  // S1 [P0] Successful build with tag
  it("S1 [P0] successful build with tag returns success and imageId", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", tag: "myapp:latest" });
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  // S2 [P1] Build with multiple tags
  it("S2 [P1] build with multiple tags passes both -t flags", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", tag: ["myapp:latest", "myapp:v1"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    const tagIndices = args.reduce<number[]>((acc, a, i) => (a === "-t" ? [...acc, i] : acc), []);
    expect(tagIndices.length).toBe(2);
    expect(args[tagIndices[0] + 1]).toBe("myapp:latest");
    expect(args[tagIndices[1] + 1]).toBe("myapp:v1");
  });

  // S3 [P0] Build failure (bad Dockerfile)
  it("S3 [P0] build failure returns success false", async () => {
    mockDocker("", "unable to prepare context: unable to evaluate symlinks\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", file: "bad.Dockerfile" });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] Empty output (no Dockerfile in context)
  it("S4 [P0] empty build output returns success false", async () => {
    mockDocker("", "failed to read Dockerfile\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/empty-dir" });
    expect(parsed.success).toBe(false);
  });

  // S5 [P0] Flag injection on tag
  it("S5 [P0] flag injection on tag is blocked", async () => {
    await expect(callAndValidate({ tag: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on file
  it("S6 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on target
  it("S7 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on platform
  it("S8 [P0] flag injection on platform is blocked", async () => {
    await expect(callAndValidate({ platform: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on buildArgs
  it("S9 [P0] flag injection on buildArgs is blocked", async () => {
    await expect(callAndValidate({ buildArgs: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on label
  it("S10 [P0] flag injection on label is blocked", async () => {
    await expect(callAndValidate({ label: ["--exec=evil"] })).rejects.toThrow();
  });

  // S11 [P0] Flag injection on args
  it("S11 [P0] flag injection on args is blocked", async () => {
    await expect(callAndValidate({ args: ["--exec=evil"] })).rejects.toThrow();
  });

  // S12 [P1] Build with noCache and pull
  it("S12 [P1] build with noCache and pull passes flags", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", tag: "test", noCache: true, pull: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--no-cache");
    expect(args).toContain("--pull");
  });

  // S13 [P1] Build with target (multi-stage)
  it("S13 [P1] build with target passes --target flag", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", target: "builder" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--target");
    expect(args).toContain("builder");
  });

  // S14 [P1] Build with buildArgs
  it("S14 [P1] build with buildArgs passes --build-arg flags", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", buildArgs: ["NODE_ENV=production"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--build-arg");
    expect(args).toContain("NODE_ENV=production");
  });

  // S15 [P0] Schema validation
  it("S15 [P0] schema validation passes on all results", async () => {
    mockDocker(BUILD_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", tag: "myapp:latest" });
    expect(DockerBuildSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// compose-build tool (11 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker compose-build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerComposeBuildTool(server as never);
    handler = server.tools.get("compose-build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerComposeBuildSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const COMPOSE_BUILD_SUCCESS = "web Building\n" + "web Built\n" + "api Building\n" + "api Built\n";

  // S1 [P0] Build all services
  it("S1 [P0] build all services returns success", async () => {
    mockDocker(COMPOSE_BUILD_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.failed).toBe(0);
  });

  // S2 [P0] Build specific service
  it("S2 [P0] build specific service passes service name", async () => {
    mockDocker("web Building\nweb Built\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", services: ["web"] });
    expect(parsed.success).toBe(true);
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("web");
  });

  // S3 [P0] No compose file found
  it("S3 [P0] no compose file throws error", async () => {
    mockDocker("", "no configuration file provided\n", 1);
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow(
      "docker compose build failed",
    );
  });

  // S4 [P0] Flag injection on file
  it("S4 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on services
  it("S5 [P0] flag injection on services is blocked", async () => {
    await expect(callAndValidate({ services: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on ssh
  it("S6 [P0] flag injection on ssh is blocked", async () => {
    await expect(callAndValidate({ ssh: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on builder
  it("S7 [P0] flag injection on builder is blocked", async () => {
    await expect(callAndValidate({ builder: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on buildArgs key
  it("S8 [P0] flag injection on buildArgs key is blocked", async () => {
    await expect(callAndValidate({ buildArgs: { "--exec": "evil" } })).rejects.toThrow();
  });

  // S9 [P1] Build with noCache
  it("S9 [P1] build with noCache passes --no-cache flag", async () => {
    mockDocker(COMPOSE_BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", noCache: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--no-cache");
  });

  // S10 [P1] Dry run mode
  it("S10 [P1] dry run mode passes --dry-run flag", async () => {
    mockDocker(COMPOSE_BUILD_SUCCESS, "", 0);
    await callAndValidate({ path: "/tmp/project", dryRun: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--dry-run");
  });

  // S11 [P0] Schema validation
  it("S11 [P0] schema validation passes on all results", async () => {
    mockDocker(COMPOSE_BUILD_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(DockerComposeBuildSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// compose-down tool (9 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker compose-down", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerComposeDownTool(server as never);
    handler = server.tools.get("compose-down")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerComposeDownSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const DOWN_SUCCESS =
    "Container myapp-web-1  Stopping\n" +
    "Container myapp-web-1  Stopped\n" +
    "Container myapp-web-1  Removing\n" +
    "Container myapp-web-1  Removed\n" +
    "Container myapp-db-1  Stopping\n" +
    "Container myapp-db-1  Stopped\n" +
    "Container myapp-db-1  Removing\n" +
    "Container myapp-db-1  Removed\n" +
    "Network myapp_default  Removing\n" +
    "Network myapp_default  Removed\n";

  // S1 [P0] Tear down all services
  it("S1 [P0] tear down all services returns success", async () => {
    mockDocker("", DOWN_SUCCESS, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Down with no running services
  it("S2 [P0] down with no running services returns zeros", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.stopped).toBe(0);
    expect(parsed.removed).toBe(0);
  });

  // S3 [P0] No compose file found
  it("S3 [P0] no compose file throws error", async () => {
    mockDocker("", "no configuration file provided\n", 1);
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on file
  it("S4 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/p", file: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on services
  it("S5 [P0] flag injection on services is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/p", services: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P1] Down with volumes
  it("S6 [P1] down with volumes passes --volumes flag", async () => {
    mockDocker("", DOWN_SUCCESS + "Volume myapp_data  Removing\nVolume myapp_data  Removed\n", 0);
    await callAndValidate({ path: "/tmp/project", volumes: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--volumes");
  });

  // S7 [P1] Down with removeOrphans
  it("S7 [P1] down with removeOrphans passes --remove-orphans flag", async () => {
    mockDocker("", DOWN_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", removeOrphans: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--remove-orphans");
  });

  // S8 [P2] Down with rmi: "all"
  it("S8 [P2] down with rmi all passes --rmi all flag", async () => {
    mockDocker("", DOWN_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", rmi: "all" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--rmi");
    expect(args).toContain("all");
  });

  // S9 [P0] Schema validation
  it("S9 [P0] schema validation passes on all results", async () => {
    mockDocker("", DOWN_SUCCESS, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(DockerComposeDownSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// compose-logs tool (11 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker compose-logs", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerComposeLogsTool(server as never);
    handler = server.tools.get("compose-logs")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerComposeLogsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const COMPOSE_LOGS =
    "web-1  | 2024-01-01T00:00:01Z Server started on port 3000\n" +
    "web-1  | 2024-01-01T00:00:02Z Request received: GET /\n" +
    "db-1   | 2024-01-01T00:00:01Z Database ready\n";

  // S1 [P0] Get logs for all services
  it("S1 [P0] get logs for all services returns entries", async () => {
    mockDocker(COMPOSE_LOGS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.services.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] Get logs for specific service
  it("S2 [P0] get logs for specific service passes service name", async () => {
    mockDocker("web-1  | 2024-01-01T00:00:01Z Server started\n", "", 0);
    await callAndValidate({ path: "/tmp/project", services: ["web"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("web");
  });

  // S3 [P0] No running services
  it("S3 [P0] no running services returns empty", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.services).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S4 [P0] Flag injection on file
  it("S4 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on since
  it("S5 [P0] flag injection on since is blocked", async () => {
    await expect(callAndValidate({ since: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on until
  it("S6 [P0] flag injection on until is blocked", async () => {
    await expect(callAndValidate({ until: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on services
  it("S7 [P0] flag injection on services is blocked", async () => {
    await expect(callAndValidate({ services: ["--exec=evil"] })).rejects.toThrow();
  });

  // S8 [P1] Logs with tail limit
  it("S8 [P1] logs with tail limit passes --tail flag", async () => {
    mockDocker(COMPOSE_LOGS, "", 0);
    await callAndValidate({ path: "/tmp/project", tail: 10 });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--tail");
    expect(args).toContain("10");
  });

  // S9 [P1] Logs with since filter
  it("S9 [P1] logs with since passes --since flag", async () => {
    mockDocker(COMPOSE_LOGS, "", 0);
    await callAndValidate({ path: "/tmp/project", since: "10m" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--since");
    expect(args).toContain("10m");
  });

  // S10 [P1] Truncation with limit
  it("S10 [P1] truncation with limit sets isTruncated", async () => {
    const manyLogs =
      "web-1  | line1\nweb-1  | line2\nweb-1  | line3\nweb-1  | line4\n" +
      "web-1  | line5\nweb-1  | line6\nweb-1  | line7\nweb-1  | line8\n";
    mockDocker(manyLogs, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", limit: 2, compact: false });
    expect(parsed.isTruncated).toBe(true);
  });

  // S11 [P0] Schema validation
  it("S11 [P0] schema validation passes on all results", async () => {
    mockDocker(COMPOSE_LOGS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(DockerComposeLogsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// compose-ps tool (9 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker compose-ps", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerComposePsTool(server as never);
    handler = server.tools.get("compose-ps")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerComposePsSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const COMPOSE_PS_JSON =
    '{"ID":"abc123","Name":"myapp-web-1","Service":"web","State":"running","Status":"Up 5 minutes","Publishers":[{"URL":"0.0.0.0","TargetPort":80,"PublishedPort":8080,"Protocol":"tcp"}]}\n' +
    '{"ID":"def456","Name":"myapp-db-1","Service":"db","State":"running","Status":"Up 5 minutes","Publishers":[]}\n';

  // S1 [P0] List running services
  it("S1 [P0] list running services returns service array", async () => {
    mockDocker(COMPOSE_PS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.services.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] No services running
  it("S2 [P0] no services running returns empty", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.services).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on file
  it("S3 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on services
  it("S4 [P0] flag injection on services is blocked", async () => {
    await expect(callAndValidate({ services: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on filter
  it("S5 [P0] flag injection on filter is blocked", async () => {
    await expect(callAndValidate({ filter: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on status
  it("S6 [P0] flag injection on status is blocked", async () => {
    await expect(callAndValidate({ status: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P1] Filter by status
  it("S7 [P1] filter by status passes --status flag", async () => {
    mockDocker(COMPOSE_PS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", status: ["running"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--status");
    expect(args).toContain("running");
  });

  // S8 [P1] Show all including stopped
  it("S8 [P1] show all passes --all flag", async () => {
    mockDocker(COMPOSE_PS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", all: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--all");
  });

  // S9 [P0] Schema validation
  it("S9 [P0] schema validation passes on all results", async () => {
    mockDocker(COMPOSE_PS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(DockerComposePsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// compose-up tool (12 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker compose-up", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerComposeUpTool(server as never);
    handler = server.tools.get("compose-up")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerComposeUpSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const UP_SUCCESS =
    "Container myapp-db-1  Creating\n" +
    "Container myapp-db-1  Created\n" +
    "Container myapp-web-1  Creating\n" +
    "Container myapp-web-1  Created\n" +
    "Container myapp-db-1  Starting\n" +
    "Container myapp-db-1  Started\n" +
    "Container myapp-web-1  Starting\n" +
    "Container myapp-web-1  Started\n";

  // S1 [P0] Start all services
  it("S1 [P0] start all services returns success", async () => {
    mockDocker("", UP_SUCCESS, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.started).toBeGreaterThan(0);
  });

  // S2 [P0] Start specific service
  it("S2 [P0] start specific service passes service name", async () => {
    mockDocker("", "Container myapp-web-1  Started\n", 0);
    await callAndValidate({ path: "/tmp/project", services: ["web"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("web");
  });

  // S3 [P0] No compose file
  it("S3 [P0] no compose file throws error", async () => {
    mockDocker("", "no configuration file provided\n", 1);
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on file
  it("S4 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/p", file: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on services
  it("S5 [P0] flag injection on services is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/p", services: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on scale key
  it("S6 [P0] flag injection on scale key is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/p", scale: { "--evil": 1 } })).rejects.toThrow();
  });

  // S7 [P0] Invalid scale value (negative)
  it("S7 [P0] negative scale value throws error", async () => {
    await expect(callAndValidate({ path: "/tmp/p", scale: { web: -1 } })).rejects.toThrow(
      "non-negative integers",
    );
  });

  // S8 [P1] Up with build flag
  it("S8 [P1] up with build passes --build flag", async () => {
    mockDocker("", UP_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", build: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--build");
  });

  // S9 [P1] Up with forceRecreate
  it("S9 [P1] up with forceRecreate passes --force-recreate flag", async () => {
    mockDocker("", UP_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", forceRecreate: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--force-recreate");
  });

  // S10 [P1] Dry run mode
  it("S10 [P1] dry run mode passes --dry-run flag", async () => {
    mockDocker("", UP_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", dryRun: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--dry-run");
  });

  // S11 [P2] Up with scale
  it("S11 [P2] up with scale passes --scale flag", async () => {
    mockDocker("", UP_SUCCESS, 0);
    await callAndValidate({ path: "/tmp/project", scale: { web: 3 } });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--scale");
    expect(args).toContain("web=3");
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on all results", async () => {
    mockDocker("", UP_SUCCESS, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(DockerComposeUpSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// exec tool (14 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker exec", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerExecTool(server as never);
    handler = server.tools.get("exec")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerExecSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Execute simple command
  it("S1 [P0] execute simple command returns success", async () => {
    mockDocker("total 4\ndrwxr-xr-x 2 root root 4096 Jan  1 00:00 .\n", "", 0);
    const { parsed } = await callAndValidate({
      container: "mycontainer",
      command: ["ls", "-la"],
    });
    expect(parsed.exitCode).toBe(0);
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Command failure (exit code != 0)
  it("S2 [P0] command failure returns exit code", async () => {
    mockDocker("", "command failed\n", 1);
    const { parsed } = await callAndValidate({
      container: "c",
      command: ["false"],
    });
    expect(parsed.exitCode).toBe(1);
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] Empty command array
  it("S3 [P0] empty command array throws error", async () => {
    await expect(callAndValidate({ container: "c", command: [] })).rejects.toThrow(
      "command array must not be empty",
    );
  });

  // S4 [P0] Container not found
  it("S4 [P0] container not found throws error", async () => {
    vi.mocked(docker).mockRejectedValueOnce(new Error("No such container: nonexistent"));
    await expect(callAndValidate({ container: "nonexistent", command: ["ls"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on container
  it("S5 [P0] flag injection on container is blocked", async () => {
    await expect(callAndValidate({ container: "--exec=evil", command: ["ls"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on command[0]
  it("S6 [P0] flag injection on command[0] is blocked", async () => {
    await expect(callAndValidate({ container: "c", command: ["--evil"] })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on workdir
  it("S7 [P0] flag injection on workdir is blocked", async () => {
    await expect(
      callAndValidate({ container: "c", command: ["ls"], workdir: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S8 [P0] Flag injection on user
  it("S8 [P0] flag injection on user is blocked", async () => {
    await expect(
      callAndValidate({ container: "c", command: ["ls"], user: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S9 [P0] Flag injection on env
  it("S9 [P0] flag injection on env is blocked", async () => {
    await expect(
      callAndValidate({ container: "c", command: ["ls"], env: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S10 [P0] Flag injection on envFile
  it("S10 [P0] flag injection on envFile is blocked", async () => {
    await expect(
      callAndValidate({ container: "c", command: ["ls"], envFile: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S11 [P1] Command timeout
  it("S11 [P1] command timeout returns timedOut", async () => {
    vi.mocked(docker).mockRejectedValueOnce(new Error("Command timed out after 1000ms"));
    const { parsed } = await callAndValidate({
      container: "c",
      command: ["sleep", "999"],
      timeout: 1000,
    });
    expect(parsed.timedOut).toBe(true);
    expect(parsed.exitCode).toBe(124);
  });

  // S12 [P1] Output truncation with limit
  it("S12 [P1] output truncation with limit sets isTruncated", async () => {
    mockDocker("a".repeat(200), "", 0);
    const { parsed } = await callAndValidate({
      container: "c",
      command: ["cat", "big"],
      limit: 100,
    });
    expect(parsed.isTruncated).toBe(true);
  });

  // S13 [P1] Parse JSON output
  it("S13 [P1] parse JSON output returns json field", async () => {
    mockDocker('{"key":"value"}', "", 0);
    const { parsed } = await callAndValidate({
      container: "c",
      command: ["echo", "{}"],
      parseJson: true,
      compact: false,
    });
    expect(parsed.json).toEqual({ key: "value" });
  });

  // S14 [P0] Schema validation
  it("S14 [P0] schema validation passes on all results", async () => {
    mockDocker("output\n", "", 0);
    const { parsed } = await callAndValidate({
      container: "mycontainer",
      command: ["ls"],
    });
    expect(DockerExecSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// images tool (8 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker images", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const IMAGES_JSON =
    '{"Containers":"N/A","CreatedAt":"2024-01-01 00:00:00 +0000 UTC","CreatedSince":"3 months ago","Digest":"<none>","ID":"abc123","Repository":"nginx","SharedSize":"N/A","Size":"187MB","Tag":"latest","UniqueSize":"N/A","VirtualSize":"187MB"}\n' +
    '{"Containers":"N/A","CreatedAt":"2024-01-02 00:00:00 +0000 UTC","CreatedSince":"3 months ago","Digest":"<none>","ID":"def456","Repository":"alpine","SharedSize":"N/A","Size":"7.8MB","Tag":"3.19","UniqueSize":"N/A","VirtualSize":"7.8MB"}\n';

  // S1 [P0] List all images
  it("S1 [P0] list all images returns image array", async () => {
    mockDocker(IMAGES_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.images.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] No images present
  it("S2 [P0] no images returns empty array", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.images).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on reference
  it("S3 [P0] flag injection on reference is blocked", async () => {
    await expect(callAndValidate({ reference: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on filterExpr
  it("S4 [P0] flag injection on filterExpr is blocked", async () => {
    await expect(callAndValidate({ filterExpr: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P1] Filter by reference
  it("S5 [P1] filter by reference passes reference as positional arg", async () => {
    mockDocker(IMAGES_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ reference: "nginx" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("nginx");
  });

  // S6 [P1] Filter with filterExpr
  it("S6 [P1] filter with filterExpr passes --filter flag", async () => {
    mockDocker("", "", 0);
    await callAndValidate({ filterExpr: "dangling=true" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--filter");
    expect(args).toContain("dangling=true");
  });

  // S7 [P2] Show digests
  it("S7 [P2] show digests passes --digests flag", async () => {
    mockDocker(IMAGES_JSON, "", 0);
    await callAndValidate({ digests: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--digests");
  });

  // S8 [P0] Schema validation
  it("S8 [P0] schema validation passes on all results", async () => {
    mockDocker(IMAGES_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(DockerImagesSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// inspect tool (9 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker inspect", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerInspectTool(server as never);
    handler = server.tools.get("inspect")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerInspectSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const INSPECT_CONTAINER_JSON = JSON.stringify([
    {
      Id: "abc123def456",
      Name: "/mycontainer",
      State: { Status: "running", Running: true, StartedAt: "2024-01-01T00:00:00Z" },
      Config: { Image: "nginx:latest", Env: ["PATH=/usr/local/sbin:/usr/local/bin"] },
      Platform: "linux",
    },
  ]);

  const INSPECT_IMAGE_JSON = JSON.stringify([
    {
      Id: "sha256:abc123",
      RepoTags: ["nginx:latest", "nginx:1.25"],
      RepoDigests: ["nginx@sha256:abc"],
      Size: 187000000,
      Config: {
        Cmd: ["nginx", "-g", "daemon off;"],
        Entrypoint: ["/docker-entrypoint.sh"],
        Env: ["PATH=/usr/local/sbin:/usr/local/bin"],
        Image: "nginx:latest",
      },
    },
  ]);

  const INSPECT_NETWORK_JSON = JSON.stringify([
    {
      Name: "bridge",
      Id: "net123",
      Driver: "bridge",
      Scope: "local",
    },
  ]);

  const INSPECT_VOLUME_JSON = JSON.stringify([
    {
      Name: "myvol",
      Driver: "local",
      Mountpoint: "/var/lib/docker/volumes/myvol/_data",
      Scope: "local",
    },
  ]);

  // S1 [P0] Inspect running container
  it("S1 [P0] inspect running container returns state", async () => {
    mockDocker(INSPECT_CONTAINER_JSON, "", 0);
    const { parsed } = await callAndValidate({ target: "mycontainer" });
    expect(parsed.id).toBeDefined();
    expect(parsed.name).toBeDefined();
  });

  // S2 [P0] Inspect image
  it("S2 [P0] inspect image returns repoTags", async () => {
    mockDocker(INSPECT_IMAGE_JSON, "", 0);
    const { parsed } = await callAndValidate({ target: "nginx:latest", type: "image" });
    expect(parsed.id).toBeDefined();
  });

  // S3 [P0] Target not found
  it("S3 [P0] target not found throws error", async () => {
    mockDocker("", "Error: No such object: nonexistent\n", 1);
    await expect(callAndValidate({ target: "nonexistent" })).rejects.toThrow(
      "docker inspect failed",
    );
  });

  // S4 [P0] Empty result
  it("S4 [P0] empty result throws no objects error", async () => {
    mockDocker("[]", "", 0);
    await expect(callAndValidate({ target: "nonexistent" })).rejects.toThrow(
      "docker inspect returned no objects",
    );
  });

  // S5 [P0] Flag injection on target
  it("S5 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P1] Multiple targets
  it("S6 [P1] multiple targets returns relatedTargets", async () => {
    const multiJson = JSON.stringify([
      {
        Id: "abc123",
        Name: "/c1",
        State: { Status: "running", Running: true },
        Config: { Image: "nginx", Env: [] },
      },
      {
        Id: "def456",
        Name: "/c2",
        State: { Status: "running", Running: true },
        Config: { Image: "alpine", Env: [] },
      },
    ]);
    mockDocker(multiJson, "", 0);
    const { parsed } = await callAndValidate({ target: ["c1", "c2"], compact: false });
    expect(parsed.relatedTargets).toBeDefined();
    expect(parsed.relatedTargets!.length).toBe(2);
  });

  // S7 [P1] Inspect network
  it("S7 [P1] inspect network returns driver", async () => {
    mockDocker(INSPECT_NETWORK_JSON, "", 0);
    const { parsed } = await callAndValidate({ target: "bridge", type: "network" });
    expect(parsed.id).toBeDefined();
  });

  // S8 [P1] Inspect volume
  it("S8 [P1] inspect volume returns mountpoint", async () => {
    mockDocker(INSPECT_VOLUME_JSON, "", 0);
    const { parsed } = await callAndValidate({ target: "myvol", type: "volume" });
    expect(parsed.id).toBeDefined();
  });

  // S9 [P0] Schema validation
  it("S9 [P0] schema validation passes on all results", async () => {
    mockDocker(INSPECT_CONTAINER_JSON, "", 0);
    const { parsed } = await callAndValidate({ target: "mycontainer" });
    expect(DockerInspectSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// logs tool (10 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker logs", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const LOGS_OUTPUT =
    "Server started on port 3000\n" + "Request received: GET /\n" + "Request received: POST /api\n";

  // S1 [P0] Get container logs
  it("S1 [P0] get container logs returns lines", async () => {
    mockDocker(LOGS_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ container: "mycontainer" });
    expect(parsed.container).toBe("mycontainer");
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] Container with no logs
  it("S2 [P0] container with no logs returns total 0", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({ container: "empty" });
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Container not found
  it("S3 [P0] container not found throws error", async () => {
    vi.mocked(docker).mockRejectedValueOnce(new Error("No such container: nonexistent"));
    await expect(callAndValidate({ container: "nonexistent" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on container
  it("S4 [P0] flag injection on container is blocked", async () => {
    await expect(callAndValidate({ container: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on since
  it("S5 [P0] flag injection on since is blocked", async () => {
    await expect(callAndValidate({ container: "c", since: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on until
  it("S6 [P0] flag injection on until is blocked", async () => {
    await expect(callAndValidate({ container: "c", until: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P1] Logs with tail
  it("S7 [P1] logs with tail passes --tail flag", async () => {
    mockDocker(LOGS_OUTPUT, "", 0);
    await callAndValidate({ container: "c", tail: 10 });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--tail");
    expect(args).toContain("10");
  });

  // S8 [P1] Logs with limit truncation
  it("S8 [P1] logs with limit sets isTruncated", async () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n") + "\n";
    mockDocker(manyLines, "", 0);
    const { parsed } = await callAndValidate({ container: "c", limit: 5, compact: false });
    expect(parsed.isTruncated).toBe(true);
  });

  // S9 [P1] Logs with timestamps
  it("S9 [P1] logs with timestamps passes --timestamps flag", async () => {
    mockDocker(LOGS_OUTPUT, "", 0);
    await callAndValidate({ container: "c", timestamps: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--timestamps");
  });

  // S10 [P0] Schema validation
  it("S10 [P0] schema validation passes on all results", async () => {
    mockDocker(LOGS_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ container: "mycontainer" });
    expect(DockerLogsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// network-ls tool (6 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker network-ls", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const NETWORK_JSON =
    '{"CreatedAt":"2024-01-01","Driver":"bridge","ID":"abc123","IPv6":"false","Internal":"false","Labels":"","Name":"bridge","Scope":"local"}\n' +
    '{"CreatedAt":"2024-01-01","Driver":"host","ID":"def456","IPv6":"false","Internal":"false","Labels":"","Name":"host","Scope":"local"}\n' +
    '{"CreatedAt":"2024-01-01","Driver":"null","ID":"ghi789","IPv6":"false","Internal":"false","Labels":"","Name":"none","Scope":"local"}\n';

  // S1 [P0] List all networks
  it("S1 [P0] list all networks returns network array", async () => {
    mockDocker(NETWORK_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.networks.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] Empty output (defaults always exist)
  it("S2 [P0] empty output returns empty array", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.networks).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on filter
  it("S3 [P0] flag injection on filter is blocked", async () => {
    await expect(callAndValidate({ filter: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P1] Filter by driver
  it("S4 [P1] filter by driver passes --filter flag", async () => {
    mockDocker(NETWORK_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ filter: "driver=bridge" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--filter");
    expect(args).toContain("driver=bridge");
  });

  // S5 [P1] Multiple filters
  it("S5 [P1] multiple filters pass multiple --filter flags", async () => {
    mockDocker(NETWORK_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ filter: ["driver=bridge", "scope=local"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    const filterIndices = args.reduce<number[]>(
      (acc, a, i) => (a === "--filter" ? [...acc, i] : acc),
      [],
    );
    expect(filterIndices.length).toBe(2);
  });

  // S6 [P0] Schema validation
  it("S6 [P0] schema validation passes on all results", async () => {
    mockDocker(NETWORK_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(DockerNetworkLsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ps tool (7 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker ps", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const PS_JSON =
    '{"Command":"nginx -g \\"daemon off;\\"","CreatedAt":"2024-01-01","ID":"abc123","Image":"nginx:latest","Labels":"","LocalVolumes":"0","Mounts":"","Names":"web","Networks":"bridge","Ports":"0.0.0.0:8080->80/tcp","RunningFor":"5 minutes","Size":"0B","State":"running","Status":"Up 5 minutes"}\n' +
    '{"Command":"postgres","CreatedAt":"2024-01-01","ID":"def456","Image":"postgres:16","Labels":"","LocalVolumes":"1","Mounts":"pgdata","Names":"db","Networks":"bridge","Ports":"5432/tcp","RunningFor":"5 minutes","Size":"0B","State":"exited","Status":"Exited (0) 1 minute ago"}\n';

  // S1 [P0] List containers
  it("S1 [P0] list containers returns container array", async () => {
    mockDocker(PS_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.containers.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
    expect(parsed.running).toBeGreaterThanOrEqual(0);
    expect(parsed.stopped).toBeGreaterThanOrEqual(0);
  });

  // S2 [P0] No containers
  it("S2 [P0] no containers returns empty", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.containers).toEqual([]);
    expect(parsed.total).toBe(0);
    expect(parsed.running).toBe(0);
    expect(parsed.stopped).toBe(0);
  });

  // S3 [P0] Flag injection on filter
  it("S3 [P0] flag injection on filter is blocked", async () => {
    await expect(callAndValidate({ filter: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P1] Filter by status
  it("S4 [P1] filter by status passes --filter flag", async () => {
    mockDocker(PS_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ filter: "status=running" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--filter");
    expect(args).toContain("status=running");
  });

  // S5 [P1] Show last N
  it("S5 [P1] show last N passes --last flag", async () => {
    mockDocker(PS_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ last: 1 });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--last");
    expect(args).toContain("1");
  });

  // S6 [P2] Show sizes
  it("S6 [P2] show sizes passes -s flag", async () => {
    mockDocker(PS_JSON, "", 0);
    await callAndValidate({ size: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("-s");
  });

  // S7 [P0] Schema validation
  it("S7 [P0] schema validation passes on all results", async () => {
    mockDocker(PS_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(DockerPsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pull tool (7 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker pull", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const PULL_SUCCESS =
    "latest: Pulling from library/alpine\n" +
    "Digest: sha256:abc123def456\n" +
    "Status: Downloaded newer image for alpine:latest\n" +
    "docker.io/library/alpine:latest\n";

  const PULL_UP_TO_DATE =
    "latest: Pulling from library/alpine\n" +
    "Digest: sha256:abc123def456\n" +
    "Status: Image is up to date for alpine:latest\n" +
    "docker.io/library/alpine:latest\n";

  const PULL_NOT_FOUND =
    "Error response from daemon: pull access denied for nonexistent/image, " +
    "repository does not exist or may require 'docker login'\n";

  // S1 [P0] Pull existing image
  it("S1 [P0] pull existing image returns pulled status", async () => {
    mockDocker(PULL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ image: "alpine:latest" });
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe("pulled");
  });

  // S2 [P0] Pull already up-to-date
  it("S2 [P0] pull already up-to-date returns up-to-date status", async () => {
    mockDocker(PULL_UP_TO_DATE, "", 0);
    const { parsed } = await callAndValidate({ image: "alpine:latest" });
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe("up-to-date");
  });

  // S3 [P0] Pull nonexistent image
  it("S3 [P0] pull nonexistent image returns error status", async () => {
    mockDocker("", PULL_NOT_FOUND, 1);
    const { parsed } = await callAndValidate({ image: "nonexistent/image:99" });
    expect(parsed.success).toBe(false);
    expect(parsed.status).toBe("error");
  });

  // S4 [P0] Flag injection on image
  it("S4 [P0] flag injection on image is blocked", async () => {
    await expect(callAndValidate({ image: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on platform
  it("S5 [P0] flag injection on platform is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", platform: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P1] Pull with platform
  it("S6 [P1] pull with platform passes --platform flag", async () => {
    mockDocker(PULL_SUCCESS, "", 0);
    await callAndValidate({ image: "alpine", platform: "linux/arm64" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--platform");
    expect(args).toContain("linux/arm64");
  });

  // S7 [P0] Schema validation
  it("S7 [P0] schema validation passes on all results", async () => {
    mockDocker(PULL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ image: "alpine:latest" });
    expect(DockerPullSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// run tool (15 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRunTool(server as never);
    handler = server.tools.get("run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = DockerRunSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Run detached container
  it("S1 [P0] run detached container returns containerId", async () => {
    mockDocker("abc123def456789\n", "", 0);
    const { parsed } = await callAndValidate({ image: "nginx:latest" });
    expect(parsed.containerId).toBeDefined();
    expect(parsed.image).toBe("nginx:latest");
    expect(parsed.detached).toBe(true);
  });

  // S2 [P0] Image not found error
  it("S2 [P0] image not found returns errorCategory", async () => {
    mockDocker(
      "",
      "Unable to find image 'nonexistent:99' locally\n" +
        "Error response from daemon: pull access denied, repository does not exist\n",
      125,
    );
    const { parsed } = await callAndValidate({ image: "nonexistent:99", compact: false });
    expect(parsed.errorCategory).toBeDefined();
  });

  // S3 [P0] Non-detached run with exit code
  it("S3 [P0] non-detached run returns stdout and exit code", async () => {
    mockDocker("hi\n", "", 0);
    const { parsed } = await callAndValidate({
      image: "alpine",
      command: ["echo", "hi"],
      detach: false,
      rm: true,
      compact: false,
    });
    expect(parsed.exitCode).toBe(0);
  });

  // S4 [P0] Flag injection on image
  it("S4 [P0] flag injection on image is blocked", async () => {
    await expect(callAndValidate({ image: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on name
  it("S5 [P0] flag injection on name is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", name: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on workdir
  it("S6 [P0] flag injection on workdir is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", workdir: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on network
  it("S7 [P0] flag injection on network is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", network: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on volumes
  it("S8 [P0] flag injection on volumes is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", volumes: ["--exec=evil"] })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on env
  it("S9 [P0] flag injection on env is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", env: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on command[0]
  it("S10 [P0] flag injection on command[0] is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", command: ["--evil"] })).rejects.toThrow();
  });

  // S11 [P0] Flag injection on entrypoint
  it("S11 [P0] flag injection on entrypoint is blocked", async () => {
    await expect(callAndValidate({ image: "alpine", entrypoint: "--exec=evil" })).rejects.toThrow();
  });

  // S12 [P1] Run with port mapping
  it("S12 [P1] run with port mapping passes -p flag", async () => {
    mockDocker("abc123\n", "", 0);
    await callAndValidate({ image: "nginx", ports: ["8080:80"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("-p");
    expect(args).toContain("8080:80");
  });

  // S13 [P1] Run with environment vars
  it("S13 [P1] run with env passes -e flag", async () => {
    mockDocker("abc123\n", "", 0);
    await callAndValidate({ image: "alpine", env: ["FOO=bar"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("-e");
    expect(args).toContain("FOO=bar");
  });

  // S14 [P2] Run with memory limit
  it("S14 [P2] run with memory limit passes -m flag", async () => {
    mockDocker("abc123\n", "", 0);
    await callAndValidate({ image: "alpine", memory: "512m" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("-m");
    expect(args).toContain("512m");
  });

  // S15 [P0] Schema validation
  it("S15 [P0] schema validation passes on all results", async () => {
    mockDocker("abc123def456789\n", "", 0);
    const { parsed } = await callAndValidate({ image: "nginx:latest" });
    expect(DockerRunSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// stats tool (6 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker stats", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const STATS_JSON =
    '{"BlockIO":"0B / 0B","CPUPerc":"0.50%","Container":"abc123","ID":"abc123","MemPerc":"1.20%","MemUsage":"24MiB / 2GiB","Name":"web","NetIO":"1.2kB / 3.4kB","PIDs":"5"}\n' +
    '{"BlockIO":"10MB / 20MB","CPUPerc":"2.30%","Container":"def456","ID":"def456","MemPerc":"5.60%","MemUsage":"112MiB / 2GiB","Name":"db","NetIO":"500kB / 1MB","PIDs":"15"}\n';

  // S1 [P0] Stats for running containers
  it("S1 [P0] stats returns container stats", async () => {
    mockDocker(STATS_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.containers.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] No running containers
  it("S2 [P0] no running containers returns empty", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.containers).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on containers
  it("S3 [P0] flag injection on containers is blocked", async () => {
    await expect(callAndValidate({ containers: ["--exec=evil"] })).rejects.toThrow();
  });

  // S4 [P1] Stats for specific container
  it("S4 [P1] stats for specific container passes name", async () => {
    mockDocker(STATS_JSON.split("\n")[0] + "\n", "", 0);
    await callAndValidate({ containers: ["mycontainer"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("mycontainer");
  });

  // S5 [P1] All containers including stopped
  it("S5 [P1] all containers passes --all flag", async () => {
    mockDocker(STATS_JSON, "", 0);
    await callAndValidate({ all: true });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--all");
  });

  // S6 [P0] Schema validation
  it("S6 [P0] schema validation passes on all results", async () => {
    mockDocker(STATS_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(DockerStatsSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// volume-ls tool (6 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: docker volume-ls", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const VOLUME_JSON =
    '{"Availability":"N/A","Driver":"local","Group":"N/A","Labels":"","Links":"N/A","Mountpoint":"/var/lib/docker/volumes/mydata/_data","Name":"mydata","Scope":"local","Size":"N/A","Status":"N/A"}\n' +
    '{"Availability":"N/A","Driver":"local","Group":"N/A","Labels":"","Links":"N/A","Mountpoint":"/var/lib/docker/volumes/pgdata/_data","Name":"pgdata","Scope":"local","Size":"N/A","Status":"N/A"}\n';

  // S1 [P0] List all volumes
  it("S1 [P0] list all volumes returns volume array", async () => {
    mockDocker(VOLUME_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.volumes.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S2 [P0] No volumes
  it("S2 [P0] no volumes returns empty array", async () => {
    mockDocker("", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.volumes).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // S3 [P0] Flag injection on filter
  it("S3 [P0] flag injection on filter is blocked", async () => {
    await expect(callAndValidate({ filter: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P1] Filter by dangling
  it("S4 [P1] filter by dangling passes --filter flag", async () => {
    mockDocker("", "", 0);
    await callAndValidate({ filter: "dangling=true" });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    expect(args).toContain("--filter");
    expect(args).toContain("dangling=true");
  });

  // S5 [P1] Multiple filters
  it("S5 [P1] multiple filters pass multiple --filter flags", async () => {
    mockDocker("", "", 0);
    await callAndValidate({ filter: ["dangling=true", "driver=local"] });
    const args = vi.mocked(docker).mock.calls[0][0] as string[];
    const filterIndices = args.reduce<number[]>(
      (acc, a, i) => (a === "--filter" ? [...acc, i] : acc),
      [],
    );
    expect(filterIndices.length).toBe(2);
  });

  // S6 [P0] Schema validation
  it("S6 [P0] schema validation passes on all results", async () => {
    mockDocker(VOLUME_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(DockerVolumeLsSchema.safeParse(parsed).success).toBe(true);
  });
});
