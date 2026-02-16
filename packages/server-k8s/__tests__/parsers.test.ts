import { describe, it, expect } from "vitest";
import {
  parseGetOutput,
  parseDescribeOutput,
  parseLogsOutput,
  parseApplyOutput,
  parseHelmListOutput,
  parseHelmStatusOutput,
  parseHelmInstallOutput,
  parseHelmUpgradeOutput,
} from "../src/lib/parsers.js";

describe("parseGetOutput", () => {
  it("parses a list of resources from kubectl get -o json", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "nginx-abc",
            namespace: "default",
            creationTimestamp: "2026-01-01T00:00:00Z",
          },
          status: { phase: "Running" },
          spec: { containers: [{ name: "nginx" }] },
        },
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "redis-xyz",
            namespace: "default",
            creationTimestamp: "2026-01-02T00:00:00Z",
          },
          status: { phase: "Pending" },
          spec: { containers: [{ name: "redis" }] },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "default");

    expect(result.action).toBe("get");
    expect(result.success).toBe(true);
    expect(result.resource).toBe("pods");
    expect(result.namespace).toBe("default");
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].kind).toBe("Pod");
    expect(result.items[0].metadata?.name).toBe("nginx-abc");
    expect(result.items[1].metadata?.name).toBe("redis-xyz");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("parses a single resource", () => {
    const stdout = JSON.stringify({
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "nginx-abc", namespace: "default" },
      status: { phase: "Running" },
    });

    const result = parseGetOutput(stdout, "", 0, "pod", "default");

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.items[0].kind).toBe("Pod");
    expect(result.items[0].metadata?.name).toBe("nginx-abc");
  });

  it("handles empty list", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [],
    });

    const result = parseGetOutput(stdout, "", 0, "pods");

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("handles failure with stderr", () => {
    const result = parseGetOutput(
      "",
      'error: the server doesn\'t have a resource type "foos"',
      1,
      "foos",
    );

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("doesn't have a resource type");
  });

  it("handles invalid JSON output", () => {
    const result = parseGetOutput("not-json{", "", 0, "pods");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse kubectl JSON output");
  });

  it("preserves namespace as undefined when not provided", () => {
    const stdout = JSON.stringify({ kind: "List", apiVersion: "v1", items: [] });
    const result = parseGetOutput(stdout, "", 0, "pods");

    expect(result.namespace).toBeUndefined();
  });

  it("extracts resource with labels", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "labeled-pod",
            namespace: "default",
            labels: { app: "web", tier: "frontend" },
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "default");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.labels).toEqual({ app: "web", tier: "frontend" });
  });

  it("extracts resource without metadata, status, or spec", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [{ someField: "value" }],
    });

    const result = parseGetOutput(stdout, "", 0, "custom");

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.items[0].metadata).toBeUndefined();
    expect(result.items[0].status).toBeUndefined();
    expect(result.items[0].spec).toBeUndefined();
  });

  it("handles failure with empty stderr", () => {
    const result = parseGetOutput("", "", 1, "pods");

    expect(result.success).toBe(false);
    expect(result.error).toBeUndefined();
  });
});

