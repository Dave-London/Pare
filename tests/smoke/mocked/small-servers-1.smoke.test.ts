/**
 * Smoke tests: small servers — file 1 of 2
 * Covers k8s (5 tools), search (4 tools), http (4 tools)
 *
 * Tests all tools end-to-end with mocked runners,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KubectlGetResultSchema,
  KubectlDescribeResultSchema,
  KubectlLogsResultSchema,
  KubectlApplyResultSchema,
  HelmListResultSchema,
  HelmStatusResultSchema,
  HelmInstallResultSchema,
  HelmUpgradeResultSchema,
  HelmUninstallResultSchema,
  HelmRollbackResultSchema,
  HelmHistoryResultSchema,
  HelmTemplateResultSchema,
} from "../../../packages/server-k8s/src/schemas/index.js";
import {
  SearchResultSchema,
  CountResultSchema,
  FindResultSchema,
  JqResultSchema,
} from "../../../packages/server-search/src/schemas/index.js";
import {
  HttpResponseSchema,
  HttpHeadResponseSchema,
} from "../../../packages/server-http/src/schemas/index.js";

// ── Mock @paretools/shared for k8s (uses `run` directly from shared) ────────
vi.mock("@paretools/shared", async () => {
  const actual = await vi.importActual<typeof import("@paretools/shared")>("@paretools/shared");
  return {
    ...actual,
    run: vi.fn(),
  };
});

vi.mock("../../../packages/shared/dist/runner.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    run: vi.fn(),
  };
});

// ── Mock search runner ──────────────────────────────────────────────────────
vi.mock("../../../packages/server-search/src/lib/search-runner.js", () => ({
  rgCmd: vi.fn(),
  fdCmd: vi.fn(),
  jqCmd: vi.fn(),
}));

// ── Mock curl runner ────────────────────────────────────────────────────────
vi.mock("../../../packages/server-http/src/lib/curl-runner.js", () => ({
  curlCmd: vi.fn(),
}));

import { run } from "../../../packages/shared/dist/runner.js";
import { rgCmd, fdCmd, jqCmd } from "../../../packages/server-search/src/lib/search-runner.js";
import { curlCmd } from "../../../packages/server-http/src/lib/curl-runner.js";

// k8s tools
import { registerGetTool } from "../../../packages/server-k8s/src/tools/get.js";
import { registerDescribeTool } from "../../../packages/server-k8s/src/tools/describe.js";
import { registerLogsTool } from "../../../packages/server-k8s/src/tools/logs.js";
import { registerApplyTool } from "../../../packages/server-k8s/src/tools/apply.js";
import { registerHelmTool } from "../../../packages/server-k8s/src/tools/helm.js";

// search tools
import { registerSearchTool } from "../../../packages/server-search/src/tools/search.js";
import { registerCountTool } from "../../../packages/server-search/src/tools/count.js";
import { registerFindTool } from "../../../packages/server-search/src/tools/find.js";
import { registerJqTool } from "../../../packages/server-search/src/tools/jq.js";

// http tools
import { registerRequestTool } from "../../../packages/server-http/src/tools/request.js";
import { registerGetTool as registerHttpGetTool } from "../../../packages/server-http/src/tools/get.js";
import { registerPostTool } from "../../../packages/server-http/src/tools/post.js";
import { registerHeadTool } from "../../../packages/server-http/src/tools/head.js";

// ── Types & Helpers ─────────────────────────────────────────────────────────

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

function mockRun(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(run).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockRg(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(rgCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockFd(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(fdCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockJq(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(jqCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockCurl(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(curlCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// k8s.get
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: k8s.get", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerGetTool(server as never);
    handler = server.tools.get("get")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = KubectlGetResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] list pods in default namespace", async () => {
    mockRun(
      JSON.stringify({
        apiVersion: "v1",
        kind: "List",
        items: [
          { metadata: { name: "nginx-abc", namespace: "default" } },
          { metadata: { name: "redis-xyz", namespace: "default" } },
        ],
      }),
    );
    const { parsed } = await callAndValidate({ resource: "pods" });
    expect(parsed.success).toBe(true);
    // resource and total moved to Internal type (removed from schema)
    // items may be undefined in compact mode
  });

  it("S2 [P0] get specific pod by name", async () => {
    mockRun(
      JSON.stringify({
        apiVersion: "v1",
        kind: "Pod",
        metadata: { name: "nginx-abc", namespace: "default" },
      }),
    );
    const { parsed } = await callAndValidate({ resource: "pods", name: "nginx-abc" });
    expect(parsed.success).toBe(true);
  });

  it("S3 [P0] resource not found", async () => {
    mockRun("", 'Error from server (NotFound): pods "nonexistent-pod" not found', 1);
    const { parsed } = await callAndValidate({ resource: "pods", name: "nonexistent-pod" });
    expect(parsed.success).toBe(false);
  });

  it("S4 [P0] no resources exist (empty list)", async () => {
    mockRun(JSON.stringify({ apiVersion: "v1", kind: "List", items: [] }));
    const { parsed } = await callAndValidate({ resource: "pods", namespace: "empty-ns" });
    expect(parsed.success).toBe(true);
    // total removed from schema (derivable from items.length)
    // items may be undefined in compact mode
  });

  it("S5 [P0] flag injection on resource", async () => {
    await expect(callAndValidate({ resource: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on name", async () => {
    await expect(callAndValidate({ resource: "pods", name: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on namespace", async () => {
    await expect(callAndValidate({ resource: "pods", namespace: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on selector", async () => {
    await expect(callAndValidate({ resource: "pods", selector: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on fieldSelector", async () => {
    await expect(
      callAndValidate({ resource: "pods", fieldSelector: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection on context", async () => {
    await expect(callAndValidate({ resource: "pods", context: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection on kubeconfig", async () => {
    await expect(
      callAndValidate({ resource: "pods", kubeconfig: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S12 [P0] flag injection on sortBy", async () => {
    await expect(callAndValidate({ resource: "pods", sortBy: "--exec=evil" })).rejects.toThrow();
  });

  it("S13 [P0] flag injection on subresource", async () => {
    await expect(
      callAndValidate({ resource: "pods", subresource: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S14 [P0] flag injection on filename array", async () => {
    await expect(
      callAndValidate({ resource: "pods", filename: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S15 [P1] all namespaces", async () => {
    mockRun(
      JSON.stringify({
        apiVersion: "v1",
        kind: "List",
        items: [
          { metadata: { name: "p1", namespace: "ns1" } },
          { metadata: { name: "p2", namespace: "ns2" } },
        ],
      }),
    );
    const { parsed } = await callAndValidate({ resource: "pods", allNamespaces: true });
    expect(parsed.success).toBe(true);
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("-A");
  });

  it("S16 [P1] label selector filtering", async () => {
    mockRun(
      JSON.stringify({
        apiVersion: "v1",
        kind: "List",
        items: [{ metadata: { name: "nginx-1" } }],
      }),
    );
    const { parsed } = await callAndValidate({ resource: "pods", selector: "app=nginx" });
    expect(parsed.success).toBe(true);
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("-l");
    expect(callArgs[1]).toContain("app=nginx");
  });

  it("S17 [P1] field selector filtering", async () => {
    mockRun(
      JSON.stringify({
        apiVersion: "v1",
        kind: "List",
        items: [{ metadata: { name: "running-1" } }],
      }),
    );
    const { parsed } = await callAndValidate({
      resource: "pods",
      fieldSelector: "status.phase=Running",
    });
    expect(parsed.success).toBe(true);
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--field-selector");
  });

  it("S18 [P1] ignoreNotFound suppresses error", async () => {
    mockRun(JSON.stringify({ apiVersion: "v1", kind: "List", items: [] }), "", 0);
    const { parsed } = await callAndValidate({
      resource: "pods",
      name: "nonexistent",
      ignoreNotFound: true,
    });
    expect(parsed.success).toBe(true);
    // total removed from schema (derivable from items.length)
    // items may be undefined in compact mode
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--ignore-not-found");
  });

  it("S21 [P0] schema validation on all outputs", async () => {
    mockRun(JSON.stringify({ apiVersion: "v1", kind: "List", items: [] }));
    const { parsed } = await callAndValidate({ resource: "pods" });
    expect(KubectlGetResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// k8s.describe
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: k8s.describe", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerDescribeTool(server as never);
    handler = server.tools.get("describe")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = KubectlDescribeResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] describe a specific pod", async () => {
    mockRun("Name:         nginx-abc\nNamespace:    default\nStatus:       Running\n", "", 0);
    const { parsed } = await callAndValidate({ resource: "pod", name: "nginx-abc" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("describe");
  });

  it("S2 [P0] resource not found", async () => {
    mockRun("", 'Error from server (NotFound): pods "nonexistent" not found', 1);
    const { parsed } = await callAndValidate({ resource: "pod", name: "nonexistent" });
    expect(parsed.success).toBe(false);
  });

  it("S3 [P0] describe all pods (no name)", async () => {
    mockRun("Name:         pod-1\n---\nName:         pod-2\n", "", 0);
    const { parsed } = await callAndValidate({ resource: "pod" });
    expect(parsed.success).toBe(true);
  });

  it("S4 [P0] flag injection on resource", async () => {
    await expect(callAndValidate({ resource: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on name", async () => {
    await expect(callAndValidate({ resource: "pod", name: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on namespace", async () => {
    await expect(callAndValidate({ resource: "pod", namespace: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on selector", async () => {
    await expect(callAndValidate({ resource: "pod", selector: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on context", async () => {
    await expect(callAndValidate({ resource: "pod", context: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on kubeconfig", async () => {
    await expect(callAndValidate({ resource: "pod", kubeconfig: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P1] pod with conditions and events", async () => {
    mockRun(
      "Name:         test-pod\nNamespace:    default\nConditions:\n  Type     Status\n  Ready    True\nEvents:\n  Type    Reason   Age   From     Message\n  Normal  Pulled   5m    kubelet  Container image pulled\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({ resource: "pod", name: "test-pod" });
    expect(parsed.success).toBe(true);
  });

  it("S11 [P1] describe deployment with replicas", async () => {
    mockRun(
      "Name:         my-deploy\nReplicas:     3 desired | 3 updated | 3 total | 3 available | 0 unavailable\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({ resource: "deployment", name: "my-deploy" });
    expect(parsed.success).toBe(true);
  });

  it("S12 [P1] describe service with ports", async () => {
    mockRun(
      "Name:         my-svc\nType:         ClusterIP\nPort:         http  80/TCP\nTargetPort:   8080/TCP\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({ resource: "service", name: "my-svc" });
    expect(parsed.success).toBe(true);
  });

  it("S13 [P1] showEvents false hides events", async () => {
    mockRun("Name:         test-pod\nNamespace:    default\n", "", 0);
    await callAndValidate({ resource: "pod", name: "test-pod", showEvents: false });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--show-events=false");
  });

  it("S15 [P0] schema validation", async () => {
    mockRun("Name:         test\n", "", 0);
    const { parsed } = await callAndValidate({ resource: "pod", name: "test" });
    expect(KubectlDescribeResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// k8s.logs
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: k8s.logs", () => {
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
    const parsed = KubectlLogsResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] get logs from a running pod", async () => {
    mockRun("2024-01-15 INFO Starting server\n2024-01-15 INFO Listening on :8080\n", "", 0);
    const { parsed } = await callAndValidate({ pod: "nginx-abc" });
    expect(parsed.success).toBe(true);
    // pod and lineCount removed from schema (echo-back/derivable)
    // logs may be undefined in compact mode
  });

  it("S2 [P0] pod not found", async () => {
    mockRun("", 'Error from server (NotFound): pods "nonexistent-pod" not found', 1);
    const { parsed } = await callAndValidate({ pod: "nonexistent-pod" });
    expect(parsed.success).toBe(false);
  });

  it("S3 [P0] empty logs", async () => {
    mockRun("", "", 0);
    const { parsed } = await callAndValidate({ pod: "quiet-pod" });
    expect(parsed.success).toBe(true);
    // lineCount removed from schema (derivable)
  });

  it("S4 [P0] flag injection on pod", async () => {
    await expect(callAndValidate({ pod: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on namespace", async () => {
    await expect(callAndValidate({ pod: "p", namespace: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on container", async () => {
    await expect(callAndValidate({ pod: "p", container: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on since", async () => {
    await expect(callAndValidate({ pod: "p", since: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on sinceTime", async () => {
    await expect(callAndValidate({ pod: "p", sinceTime: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on selector", async () => {
    await expect(callAndValidate({ pod: "p", selector: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] flag injection on context", async () => {
    await expect(callAndValidate({ pod: "p", context: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection on podRunningTimeout", async () => {
    await expect(callAndValidate({ pod: "p", podRunningTimeout: "--exec=evil" })).rejects.toThrow();
  });

  it("S12 [P1] tail last N lines", async () => {
    mockRun("line8\nline9\nline10\n", "", 0);
    const { parsed } = await callAndValidate({ pod: "nginx-abc", tail: 10 });
    expect(parsed.success).toBe(true);
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--tail");
    expect(callArgs[1]).toContain("10");
  });

  it("S13 [P1] container-specific logs", async () => {
    mockRun("sidecar logs here\n", "", 0);
    const { parsed } = await callAndValidate({ pod: "multi-pod", container: "sidecar" });
    expect(parsed.success).toBe(true);
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("-c");
    expect(callArgs[1]).toContain("sidecar");
  });

  it("S14 [P1] since duration filter", async () => {
    mockRun("recent log\n", "", 0);
    await callAndValidate({ pod: "nginx-abc", since: "1h" });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--since");
    expect(callArgs[1]).toContain("1h");
  });

  it("S15 [P1] parseJsonLogs true", async () => {
    mockRun('{"level":"info","msg":"ok"}\n{"level":"warn","msg":"slow"}\n', "", 0);
    const { parsed } = await callAndValidate({ pod: "json-logger", parseJsonLogs: true });
    expect(parsed.success).toBe(true);
    if (parsed.logEntries) {
      expect(parsed.logEntries.length).toBeGreaterThan(0);
    }
  });

  it("S16 [P1] previous container logs", async () => {
    mockRun("crashed log output\n", "", 0);
    await callAndValidate({ pod: "crashed-pod", previous: true });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--previous");
  });

  it("S19 [P0] schema validation", async () => {
    mockRun("some logs\n", "", 0);
    const { parsed } = await callAndValidate({ pod: "test" });
    expect(KubectlLogsResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// k8s.apply
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: k8s.apply", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerApplyTool(server as never);
    handler = server.tools.get("apply")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = KubectlApplyResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] apply a single manifest", async () => {
    mockRun("deployment.apps/my-app created\n", "", 0);
    const { parsed } = await callAndValidate({ file: "deploy.yaml" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("apply");
  });

  it("S2 [P0] apply multiple manifests", async () => {
    mockRun("service/my-svc created\ndeployment.apps/my-app created\n", "", 0);
    const { parsed } = await callAndValidate({ file: ["svc.yaml", "deploy.yaml"] });
    expect(parsed.success).toBe(true);
  });

  it("S3 [P0] invalid manifest file", async () => {
    mockRun("", "error: the path nonexistent.yaml does not exist", 1);
    const { parsed } = await callAndValidate({ file: "nonexistent.yaml" });
    expect(parsed.success).toBe(false);
  });

  it("S4 [P0] flag injection on file", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on file array", async () => {
    await expect(callAndValidate({ file: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on namespace", async () => {
    await expect(callAndValidate({ file: "f.yaml", namespace: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on fieldManager", async () => {
    await expect(
      callAndValidate({ file: "f.yaml", fieldManager: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection on context", async () => {
    await expect(callAndValidate({ file: "f.yaml", context: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on selector", async () => {
    await expect(callAndValidate({ file: "f.yaml", selector: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] flag injection on waitTimeout", async () => {
    await expect(callAndValidate({ file: "f.yaml", waitTimeout: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P1] dry run client", async () => {
    mockRun("deployment.apps/my-app created (dry run)\n", "", 0);
    await callAndValidate({ file: "deploy.yaml", dryRun: "client" });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--dry-run");
    expect(callArgs[1]).toContain("client");
  });

  it("S12 [P1] dry run server", async () => {
    mockRun("deployment.apps/my-app created (server dry run)\n", "", 0);
    await callAndValidate({ file: "deploy.yaml", dryRun: "server" });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--dry-run");
    expect(callArgs[1]).toContain("server");
  });

  it("S13 [P1] server-side apply", async () => {
    mockRun("deployment.apps/my-app serverside-applied\n", "", 0);
    await callAndValidate({ file: "deploy.yaml", serverSide: true });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--server-side");
  });

  it("S14 [P1] kustomize directory", async () => {
    mockRun("deployment.apps/my-app created\n", "", 0);
    await callAndValidate({ file: "overlays/prod", kustomize: true });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("-k");
  });

  it("S15 [P1] resource unchanged on re-apply", async () => {
    mockRun("deployment.apps/my-app unchanged\n", "", 0);
    const { parsed } = await callAndValidate({ file: "deploy.yaml" });
    expect(parsed.success).toBe(true);
  });

  it("S17 [P0] schema validation", async () => {
    mockRun("deployment.apps/my-app created\n", "", 0);
    const { parsed } = await callAndValidate({ file: "deploy.yaml" });
    expect(KubectlApplyResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// k8s.helm
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: k8s.helm", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerHelmTool(server as never);
    handler = server.tools.get("helm")!.handler;
  });

  async function callAndValidateList(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HelmListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  async function callAndValidateStatus(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HelmStatusResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  async function callAndValidateInstall(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HelmInstallResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] list releases", async () => {
    mockRun(
      JSON.stringify([
        {
          name: "my-app",
          namespace: "default",
          revision: "1",
          status: "deployed",
          chart: "nginx-1.0.0",
          app_version: "1.0",
        },
      ]),
    );
    const { parsed } = await callAndValidateList({ action: "list" });
    expect(parsed.success).toBe(true);
    // total removed from schema (derivable from releases.length)
    // releases may be undefined in compact mode
  });

  it("S2 [P0] list with no releases", async () => {
    mockRun("[]");
    const { parsed } = await callAndValidateList({ action: "list", namespace: "empty-ns" });
    expect(parsed.success).toBe(true);
    // total removed from schema (derivable from releases.length)
    // releases may be undefined in compact mode
  });

  it("S3 [P0] status of a release", async () => {
    mockRun(
      JSON.stringify({
        name: "my-app",
        info: { status: "deployed", description: "Install complete" },
        version: 1,
        namespace: "default",
      }),
    );
    const { parsed } = await callAndValidateStatus({ action: "status", release: "my-app" });
    expect(parsed.success).toBe(true);
    // name removed from schema (echo-back)
    expect(parsed.status).toBeDefined();
  });

  it("S4 [P0] status of nonexistent release", async () => {
    mockRun("", "Error: release: not found", 1);
    const { parsed } = await callAndValidateStatus({
      action: "status",
      release: "nonexistent",
    });
    expect(parsed.success).toBe(false);
  });

  it("S5 [P0] install a chart", async () => {
    mockRun(
      JSON.stringify({
        name: "my-app",
        info: { status: "deployed" },
        version: 1,
        namespace: "default",
      }),
    );
    const { parsed } = await callAndValidateInstall({
      action: "install",
      release: "my-app",
      chart: "bitnami/nginx",
    });
    expect(parsed.success).toBe(true);
    // name removed from schema (echo-back)
  });

  it("S6 [P0] missing required release for status", async () => {
    await expect(handler({ action: "status" })).rejects.toThrow(
      "release is required for status action",
    );
  });

  it("S7 [P0] missing required chart for install", async () => {
    await expect(handler({ action: "install", release: "my-app" })).rejects.toThrow(
      "chart is required for install action",
    );
  });

  it("S8 [P0] flag injection on release", async () => {
    await expect(handler({ action: "status", release: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on chart", async () => {
    await expect(
      handler({ action: "install", release: "r", chart: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection on namespace", async () => {
    await expect(handler({ action: "list", namespace: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection on version", async () => {
    await expect(
      handler({ action: "install", release: "r", chart: "c", version: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S12 [P0] flag injection on filter", async () => {
    await expect(handler({ action: "list", filter: "--exec=evil" })).rejects.toThrow();
  });

  it("S13 [P0] flag injection on repo", async () => {
    await expect(
      handler({ action: "install", release: "r", chart: "c", repo: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S14 [P0] flag injection on description", async () => {
    await expect(
      handler({
        action: "install",
        release: "r",
        chart: "c",
        description: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  it("S15 [P0] flag injection on waitTimeout", async () => {
    await expect(
      handler({
        action: "install",
        release: "r",
        chart: "c",
        waitTimeout: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  it("S16 [P0] flag injection on values path", async () => {
    await expect(
      handler({
        action: "install",
        release: "r",
        chart: "c",
        values: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  it("S17 [P0] flag injection on setValues", async () => {
    await expect(
      handler({
        action: "install",
        release: "r",
        chart: "c",
        setValues: ["--exec=evil"],
      }),
    ).rejects.toThrow();
  });

  it("S18 [P1] upgrade a release", async () => {
    mockRun(
      JSON.stringify({
        name: "my-app",
        info: { status: "deployed" },
        version: 2,
        namespace: "default",
      }),
    );
    const result = await handler({
      action: "upgrade",
      release: "my-app",
      chart: "bitnami/nginx",
    });
    const parsed = HelmUpgradeResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
  });

  it("S19 [P1] uninstall a release", async () => {
    mockRun('release "my-app" uninstalled\n', "", 0);
    const result = await handler({ action: "uninstall", release: "my-app" });
    const parsed = HelmUninstallResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
  });

  it("S20 [P1] history of a release", async () => {
    mockRun(
      JSON.stringify([
        {
          revision: 1,
          updated: "2024-01-15",
          status: "deployed",
          chart: "nginx-1.0.0",
          description: "Install complete",
        },
      ]),
    );
    const result = await handler({ action: "history", release: "my-app" });
    const parsed = HelmHistoryResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    // total removed from schema (derivable from revisions.length)
    // revisions may be undefined in compact mode
  });

  it("S21 [P1] template rendering", async () => {
    mockRun("---\napiVersion: v1\nkind: Service\n---\napiVersion: apps/v1\nkind: Deployment\n");
    const result = await handler({
      action: "template",
      release: "my-app",
      chart: "bitnami/nginx",
    });
    const parsed = HelmTemplateResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.manifestCount).toBeGreaterThanOrEqual(0);
  });

  it("S22 [P1] rollback to revision", async () => {
    mockRun("Rollback was a success!\n", "", 0);
    const result = await handler({
      action: "rollback",
      release: "my-app",
      revision: 1,
    });
    const parsed = HelmRollbackResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
  });

  it("S23 [P1] install with dry-run", async () => {
    mockRun(
      JSON.stringify({
        name: "r",
        info: { status: "pending-install" },
        version: 1,
        namespace: "default",
      }),
    );
    await callAndValidateInstall({
      action: "install",
      release: "r",
      chart: "c",
      dryRun: true,
    });
    const callArgs = vi.mocked(run).mock.calls[0];
    expect(callArgs[1]).toContain("--dry-run");
  });

  it("S26 [P0] schema validation", async () => {
    mockRun("[]");
    const { parsed } = await callAndValidateList({ action: "list" });
    expect(HelmListResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// search.search
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: search.search", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerSearchTool(server as never);
    handler = server.tools.get("search")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = SearchResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] search for a common pattern", async () => {
    mockRg(
      '{"type":"match","data":{"path":{"text":"src/index.ts"},"lines":{"text":"import { foo } from \\"bar\\";\\n"},"line_number":1,"absolute_offset":0,"submatches":[{"match":{"text":"import"},"start":0,"end":6}]}}\n{"type":"summary","data":{"stats":{"searches":1,"searches_with_match":1,"bytes_searched":100,"bytes_printed":50,"matched_lines":1,"matches":1},"elapsed_total":{"human":"0.01s","nanos":10000000}}}\n',
    );
    const { parsed } = await callAndValidate({ pattern: "import", path: "src/" });
    expect(parsed.totalMatches).toBeGreaterThanOrEqual(0);
  });

  it("S2 [P0] no matches found", async () => {
    mockRg("", "", 1);
    const { parsed } = await callAndValidate({ pattern: "xyzzy_nonexistent_pattern_abc" });
    expect(parsed.totalMatches).toBe(0);
  });

  it("S3 [P0] invalid regex pattern", async () => {
    // validateRegexPattern now throws before rg runs
    await expect(callAndValidate({ pattern: "[invalid" })).rejects.toThrow(/Invalid regex pattern/);
  });

  it("S4 [P0] flag injection on pattern", async () => {
    await expect(callAndValidate({ pattern: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on path", async () => {
    await expect(callAndValidate({ pattern: "test", path: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on glob", async () => {
    await expect(callAndValidate({ pattern: "test", glob: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on type", async () => {
    await expect(callAndValidate({ pattern: "test", type: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P1] case-insensitive search", async () => {
    mockRg("");
    await callAndValidate({ pattern: "TODO", caseSensitive: false });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--ignore-case");
  });

  it("S9 [P1] glob filter", async () => {
    mockRg("");
    await callAndValidate({ pattern: "import", glob: "*.ts" });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--glob");
    expect(callArgs[0]).toContain("*.ts");
  });

  it("S10 [P1] fixed string match", async () => {
    mockRg("");
    await callAndValidate({ pattern: "a.b", fixedStrings: true });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--fixed-strings");
  });

  it("S11 [P1] word-only match", async () => {
    mockRg("");
    await callAndValidate({ pattern: "test", wordRegexp: true });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--word-regexp");
  });

  it("S12 [P1] maxResults truncation", async () => {
    mockRg("");
    const { parsed } = await callAndValidate({ pattern: ".", maxResults: 5 });
    expect(SearchResultSchema.safeParse(parsed).success).toBe(true);
  });

  it("S13 [P1] type filter", async () => {
    mockRg("");
    await callAndValidate({ pattern: "function", type: "ts" });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--type");
    expect(callArgs[0]).toContain("ts");
  });

  it("S16 [P0] schema validation", async () => {
    mockRg("");
    const { parsed } = await callAndValidate({ pattern: "test" });
    expect(SearchResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// search.count
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: search.count", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerCountTool(server as never);
    handler = server.tools.get("count")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = CountResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] count matches for pattern", async () => {
    mockRg("src/index.ts:5\nsrc/utils.ts:3\n");
    const { parsed } = await callAndValidate({ pattern: "import", path: "src/" });
    expect(parsed.totalMatches).toBeGreaterThanOrEqual(0);
  });

  it("S2 [P0] no matches found", async () => {
    mockRg("", "", 1);
    const { parsed } = await callAndValidate({ pattern: "xyzzy_nonexistent" });
    expect(parsed.totalMatches).toBe(0);
    expect(parsed.totalFiles).toBe(0);
  });

  it("S3 [P0] flag injection on pattern", async () => {
    await expect(callAndValidate({ pattern: "--exec=evil" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on path", async () => {
    await expect(callAndValidate({ pattern: "test", path: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on glob", async () => {
    await expect(callAndValidate({ pattern: "test", glob: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on type", async () => {
    await expect(callAndValidate({ pattern: "test", type: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P1] countMatches vs per-line", async () => {
    mockRg("file.ts:10\n");
    await callAndValidate({ pattern: "the", countMatches: true });
    const callArgs = vi.mocked(rgCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--count-matches");
  });

  it("S8 [P1] sort by count", async () => {
    mockRg("a.ts:1\nb.ts:5\n");
    const { parsed } = await callAndValidate({ pattern: "import", sort: "count" });
    if (parsed.files && parsed.files.length > 1) {
      expect(parsed.files[0].count).toBeGreaterThanOrEqual(parsed.files[1].count);
    }
  });

  it("S9 [P1] sort by path", async () => {
    mockRg("b.ts:1\na.ts:2\n");
    const { parsed } = await callAndValidate({ pattern: "import", sort: "path" });
    if (parsed.files && parsed.files.length > 1) {
      expect(parsed.files[0].file.localeCompare(parsed.files[1].file)).toBeLessThanOrEqual(0);
    }
  });

  it("S10 [P1] maxResults truncation", async () => {
    mockRg("a.ts:1\nb.ts:2\nc.ts:3\nd.ts:4\n");
    const { parsed } = await callAndValidate({ pattern: ".", maxResults: 3 });
    if (parsed.files) {
      expect(parsed.files.length).toBeLessThanOrEqual(3);
    }
  });

  it("S12 [P0] schema validation", async () => {
    mockRg("");
    const { parsed } = await callAndValidate({ pattern: "test" });
    expect(CountResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// search.find
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: search.find", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerFindTool(server as never);
    handler = server.tools.get("find")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = FindResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] find all files in a directory", async () => {
    mockFd("src/index.ts\nsrc/utils.ts\n");
    const { parsed } = await callAndValidate({ path: "src/" });
    expect(parsed.total).toBeGreaterThanOrEqual(0);
  });

  it("S2 [P0] find by pattern", async () => {
    mockFd("src/test.ts\nsrc/test-utils.ts\n");
    const { parsed } = await callAndValidate({ pattern: "test", path: "src/" });
    expect(parsed.total).toBeGreaterThanOrEqual(0);
  });

  it("S3 [P0] no matches", async () => {
    mockFd("", "", 1);
    const { parsed } = await callAndValidate({ pattern: "xyzzy_nonexistent" });
    expect(parsed.total).toBe(0);
  });

  it("S4 [P0] flag injection on pattern", async () => {
    await expect(callAndValidate({ pattern: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on path", async () => {
    await expect(callAndValidate({ pattern: "test", path: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on extension", async () => {
    await expect(callAndValidate({ extension: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on exclude", async () => {
    await expect(callAndValidate({ exclude: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on size", async () => {
    await expect(callAndValidate({ size: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on changedWithin", async () => {
    await expect(callAndValidate({ changedWithin: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P1] filter by extension", async () => {
    mockFd("src/index.ts\n");
    await callAndValidate({ extension: "ts", path: "src/" });
    const callArgs = vi.mocked(fdCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--extension");
    expect(callArgs[0]).toContain("ts");
  });

  it("S11 [P1] filter by type directory", async () => {
    mockFd("src/\nlib/\n");
    await callAndValidate({ type: "directory", path: "." });
    const callArgs = vi.mocked(fdCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--type");
    expect(callArgs[0]).toContain("d");
  });

  it("S12 [P1] exclude pattern", async () => {
    mockFd("src/index.ts\n");
    await callAndValidate({ exclude: "node_modules", path: "." });
    const callArgs = vi.mocked(fdCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--exclude");
    expect(callArgs[0]).toContain("node_modules");
  });

  it("S13 [P1] maxResults truncation", async () => {
    mockFd("a.ts\nb.ts\nc.ts\nd.ts\ne.ts\nf.ts\n");
    const { parsed } = await callAndValidate({ maxResults: 5, path: "." });
    expect(parsed.total).toBeLessThanOrEqual(5);
  });

  it("S14 [P1] absolutePath true", async () => {
    mockFd("/abs/path/file.ts\n");
    await callAndValidate({ absolutePath: true, path: "src/" });
    const callArgs = vi.mocked(fdCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--absolute-path");
  });

  it("S17 [P0] schema validation", async () => {
    mockFd("");
    const { parsed } = await callAndValidate({});
    expect(FindResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// search.jq
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: search.jq", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerJqTool(server as never);
    handler = server.tools.get("jq")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = JqResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] simple key extraction", async () => {
    mockJq('"test"\n');
    const { parsed } = await callAndValidate({
      expression: ".name",
      input: '{"name":"test"}',
    });
    expect(parsed.exitCode).toBe(0);
  });

  it("S2 [P0] identity filter on file", async () => {
    mockJq('{"a":1}\n');
    const { parsed } = await callAndValidate({ expression: ".", file: "data.json" });
    expect(parsed.exitCode).toBe(0);
  });

  it("S3 [P0] no input provided", async () => {
    // This returns an error through the handler itself, not jqCmd
    const { parsed } = await callAndValidate({ expression: "." });
    expect(parsed.exitCode).not.toBe(0);
  });

  it("S4 [P0] invalid jq expression", async () => {
    mockJq("", "jq: error: syntax error", 2);
    const { parsed } = await callAndValidate({ expression: ".[invalid", input: "{}" });
    expect(parsed.exitCode).not.toBe(0);
  });

  it("S5 [P0] invalid JSON input", async () => {
    mockJq("", "parse error: Invalid literal", 2);
    const { parsed } = await callAndValidate({ expression: ".", input: "not json" });
    expect(parsed.exitCode).not.toBe(0);
  });

  it("S6 [P0] flag injection on expression", async () => {
    await expect(callAndValidate({ expression: "--exec=evil", input: "{}" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on file", async () => {
    await expect(callAndValidate({ expression: ".", file: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P1] nullInput with generation", async () => {
    mockJq('{"key":"val"}\n');
    await callAndValidate({ expression: '{"key":"val"}', nullInput: true });
    const callArgs = vi.mocked(jqCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--null-input");
  });

  it("S9 [P1] rawOutput strips quotes", async () => {
    mockJq("test\n");
    await callAndValidate({
      expression: ".name",
      input: '{"name":"test"}',
      rawOutput: true,
    });
    const callArgs = vi.mocked(jqCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-r");
  });

  it("S10 [P1] slurp arrays", async () => {
    mockJq("[1,2,3]\n");
    await callAndValidate({ expression: ".", input: "1\n2\n3", slurp: true });
    const callArgs = vi.mocked(jqCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--slurp");
  });

  it("S11 [P1] arg named variables", async () => {
    mockJq('"hello"\n');
    await callAndValidate({
      expression: "$name",
      input: "{}",
      arg: { name: "hello" },
    });
    const callArgs = vi.mocked(jqCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--arg");
    expect(callArgs[0]).toContain("name");
    expect(callArgs[0]).toContain("hello");
  });

  it("S12 [P1] argjson named variables", async () => {
    mockJq("42\n");
    await callAndValidate({
      expression: "$val",
      input: "{}",
      argjson: { val: "42" },
    });
    const callArgs = vi.mocked(jqCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--argjson");
  });

  it("S15 [P0] schema validation", async () => {
    mockJq("null\n");
    const { parsed } = await callAndValidate({ expression: ".", input: "{}" });
    expect(JqResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// http.request
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: http.request", () => {
  let handler: ToolHandler;

  const CURL_OK =
    'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"ok":true}\n\n---PARE_META---\n0.100 100 0 0.010 0.020 0.030 0.040 0.050 1.1 0 https://httpbin.org/get https 0';

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRequestTool(server as never);
    handler = server.tools.get("request")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HttpResponseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] simple GET request", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://httpbin.org/get" });
    expect(parsed.status).toBe(200);
  });

  it("S2 [P0] POST with JSON body", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({
      url: "https://httpbin.org/post",
      method: "POST",
      body: '{"key":"val"}',
    });
    expect(parsed.status).toBe(200);
  });

  it("S3 [P0] non-existent host", async () => {
    mockCurl("", "curl: (6) Could not resolve host: nonexistent.invalid", 6);
    const { parsed } = await callAndValidate({ url: "https://nonexistent.invalid/" });
    expect(parsed.status).toBe(0);
  });

  it("S4 [P0] unsafe URL scheme file://", async () => {
    await expect(callAndValidate({ url: "file:///etc/passwd" })).rejects.toThrow(/[Uu]nsafe/);
  });

  it("S5 [P0] unsafe URL scheme ftp://", async () => {
    await expect(callAndValidate({ url: "ftp://evil.com/file" })).rejects.toThrow(/[Uu]nsafe/);
  });

  it("S6 [P0] empty URL", async () => {
    await expect(callAndValidate({ url: "" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on basicAuth", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", basicAuth: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection on proxy", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", proxy: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S9 [P0] flag injection on cookie", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", cookie: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection on resolve", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", resolve: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S11 [P0] flag injection on form values", async () => {
    await expect(
      callAndValidate({
        url: "https://example.com",
        method: "POST",
        form: { key: "--exec=evil" },
      }),
    ).rejects.toThrow();
  });

  it("S12 [P0] header injection (newline in value)", async () => {
    await expect(
      callAndValidate({
        url: "https://example.com",
        headers: { "X-Test": "val\r\nEvil: injected" },
      }),
    ).rejects.toThrow();
  });

  it("S13 [P1] PUT method", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({
      url: "https://httpbin.org/put",
      method: "PUT",
      body: '{"id":1}',
    });
    expect(parsed.status).toBe(200);
  });

  it("S14 [P1] DELETE method", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({
      url: "https://httpbin.org/delete",
      method: "DELETE",
    });
    expect(parsed.status).toBe(200);
  });

  it("S15 [P1] follow redirects default", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({ url: "https://httpbin.org/redirect/2" });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-L");
  });

  it("S16 [P1] disable redirect following", async () => {
    mockCurl(
      "HTTP/1.1 302 Found\r\nLocation: /other\r\n\r\n\n\n---PARE_META---\n0.050 0 0 0.010 0.020 0 0 0.050 1.1 0 https://httpbin.org/redirect/1 https 0",
    );
    await callAndValidate({
      url: "https://httpbin.org/redirect/1",
      followRedirects: false,
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).not.toContain("-L");
  });

  it("S17 [P1] custom headers", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/headers",
      headers: { "X-Custom": "test" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-H");
  });

  it("S18 [P1] timeout handling", async () => {
    mockCurl("", "curl: (28) Operation timed out", 28);
    const { parsed } = await callAndValidate({
      url: "https://httpbin.org/delay/10",
      timeout: 2,
    });
    expect(parsed.status).toBe(0);
  });

  it("S19 [P1] multipart form data", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/post",
      method: "POST",
      form: { field: "value" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-F");
  });

  it("S22 [P0] schema validation", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    expect(HttpResponseSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// http.get
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: http.get", () => {
  let handler: ToolHandler;

  const CURL_OK =
    'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"ok":true}\n\n---PARE_META---\n0.100 100 0 0.010 0.020 0.030 0.040 0.050 1.1 0 https://httpbin.org/get https 0';

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerHttpGetTool(server as never);
    handler = server.tools.get("get")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HttpResponseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] simple GET", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://httpbin.org/get" });
    expect(parsed.status).toBe(200);
  });

  it("S2 [P0] non-existent host", async () => {
    mockCurl("", "curl: (6) Could not resolve host", 6);
    const { parsed } = await callAndValidate({ url: "https://nonexistent.invalid/" });
    expect(parsed.status).toBe(0);
  });

  it("S3 [P0] unsafe URL scheme", async () => {
    await expect(callAndValidate({ url: "file:///etc/passwd" })).rejects.toThrow(/[Uu]nsafe/);
  });

  it("S4 [P0] flag injection on basicAuth", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", basicAuth: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection on proxy", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", proxy: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection on resolve", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", resolve: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P1] query params appended to URL", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/get",
      queryParams: { foo: "bar", baz: "qux" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    const urlArg = callArgs[0][callArgs[0].length - 1];
    expect(urlArg).toContain("foo=bar");
    expect(urlArg).toContain("baz=qux");
  });

  it("S8 [P1] query params with existing query string", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/get?a=1",
      queryParams: { b: "2" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    const urlArg = callArgs[0][callArgs[0].length - 1];
    expect(urlArg).toContain("a=1");
    expect(urlArg).toContain("b=2");
  });

  it("S9 [P1] custom headers", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/headers",
      headers: { Accept: "text/plain" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-H");
  });

  it("S11 [P0] schema validation", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    expect(HttpResponseSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// http.post
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: http.post", () => {
  let handler: ToolHandler;

  const CURL_OK =
    'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"ok":true}\n\n---PARE_META---\n0.100 100 50 0.010 0.020 0.030 0.040 0.050 1.1 0 https://httpbin.org/post https 0';

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPostTool(server as never);
    handler = server.tools.get("post")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HttpResponseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] POST with JSON body", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({
      url: "https://httpbin.org/post",
      body: '{"key":"val"}',
    });
    expect(parsed.status).toBe(200);
  });

  it("S2 [P0] POST with no body", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://httpbin.org/post" });
    expect(parsed.status).toBe(200);
  });

  it("S3 [P0] non-existent host", async () => {
    mockCurl("", "curl: (6) Could not resolve host", 6);
    const { parsed } = await callAndValidate({ url: "https://nonexistent.invalid/" });
    expect(parsed.status).toBe(0);
  });

  it("S4 [P0] unsafe URL scheme", async () => {
    await expect(callAndValidate({ url: "file:///etc/passwd" })).rejects.toThrow(/[Uu]nsafe/);
  });

  it("S5 [P0] flag injection on basicAuth", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", basicAuth: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection on proxy", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", proxy: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection on accept", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", accept: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection on dataUrlencode", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", dataUrlencode: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S9 [P0] flag injection on form values", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", form: { key: "--exec=evil" } }),
    ).rejects.toThrow();
  });

  it("S10 [P1] custom contentType", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/post",
      body: "<xml/>",
      contentType: "text/xml",
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    const headerArgs = callArgs[0].filter((arg: string, i: number) => callArgs[0][i - 1] === "-H");
    expect(headerArgs.some((h: string) => h.includes("text/xml"))).toBe(true);
  });

  it("S11 [P1] multipart form data", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/post",
      form: { field: "value" },
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-F");
  });

  it("S12 [P1] preserveMethodOnRedirect", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/redirect-to?url=/post",
      preserveMethodOnRedirect: true,
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--post301");
  });

  it("S13 [P1] URL-encoded form data", async () => {
    mockCurl(CURL_OK);
    await callAndValidate({
      url: "https://httpbin.org/post",
      dataUrlencode: ["key=value with spaces"],
    });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--data-urlencode");
  });

  it("S15 [P0] schema validation", async () => {
    mockCurl(CURL_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    expect(HttpResponseSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// http.head
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: http.head", () => {
  let handler: ToolHandler;

  const CURL_HEAD_OK =
    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 1234\r\n\r\n\n---PARE_META---\n0.050 0 0 0.010 0.020 0.030 0.040 0.050 1.1 0 https://example.com https 0";

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerHeadTool(server as never);
    handler = server.tools.get("head")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = HttpHeadResponseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] HEAD request returns headers", async () => {
    mockCurl(CURL_HEAD_OK);
    const { parsed } = await callAndValidate({ url: "https://httpbin.org/get" });
    expect(parsed.status).toBe(200);
  });

  it("S2 [P0] non-existent host", async () => {
    mockCurl("", "curl: (6) Could not resolve host", 6);
    const { parsed } = await callAndValidate({ url: "https://nonexistent.invalid/" });
    expect(parsed.status).toBe(0);
  });

  it("S3 [P0] unsafe URL scheme", async () => {
    await expect(callAndValidate({ url: "file:///etc/passwd" })).rejects.toThrow(/[Uu]nsafe/);
  });

  it("S4 [P0] flag injection on basicAuth", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", basicAuth: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection on proxy", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", proxy: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection on resolve", async () => {
    await expect(
      callAndValidate({ url: "https://example.com", resolve: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P1] content-length in response", async () => {
    mockCurl(CURL_HEAD_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    expect(parsed.contentLength).toBeDefined();
  });

  it("S8 [P1] follow redirects", async () => {
    mockCurl(CURL_HEAD_OK);
    await callAndValidate({ url: "https://httpbin.org/redirect/1" });
    const callArgs = vi.mocked(curlCmd).mock.calls[0];
    expect(callArgs[0]).toContain("-L");
  });

  it("S9 [P1] no body in response", async () => {
    mockCurl(CURL_HEAD_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    // HttpHeadResponseSchema does not have a body field
    expect(parsed).not.toHaveProperty("body");
  });

  it("S10 [P0] schema validation", async () => {
    mockCurl(CURL_HEAD_OK);
    const { parsed } = await callAndValidate({ url: "https://example.com" });
    expect(HttpHeadResponseSchema.safeParse(parsed).success).toBe(true);
  });
});
