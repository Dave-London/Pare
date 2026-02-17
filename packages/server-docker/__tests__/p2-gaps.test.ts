import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseBuildOutput,
  parseComposeBuildOutput,
  parseComposeDownOutput,
  parseComposePsJson,
  parseComposeUpOutput,
  parseExecOutput,
  parseImagesJson,
  parseInspectJsonAll,
  parseLogsOutput,
  parsePsJson,
  parsePullOutput,
  parseStatsJson,
  parseVolumeLsJson,
} from "../src/lib/parsers.js";
import { compactExecMap } from "../src/lib/formatters.js";
import { registerComposeLogsTool } from "../src/tools/compose-logs.js";
import { registerComposeUpTool } from "../src/tools/compose-up.js";
import { registerExecTool } from "../src/tools/exec.js";
import { registerInspectTool } from "../src/tools/inspect.js";

vi.mock("../src/lib/docker-runner.js", () => ({
  docker: vi.fn(),
}));

import { docker } from "../src/lib/docker-runner.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

describe("Docker P2 gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(docker).mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
  });

  it("#222 parses BuildKit cache hits/misses", () => {
    const stdout = [
      "#1 [web 1/3] FROM docker.io/library/node:20",
      "#2 [web 2/3] RUN npm ci",
      "#3 [web 3/3] CACHED",
      "#4 [api 1/2] CACHED",
    ].join("\n");
    const result = parseBuildOutput(stdout, "", 0, 2.3);
    expect(result.cacheHits).toBeGreaterThan(0);
    expect(result.cacheMisses).toBeGreaterThan(0);
    expect(result.cacheByStep?.length).toBeGreaterThan(0);
  });

  it("#223 extracts per-service image IDs in compose build", () => {
    const stderr = [
      "#1 [web internal] load build definition",
      "#5 [web 3/3] exporting to image",
      "#5 writing image sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "#5 naming to docker.io/library/myapp-web",
      "Service web Built",
    ].join("\n");
    const result = parseComposeBuildOutput("", stderr, 0, 5.0);
    expect(result.services?.[0].imageId).toBe("aaaaaaaaaaaa");
    expect(result.services?.[0].image).toContain("myapp-web");
  });

  it("#224/#225 keeps separate network/volume removal tracking", () => {
    const stderr = "Network app_default Removed";
    const result = parseComposeDownOutput("", stderr, 0, {
      trackVolumes: true,
      trackNetworks: true,
    });
    expect(result.networksRemoved).toBe(1);
    expect(result.volumesRemoved).toBe(0);
  });

  it("#226 applies compose log parser limit", async () => {
    const server = new FakeServer();
    registerComposeLogsTool(server as never);
    const handler = server.tools.get("compose-logs")!.handler;
    vi.mocked(docker).mockResolvedValue({
      stdout: "web-1 | line1\nweb-1 | line2\nweb-1 | line3",
      stderr: "",
      exitCode: 0,
    });

    const out = (await handler({ path: "/repo", limit: 2 })) as {
      structuredContent: { total: number };
    };
    expect(out.structuredContent.total).toBe(2);
  });

  it("#227 parses compose ps exitCode from status", () => {
    const stdout = JSON.stringify({
      Name: "app-web-1",
      Service: "web",
      State: "exited",
      Status: "Exited (137) 2 seconds ago",
    });
    const result = parseComposePsJson(stdout);
    expect(result.services[0].exitCode).toBe(137);
  });

  it("#228 maps compose up scale to --scale args", async () => {
    const server = new FakeServer();
    registerComposeUpTool(server as never);
    const handler = server.tools.get("compose-up")!.handler;

    await handler({ path: "/repo", scale: { web: 2, worker: 3 } });
    const args = vi.mocked(docker).mock.calls[0][0];
    expect(args).toContain("--scale");
    expect(args).toContain("web=2");
    expect(args).toContain("worker=3");
  });

  it("#229 parses compose up network/volume creation counts", () => {
    const stderr = [
      "Network app_default Created",
      "Network app_extra Created",
      "Volume app_data Created",
      "Container app-web-1 Started",
    ].join("\n");
    const result = parseComposeUpOutput("", stderr, 0);
    expect(result.networksCreated).toBe(2);
    expect(result.volumesCreated).toBe(1);
  });

  it("#230 keeps compact stdout/stderr previews for exec", () => {
    const compact = compactExecMap({
      exitCode: 1,
      success: false,
      stdout: "some stdout output",
      stderr: "some stderr output",
      isTruncated: true,
    });
    expect(compact.stdoutPreview).toContain("stdout");
    expect(compact.stderrPreview).toContain("stderr");
  });

  it("#231 models exec timeouts as structured output", async () => {
    const server = new FakeServer();
    registerExecTool(server as never);
    const handler = server.tools.get("exec")!.handler;
    vi.mocked(docker).mockRejectedValue(new Error('Command "docker" timed out after 1000ms'));

    const out = (await handler({
      container: "abc123",
      command: ["sleep", "10"],
      timeout: 1000,
      compact: false,
    })) as { structuredContent: { timedOut?: boolean; exitCode?: number } };
    expect(out.structuredContent.timedOut).toBe(true);
    expect(out.structuredContent.exitCode).toBe(124);
  });

  it("#232 parses exec stdout as JSON when requested", () => {
    const result = parseExecOutput('{"ok":true,"count":2}', "", 0, 0.1, undefined, {
      parseJson: true,
    });
    expect(result.json).toEqual({ ok: true, count: 2 });
    expect(result.parseJsonError).toBeUndefined();
  });

  it("#233 parses image size to numeric bytes", () => {
    const stdout = JSON.stringify({
      ID: "sha256:abc123def456",
      Repository: "nginx",
      Tag: "latest",
      Size: "10MB",
    });
    const result = parseImagesJson(stdout);
    expect(result.images[0].sizeBytes).toBeGreaterThan(0);
  });

  it("#234 captures image labels from JSON output", () => {
    const stdout = JSON.stringify({
      ID: "sha256:abc123def456",
      Repository: "nginx",
      Tag: "latest",
      Size: "10MB",
      Labels: "maintainer=team,env=prod",
    });
    const result = parseImagesJson(stdout);
    expect(result.images[0].labels?.maintainer).toBe("team");
    expect(result.images[0].labels?.env).toBe("prod");
  });

  it("#235 supports multiple inspect targets", async () => {
    const server = new FakeServer();
    registerInspectTool(server as never);
    const handler = server.tools.get("inspect")!.handler;
    vi.mocked(docker).mockResolvedValue({
      stdout: JSON.stringify([
        {
          Id: "abc123def456",
          Name: "/a",
          State: { Status: "running", Running: true },
          Config: { Image: "nginx:latest" },
        },
        {
          Id: "def456abc789",
          Name: "/b",
          State: { Status: "exited", Running: false },
          Config: { Image: "redis:latest" },
        },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = (await handler({ target: ["a", "b"], compact: false })) as {
      structuredContent: { relatedTargets?: Array<{ target: string }> };
    };
    expect(out.structuredContent.relatedTargets?.length).toBe(2);
  });

  it("#236 parses network/volume inspect objects", () => {
    const parsed = parseInspectJsonAll(
      JSON.stringify([
        { Name: "data", Driver: "local", Mountpoint: "/var/lib/docker/volumes/data/_data" },
        { Id: "net123", Name: "app_default", Driver: "bridge", Scope: "local", IPAM: {} },
      ]),
    );
    expect(parsed[0].inspectType).toBe("volume");
    expect(parsed[1].inspectType).toBe("network");
  });

  it("#237 extracts per-line timestamps for docker logs", () => {
    const out = parseLogsOutput("2024-01-01T00:00:00Z start\n2024-01-01T00:00:01Z ready", "app");
    expect(out.entries?.[0].timestamp).toBe("2024-01-01T00:00:00Z");
    expect(out.entries?.[1].message).toBe("ready");
  });

  it("#238 handles IPv6 ps port bindings", () => {
    const stdout = JSON.stringify({
      ID: "abc123",
      Names: "web",
      Image: "nginx",
      Status: "Up",
      State: "running",
      Ports: "[::]:8080->80/tcp",
    });
    const out = parsePsJson(stdout);
    expect(out.containers[0].ports?.[0]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
  });

  it("#239 classifies docker pull errors", () => {
    const out = parsePullOutput(
      "",
      "Error response from daemon: unauthorized: authentication required",
      1,
      "private/repo:latest",
    );
    expect(out.errorType).toBe("auth");
    expect(out.errorMessage).toContain("unauthorized");
  });

  it("#240 includes container state in docker stats output", () => {
    const out = parseStatsJson(
      JSON.stringify({
        Container: "abc123",
        Name: "app",
        State: "exited",
        CPUPerc: "0%",
        MemUsage: "0B / 0B",
        MemPerc: "0%",
        NetIO: "0B / 0B",
        BlockIO: "0B / 0B",
        PIDs: "0",
      }),
    );
    expect(out.containers[0].state).toBe("exited");
  });

  it("#241 parses volume status for cluster volumes", () => {
    const out = parseVolumeLsJson(
      JSON.stringify({ Name: "clustervol", Driver: "local", Scope: "swarm", Status: "available" }),
    );
    expect(out.volumes[0].status).toBe("available");
  });
});