describe("parseDescribeOutput", () => {
  it("parses successful describe output", () => {
    const stdout = "Name:         nginx-abc\nNamespace:    default\nNode:         node-1\n";

    const result = parseDescribeOutput(stdout, "", 0, "pod", "nginx-abc", "default");

    expect(result.action).toBe("describe");
    expect(result.success).toBe(true);
    expect(result.resource).toBe("pod");
    expect(result.name).toBe("nginx-abc");
    expect(result.namespace).toBe("default");
    expect(result.output).toContain("Name:         nginx-abc");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles describe failure", () => {
    const result = parseDescribeOutput(
      "",
      'Error from server (NotFound): pods "missing" not found',
      1,
      "pod",
      "missing",
      "default",
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("NotFound");
  });

  it("trims trailing whitespace from output", () => {
    const result = parseDescribeOutput("Name: test\n\n  \n", "", 0, "svc", "test");

    expect(result.output).toBe("Name: test");
  });
});

describe("parseLogsOutput", () => {
  it("parses successful log output", () => {
    const stdout = "2026-01-01 INFO Starting\n2026-01-01 INFO Ready\n2026-01-01 INFO Serving\n";

    const result = parseLogsOutput(stdout, "", 0, "nginx-abc", "default", "nginx");

    expect(result.action).toBe("logs");
    expect(result.success).toBe(true);
    expect(result.pod).toBe("nginx-abc");
    expect(result.namespace).toBe("default");
    expect(result.container).toBe("nginx");
    expect(result.lineCount).toBe(3);
    expect(result.logs).toContain("Starting");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles empty logs", () => {
    const result = parseLogsOutput("", "", 0, "empty-pod");

    expect(result.success).toBe(true);
    expect(result.lineCount).toBe(0);
    expect(result.logs).toBe("");
  });

  it("handles logs failure", () => {
    const result = parseLogsOutput("", "Error from server: pod not found", 1, "missing-pod");

    expect(result.success).toBe(false);
    expect(result.error).toContain("pod not found");
  });

  it("leaves container undefined when not provided", () => {
    const result = parseLogsOutput("log line\n", "", 0, "my-pod");

    expect(result.container).toBeUndefined();
  });
});

describe("parseApplyOutput", () => {
  it("parses successful apply output", () => {
    const stdout = '{"apiVersion":"v1","kind":"Service","metadata":{"name":"my-svc"}}';

    const result = parseApplyOutput(stdout, "", 0);

    expect(result.action).toBe("apply");
    expect(result.success).toBe(true);
    expect(result.output).toContain("my-svc");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles apply failure", () => {
    const result = parseApplyOutput("", "error: no objects passed to apply", 1);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("no objects passed to apply");
    expect(result.output).toContain("no objects passed to apply");
  });

  it("trims trailing whitespace", () => {
    const result = parseApplyOutput("service/my-svc created\n\n", "", 0);

    expect(result.output).toBe("service/my-svc created");
  });
});

// ── Helm parsers ────────────────────────────────────────────────────

describe("parseHelmListOutput", () => {
  it("parses a list of releases from helm list -o json", () => {
    const stdout = JSON.stringify([
      {
        name: "my-release",
        namespace: "default",
        revision: "1",
        status: "deployed",
        chart: "nginx-1.0.0",
        app_version: "1.25.0",
      },
      {
        name: "redis",
        namespace: "default",
        revision: "3",
        status: "deployed",
        chart: "redis-17.0.0",
        app_version: "7.0.0",
      },
    ]);

    const result = parseHelmListOutput(stdout, "", 0, "default");

    expect(result.action).toBe("list");
    expect(result.success).toBe(true);
    expect(result.namespace).toBe("default");
    expect(result.total).toBe(2);
    expect(result.releases).toHaveLength(2);
    expect(result.releases[0].name).toBe("my-release");
    expect(result.releases[0].chart).toBe("nginx-1.0.0");
    expect(result.releases[1].name).toBe("redis");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles empty release list", () => {
    const result = parseHelmListOutput("[]", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.releases).toEqual([]);
  });

  it("handles failure with stderr", () => {
    const result = parseHelmListOutput("", "Error: connection refused", 1, "default");

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.releases).toEqual([]);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("connection refused");
  });

  it("handles invalid JSON output", () => {
    const result = parseHelmListOutput("not-json{", "", 0);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse helm JSON output");
  });

  it("preserves namespace as undefined when not provided", () => {
    const result = parseHelmListOutput("[]", "", 0);
    expect(result.namespace).toBeUndefined();
  });

  it("handles release with null app_version", () => {
    const stdout = JSON.stringify([
      {
        name: "my-release",
        namespace: "default",
        revision: "1",
        status: "deployed",
        chart: "nginx-1.0.0",
        app_version: null,
      },
    ]);

    const result = parseHelmListOutput(stdout, "", 0, "default");

    expect(result.success).toBe(true);
    expect(result.releases[0].app_version).toBeUndefined();
  });
});

describe("parseHelmStatusOutput", () => {
  it("parses successful status output", () => {
    const stdout = JSON.stringify({
      name: "my-release",
      namespace: "default",
      version: 2,
      info: {
        status: "deployed",
        description: "Upgrade complete",
        notes: "Visit http://localhost:8080",
      },
    });

    const result = parseHelmStatusOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("status");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.revision).toBe("2");
    expect(result.status).toBe("deployed");
    expect(result.description).toBe("Upgrade complete");
    expect(result.notes).toBe("Visit http://localhost:8080");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles status failure", () => {
    const result = parseHelmStatusOutput("", "Error: release: not found", 1, "missing", "default");

    expect(result.success).toBe(false);
    expect(result.name).toBe("missing");
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("not found");
  });

  it("handles invalid JSON", () => {
    const result = parseHelmStatusOutput("bad json", "", 0, "test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse helm JSON output");
  });
});

describe("parseHelmInstallOutput", () => {
  it("parses successful install output", () => {
    const stdout = JSON.stringify({
      name: "my-release",
      namespace: "default",
      version: 1,
      info: {
        status: "deployed",
      },
    });

    const result = parseHelmInstallOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("install");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.revision).toBe("1");
    expect(result.status).toBe("deployed");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles install failure", () => {
    const result = parseHelmInstallOutput(
      "",
      "Error: cannot re-use a name that is still in use",
      1,
      "my-release",
      "default",
    );

    expect(result.success).toBe(false);
    expect(result.name).toBe("my-release");
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("cannot re-use a name");
  });

  it("handles invalid JSON", () => {
    const result = parseHelmInstallOutput("not json", "", 0, "test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse helm JSON output");
  });
});

describe("parseHelmUpgradeOutput", () => {
  it("parses successful upgrade output", () => {
    const stdout = JSON.stringify({
      name: "my-release",
      namespace: "default",
      version: 3,
      info: {
        status: "deployed",
      },
    });

    const result = parseHelmUpgradeOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("upgrade");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.revision).toBe("3");
    expect(result.status).toBe("deployed");
    expect(result.exitCode).toBe(0);
  });

  it("handles upgrade failure", () => {
    const result = parseHelmUpgradeOutput(
      "",
      "Error: UPGRADE FAILED: release not found",
      1,
      "missing",
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("UPGRADE FAILED");
  });

  it("handles invalid JSON", () => {
    const result = parseHelmUpgradeOutput("not json", "", 0, "test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse helm JSON output");
  });
});
