import { describe, it, expect } from "vitest";
import {
  formatGet,
  formatDescribe,
  formatLogs,
  formatApply,
  formatResult,
  formatHelmResult,
  formatHelmHistory,
  formatHelmTemplate,
  compactGetMap,
  formatGetCompact,
  compactDescribeMap,
  formatDescribeCompact,
  compactLogsMap,
  formatLogsCompact,
  compactApplyMap,
  formatApplyCompact,
  formatHelmList,
  formatHelmStatus,
  formatHelmInstall,
  formatHelmUpgrade,
  compactHelmListMap,
  formatHelmListCompact,
  compactHelmStatusMap,
  formatHelmStatusCompact,
  compactHelmInstallMap,
  formatHelmInstallCompact,
  compactHelmUpgradeMap,
  formatHelmUpgradeCompact,
  compactHelmHistoryMap,
  formatHelmHistoryCompact,
  compactHelmTemplateMap,
  formatHelmTemplateCompact,
} from "../src/lib/formatters.js";
import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  KubectlResult,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
  HelmHistoryResult,
  HelmTemplateResult,
  HelmResult,
} from "../src/schemas/index.js";
// ── Full formatters ──────────────────────────────────────────────────

describe("formatGet", () => {
  it("formats successful get with items", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      namespace: "default",
      items: [
        { kind: "Pod", metadata: { name: "nginx-abc" } },
        { kind: "Pod", metadata: { name: "redis-xyz" } },
      ],
      total: 2,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("kubectl get pods -n default: 2 item(s)");
    expect(output).toContain("Pod nginx-abc");
    expect(output).toContain("Pod redis-xyz");
  });

  it("formats failed get", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: false,
      resource: "foos",
      items: [],
      total: 0,
      exitCode: 1,
      error: "resource type not found",
    };
    const output = formatGet(data);
    expect(output).toContain("kubectl get foos: failed (exit 1)");
    expect(output).toContain("resource type not found");
  });

  it("formats get without namespace", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "nodes",
      items: [{ kind: "Node", metadata: { name: "node-1" } }],
      total: 1,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("kubectl get nodes: 1 item(s)");
    expect(output).not.toContain("-n");
  });
});

describe("formatDescribe", () => {
  it("returns full output on success", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx-abc",
      namespace: "default",
      output: "Name: nginx-abc\nNamespace: default",
      exitCode: 0,
    };
    expect(formatDescribe(data)).toBe("Name: nginx-abc\nNamespace: default");
  });

  it("includes conditions and events counts when present", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx-abc",
      namespace: "default",
      output: "Name: nginx-abc",
      conditions: [
        { type: "Ready", status: "True" },
        { type: "Initialized", status: "True" },
      ],
      events: [{ type: "Normal", reason: "Pulled", age: "5m", from: "kubelet", message: "Pulled" }],
      exitCode: 0,
    };
    const output = formatDescribe(data);
    expect(output).toContain("Conditions: 2 parsed");
    expect(output).toContain("Events: 1 parsed");
  });

  it("includes describe metadata and resource details summaries", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx-abc",
      namespace: "default",
      output: "Name: nginx-abc",
      labels: { app: "nginx" },
      annotations: { "prometheus.io/scrape": "true" },
      resourceDetails: {
        pod: {
          node: "node-1",
          ip: "10.0.0.5",
          qosClass: "Burstable",
          serviceAccount: "default",
          containers: ["nginx", "sidecar"],
        },
      },
      exitCode: 0,
    };

    const output = formatDescribe(data);
    expect(output).toContain("Labels: 1 parsed");
    expect(output).toContain("Annotations: 1 parsed");
    expect(output).toContain("Pod details:");
    expect(output).toContain("containers=2");
  });

  it("formats failure", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: false,
      resource: "pod",
      name: "missing",
      output: "",
      exitCode: 1,
      error: "not found",
    };
    const output = formatDescribe(data);
    expect(output).toContain("failed (exit 1)");
    expect(output).toContain("not found");
  });
});

describe("formatLogs", () => {
  it("formats logs with content", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: true,
      pod: "nginx-abc",
      logs: "line 1\nline 2",
      lineCount: 2,
      exitCode: 0,
    };
    const output = formatLogs(data);
    expect(output).toContain("kubectl logs nginx-abc: 2 line(s)");
    expect(output).toContain("line 1\nline 2");
  });

  it("formats empty logs", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: true,
      pod: "empty-pod",
      logs: "",
      lineCount: 0,
      exitCode: 0,
    };
    expect(formatLogs(data)).toBe("kubectl logs empty-pod: 0 line(s)");
  });

  it("formats logs with truncation and parsed entry count", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: true,
      pod: "json-pod",
      logs: '{"msg":"ok"}',
      lineCount: 1,
      truncated: true,
      logEntries: [{ raw: '{"msg":"ok"}', json: { msg: "ok" } }],
      exitCode: 0,
    };
    const output = formatLogs(data);
    expect(output).toContain("kubectl logs json-pod: 1 line(s) [truncated] (1 parsed entries)");
  });

  it("formats failed logs", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: false,
      pod: "missing-pod",
      logs: "",
      lineCount: 0,
      exitCode: 1,
      error: "pod not found",
    };
    const output = formatLogs(data);
    expect(output).toContain("failed (exit 1)");
    expect(output).toContain("pod not found");
  });
});

describe("formatApply", () => {
  it("formats successful apply with resources", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      resources: [
        { kind: "service", name: "my-svc", operation: "created" },
        { kind: "deployment.apps", name: "my-app", operation: "configured" },
      ],
      output: "service/my-svc created\ndeployment.apps/my-app configured",
      exitCode: 0,
    };
    const output = formatApply(data);
    expect(output).toContain("kubectl apply: 2 resource(s)");
    expect(output).toContain("service/my-svc created");
    expect(output).toContain("deployment.apps/my-app configured");
  });

  it("formats successful apply without resources", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      output: "some output",
      exitCode: 0,
    };
    const output = formatApply(data);
    expect(output).toContain("kubectl apply: success");
    expect(output).toContain("some output");
  });

  it("formats failed apply", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: false,
      output: "error details",
      exitCode: 1,
      error: "validation error",
    };
    const output = formatApply(data);
    expect(output).toContain("kubectl apply: failed (exit 1)");
    expect(output).toContain("validation error");
  });
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactGetMap", () => {
  it("keeps summary, drops full item details", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      namespace: "default",
      items: [
        {
          kind: "Pod",
          metadata: { name: "nginx-abc" },
          status: { phase: "Running" },
          spec: { containers: [] },
        },
        {
          kind: "Pod",
          metadata: { name: "redis-xyz" },
          status: { phase: "Pending" },
          spec: { containers: [] },
        },
      ],
      total: 2,
      exitCode: 0,
    };

    const compact = compactGetMap(data);

    expect(compact.action).toBe("get");
    expect(compact.success).toBe(true);
    expect(compact.total).toBe(2);
    expect(compact.names).toEqual(["nginx-abc", "redis-xyz"]);
    expect(compact).not.toHaveProperty("items");
  });
});

describe("formatGetCompact", () => {
  it("formats successful compact get", () => {
    expect(
      formatGetCompact({
        action: "get",
        success: true,
        resource: "pods",
        namespace: "default",
        total: 3,
        names: [],
      }),
    ).toBe("kubectl get pods -n default: 3 item(s)");
  });

  it("formats successful compact get without namespace", () => {
    expect(
      formatGetCompact({
        action: "get",
        success: true,
        resource: "nodes",
        total: 2,
        names: [],
      }),
    ).toBe("kubectl get nodes: 2 item(s)");
  });

  it("formats failed compact get", () => {
    expect(
      formatGetCompact({ action: "get", success: false, resource: "foos", total: 0, names: [] }),
    ).toBe("kubectl get foos: failed");
  });
});

describe("compactDescribeMap", () => {
  it("keeps resource, name, conditions, events; drops output", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx-abc",
      namespace: "default",
      output: "very long describe output...",
      conditions: [{ type: "Ready", status: "True" }],
      events: [
        { type: "Normal", reason: "Scheduled", age: "5m", from: "scheduler", message: "Assigned" },
      ],
      exitCode: 0,
    };

    const compact = compactDescribeMap(data);

    expect(compact.resource).toBe("pod");
    expect(compact.name).toBe("nginx-abc");
    expect(compact.conditions).toHaveLength(1);
    expect(compact.events).toHaveLength(1);
    expect(compact).not.toHaveProperty("output");
  });

  it("returns undefined conditions/events when absent", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "test",
      output: "Name: test",
      exitCode: 0,
    };

    const compact = compactDescribeMap(data);
    expect(compact.conditions).toBeUndefined();
    expect(compact.events).toBeUndefined();
  });
});

describe("formatDescribeCompact", () => {
  it("formats success", () => {
    expect(
      formatDescribeCompact({
        action: "describe",
        success: true,
        resource: "pod",
        name: "nginx",
      }),
    ).toBe("kubectl describe pod nginx: success");
  });

  it("formats success with conditions and events", () => {
    expect(
      formatDescribeCompact({
        action: "describe",
        success: true,
        resource: "pod",
        name: "nginx",
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Initialized", status: "True" },
          { type: "PodScheduled", status: "True" },
        ],
        events: [
          {
            type: "Normal",
            reason: "Scheduled",
            age: "5m",
            from: "scheduler",
            message: "Assigned",
          },
          { type: "Normal", reason: "Pulled", age: "4m", from: "kubelet", message: "Pulled" },
        ],
      }),
    ).toBe("kubectl describe pod nginx: success, 3 condition(s), 2 event(s)");
  });

  it("formats failure", () => {
    expect(
      formatDescribeCompact({
        action: "describe",
        success: false,
        resource: "pod",
        name: "missing",
      }),
    ).toBe("kubectl describe pod missing: failed");
  });
});

describe("compactLogsMap", () => {
  it("keeps line count, drops log content", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: true,
      pod: "nginx-abc",
      namespace: "default",
      logs: "line 1\nline 2\nline 3",
      lineCount: 3,
      exitCode: 0,
    };

    const compact = compactLogsMap(data);

    expect(compact.pod).toBe("nginx-abc");
    expect(compact.lineCount).toBe(3);
    expect(compact).not.toHaveProperty("logs");
  });
});

describe("formatLogsCompact", () => {
  it("formats success with line count", () => {
    expect(formatLogsCompact({ action: "logs", success: true, pod: "nginx", lineCount: 42 })).toBe(
      "kubectl logs nginx: 42 line(s)",
    );
  });

  it("formats failure", () => {
    expect(
      formatLogsCompact({ action: "logs", success: false, pod: "missing", lineCount: 0 }),
    ).toBe("kubectl logs missing: failed");
  });

  it("formats compact logs with truncation and parsed entries", () => {
    expect(
      formatLogsCompact({
        action: "logs",
        success: true,
        pod: "json-pod",
        lineCount: 10,
        truncated: true,
        parsedEntries: 10,
      }),
    ).toBe("kubectl logs json-pod: 10 line(s) [truncated] (10 parsed entries)");
  });
});

describe("compactApplyMap", () => {
  it("keeps success, exit code, and resources; drops output", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      resources: [
        { kind: "service", name: "my-svc", operation: "created" },
        { kind: "deployment.apps", name: "my-app", operation: "configured" },
      ],
      output: "service/my-svc created\ndeployment.apps/my-app configured",
      exitCode: 0,
    };

    const compact = compactApplyMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.resources).toHaveLength(2);
    expect(compact).not.toHaveProperty("output");
  });

  it("returns undefined resources when no resources parsed", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      output: "some output",
      exitCode: 0,
    };

    const compact = compactApplyMap(data);
    expect(compact.resources).toBeUndefined();
  });
});

describe("formatApplyCompact", () => {
  it("formats success with resources", () => {
    expect(
      formatApplyCompact({
        action: "apply",
        success: true,
        exitCode: 0,
        resources: [
          { kind: "svc", name: "a", operation: "created" },
          { kind: "deploy", name: "b", operation: "configured" },
          { kind: "cm", name: "c", operation: "unchanged" },
        ],
      }),
    ).toBe("kubectl apply: 3 resource(s)");
  });

  it("formats success without resources", () => {
    expect(formatApplyCompact({ action: "apply", success: true, exitCode: 0 })).toBe(
      "kubectl apply: success",
    );
  });

  it("formats failure", () => {
    expect(formatApplyCompact({ action: "apply", success: false, exitCode: 1 })).toBe(
      "kubectl apply: failed (exit 1)",
    );
  });
});

// ── Helm formatters ─────────────────────────────────────────────────

describe("formatHelmList", () => {
  it("formats successful list with releases", () => {
    const data: HelmListResult = {
      action: "list",
      success: true,
      namespace: "default",
      releases: [
        {
          name: "nginx",
          namespace: "default",
          revision: "1",
          status: "deployed",
          chart: "nginx-1.0.0",
        },
        {
          name: "redis",
          namespace: "default",
          revision: "2",
          status: "deployed",
          chart: "redis-17.0.0",
        },
      ],
      total: 2,
      exitCode: 0,
    };
    const output = formatHelmList(data);
    expect(output).toContain("helm list -n default: 2 release(s)");
    expect(output).toContain("nginx (nginx-1.0.0) - deployed");
    expect(output).toContain("redis (redis-17.0.0) - deployed");
  });

  it("formats successful list without namespace", () => {
    const data: HelmListResult = {
      action: "list",
      success: true,
      releases: [
        {
          name: "nginx",
          namespace: "default",
          revision: "1",
          status: "deployed",
          chart: "nginx-1.0.0",
        },
      ],
      total: 1,
      exitCode: 0,
    };
    const output = formatHelmList(data);
    expect(output).toContain("helm list: 1 release(s)");
    expect(output).not.toContain("-n");
  });

  it("formats failed list", () => {
    const data: HelmListResult = {
      action: "list",
      success: false,
      releases: [],
      total: 0,
      exitCode: 1,
      error: "connection refused",
    };
    const output = formatHelmList(data);
    expect(output).toContain("helm list: failed (exit 1)");
    expect(output).toContain("connection refused");
  });
});

describe("formatHelmStatus", () => {
  it("formats successful status", () => {
    const data: HelmStatusResult = {
      action: "status",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "2",
      status: "deployed",
      description: "Upgrade complete",
      exitCode: 0,
    };
    const output = formatHelmStatus(data);
    expect(output).toContain("helm status my-release: deployed");
    expect(output).toContain("revision: 2");
    expect(output).toContain("description: Upgrade complete");
  });

  it("formats status without optional fields", () => {
    const data: HelmStatusResult = {
      action: "status",
      success: true,
      name: "my-release",
      exitCode: 0,
    };
    const output = formatHelmStatus(data);
    expect(output).toContain("helm status my-release: unknown");
    expect(output).not.toContain("revision:");
    expect(output).not.toContain("description:");
    expect(output).not.toContain("notes:");
  });

  it("formats failed status", () => {
    const data: HelmStatusResult = {
      action: "status",
      success: false,
      name: "missing",
      exitCode: 1,
      error: "not found",
    };
    const output = formatHelmStatus(data);
    expect(output).toContain("helm status missing: failed (exit 1)");
    expect(output).toContain("not found");
  });
});

describe("formatHelmInstall", () => {
  it("formats successful install", () => {
    const data: HelmInstallResult = {
      action: "install",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "1",
      status: "deployed",
      exitCode: 0,
    };
    const output = formatHelmInstall(data);
    expect(output).toContain("helm install my-release: deployed");
    expect(output).toContain("(revision 1)");
  });

  it("formats install with chart and appVersion", () => {
    const data: HelmInstallResult = {
      action: "install",
      success: true,
      name: "my-release",
      revision: "1",
      status: "deployed",
      chart: "nginx-18.1.0",
      appVersion: "1.27.0",
      exitCode: 0,
    };
    const output = formatHelmInstall(data);
    expect(output).toContain("chart=nginx-18.1.0");
    expect(output).toContain("appVersion=1.27.0");
  });

  it("formats failed install", () => {
    const data: HelmInstallResult = {
      action: "install",
      success: false,
      name: "my-release",
      exitCode: 1,
      error: "name already in use",
    };
    const output = formatHelmInstall(data);
    expect(output).toContain("helm install my-release: failed (exit 1)");
    expect(output).toContain("name already in use");
  });
});

describe("formatHelmUpgrade", () => {
  it("formats successful upgrade", () => {
    const data: HelmUpgradeResult = {
      action: "upgrade",
      success: true,
      name: "my-release",
      revision: "3",
      status: "deployed",
      exitCode: 0,
    };
    const output = formatHelmUpgrade(data);
    expect(output).toContain("helm upgrade my-release: deployed");
    expect(output).toContain("(revision 3)");
  });

  it("formats upgrade with chart and appVersion", () => {
    const data: HelmUpgradeResult = {
      action: "upgrade",
      success: true,
      name: "my-release",
      revision: "3",
      status: "deployed",
      chart: "nginx-18.2.0",
      appVersion: "1.27.1",
      exitCode: 0,
    };
    const output = formatHelmUpgrade(data);
    expect(output).toContain("chart=nginx-18.2.0");
    expect(output).toContain("appVersion=1.27.1");
  });

  it("formats failed upgrade", () => {
    const data: HelmUpgradeResult = {
      action: "upgrade",
      success: false,
      name: "missing",
      exitCode: 1,
      error: "UPGRADE FAILED",
    };
    const output = formatHelmUpgrade(data);
    expect(output).toContain("helm upgrade missing: failed (exit 1)");
  });
});

// ── Helm compact mappers and formatters ─────────────────────────────

describe("compactHelmListMap", () => {
  it("handles undefined releases with fallback", () => {
    const data: HelmListResult = {
      action: "list",
      success: true,
      total: 0,
      exitCode: 0,
    } as HelmListResult;

    const compact = compactHelmListMap(data);

    expect(compact.names).toEqual([]);
    expect(compact.total).toBe(0);
  });

  it("keeps names, drops full release details", () => {
    const data: HelmListResult = {
      action: "list",
      success: true,
      namespace: "default",
      releases: [
        {
          name: "nginx",
          namespace: "default",
          revision: "1",
          status: "deployed",
          chart: "nginx-1.0.0",
        },
        {
          name: "redis",
          namespace: "default",
          revision: "2",
          status: "deployed",
          chart: "redis-17.0.0",
        },
      ],
      total: 2,
      exitCode: 0,
    };

    const compact = compactHelmListMap(data);

    expect(compact.action).toBe("list");
    expect(compact.success).toBe(true);
    expect(compact.total).toBe(2);
    expect(compact.names).toEqual(["nginx", "redis"]);
    expect(compact).not.toHaveProperty("releases");
  });
});

describe("formatHelmListCompact", () => {
  it("formats successful compact list", () => {
    expect(
      formatHelmListCompact({
        action: "list",
        success: true,
        namespace: "prod",
        total: 5,
        names: [],
      }),
    ).toBe("helm list -n prod: 5 release(s)");
  });

  it("formats successful compact list without namespace", () => {
    expect(
      formatHelmListCompact({
        action: "list",
        success: true,
        total: 3,
        names: [],
      }),
    ).toBe("helm list: 3 release(s)");
  });

  it("formats failed compact list", () => {
    expect(formatHelmListCompact({ action: "list", success: false, total: 0, names: [] })).toBe(
      "helm list: failed",
    );
  });
});

describe("compactHelmStatusMap", () => {
  it("keeps key fields, drops notes and description", () => {
    const data: HelmStatusResult = {
      action: "status",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "2",
      status: "deployed",
      description: "Upgrade complete",
      notes: "Very long notes...",
      exitCode: 0,
    };

    const compact = compactHelmStatusMap(data);

    expect(compact.name).toBe("my-release");
    expect(compact.status).toBe("deployed");
    expect(compact.revision).toBe("2");
    expect(compact).not.toHaveProperty("notes");
    expect(compact).not.toHaveProperty("description");
  });
});

describe("formatHelmStatusCompact", () => {
  it("formats success", () => {
    expect(
      formatHelmStatusCompact({
        action: "status",
        success: true,
        name: "nginx",
        status: "deployed",
      }),
    ).toBe("helm status nginx: deployed");
  });

  it("formats success without status field", () => {
    expect(
      formatHelmStatusCompact({
        action: "status",
        success: true,
        name: "nginx",
      }),
    ).toBe("helm status nginx: unknown");
  });

  it("formats failure", () => {
    expect(formatHelmStatusCompact({ action: "status", success: false, name: "missing" })).toBe(
      "helm status missing: failed",
    );
  });
});

describe("compactHelmInstallMap", () => {
  it("keeps success and status, drops revision", () => {
    const data: HelmInstallResult = {
      action: "install",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "1",
      status: "deployed",
      exitCode: 0,
    };

    const compact = compactHelmInstallMap(data);

    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-release");
    expect(compact.status).toBe("deployed");
    expect(compact).not.toHaveProperty("revision");
  });
});

describe("formatHelmInstallCompact", () => {
  it("formats success", () => {
    expect(
      formatHelmInstallCompact({
        action: "install",
        success: true,
        name: "nginx",
        status: "deployed",
      }),
    ).toBe("helm install nginx: deployed");
  });

  it("formats success without status field", () => {
    expect(
      formatHelmInstallCompact({
        action: "install",
        success: true,
        name: "nginx",
      }),
    ).toBe("helm install nginx: success");
  });

  it("formats failure", () => {
    expect(formatHelmInstallCompact({ action: "install", success: false, name: "nginx" })).toBe(
      "helm install nginx: failed",
    );
  });
});

describe("compactHelmUpgradeMap", () => {
  it("keeps success and status", () => {
    const data: HelmUpgradeResult = {
      action: "upgrade",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "3",
      status: "deployed",
      exitCode: 0,
    };

    const compact = compactHelmUpgradeMap(data);

    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-release");
    expect(compact.status).toBe("deployed");
    expect(compact).not.toHaveProperty("revision");
  });
});

describe("formatHelmUpgradeCompact", () => {
  it("formats success", () => {
    expect(
      formatHelmUpgradeCompact({
        action: "upgrade",
        success: true,
        name: "nginx",
        status: "deployed",
      }),
    ).toBe("helm upgrade nginx: deployed");
  });

  it("formats success without status field", () => {
    expect(
      formatHelmUpgradeCompact({
        action: "upgrade",
        success: true,
        name: "nginx",
      }),
    ).toBe("helm upgrade nginx: success");
  });

  it("formats failure", () => {
    expect(formatHelmUpgradeCompact({ action: "upgrade", success: false, name: "nginx" })).toBe(
      "helm upgrade nginx: failed",
    );
  });
});

// ── Dispatch formatters ─────────────────────────────────────────────

describe("formatResult", () => {
  it("dispatches get action", () => {
    const data: KubectlResult = {
      action: "get",
      success: true,
      resource: "pods",
      namespace: "default",
      items: [],
      total: 0,
    };
    expect(formatResult(data)).toContain("kubectl get pods");
  });

  it("dispatches describe action", () => {
    const data: KubectlResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx",
      namespace: "default",
      output: "Name: nginx",
    };
    expect(formatResult(data)).toBe("Name: nginx");
  });

  it("dispatches logs action", () => {
    const data: KubectlResult = {
      action: "logs",
      success: true,
      pod: "nginx",
      lines: [],
      total: 0,
    };
    expect(formatResult(data)).toContain("kubectl logs nginx");
  });

  it("dispatches apply action", () => {
    const data: KubectlResult = {
      action: "apply",
      success: true,
      exitCode: 0,
      output: "configured",
    };
    expect(formatResult(data)).toContain("kubectl apply");
  });
});

describe("formatHelmResult", () => {
  it("dispatches list action", () => {
    const data: HelmResult = { action: "list", success: true, releases: [] };
    expect(formatHelmResult(data)).toContain("helm list");
  });

  it("dispatches status action", () => {
    const data: HelmResult = {
      action: "status",
      success: true,
      name: "nginx",
      status: "deployed",
      namespace: "default",
    };
    expect(formatHelmResult(data)).toContain("helm status nginx");
  });

  it("dispatches install action", () => {
    const data: HelmResult = {
      action: "install",
      success: true,
      name: "nginx",
      status: "deployed",
    };
    expect(formatHelmResult(data)).toContain("helm install nginx");
  });

  it("dispatches upgrade action", () => {
    const data: HelmResult = {
      action: "upgrade",
      success: true,
      name: "nginx",
      status: "deployed",
    };
    expect(formatHelmResult(data)).toContain("helm upgrade nginx");
  });
});

// ── Helm uninstall/rollback formatter tests ─────────────────────────

import {
  formatHelmUninstall,
  formatHelmRollback,
  compactHelmUninstallMap,
  compactHelmRollbackMap,
  formatHelmUninstallCompact,
  formatHelmRollbackCompact,
} from "../src/lib/formatters.js";
import type { HelmUninstallResult, HelmRollbackResult } from "../src/schemas/index.js";

describe("formatHelmUninstall", () => {
  it("formats successful uninstall", () => {
    const data: HelmUninstallResult = {
      action: "uninstall",
      success: true,
      name: "my-release",
      namespace: "default",
      status: "uninstalled",
      exitCode: 0,
    };
    expect(formatHelmUninstall(data)).toBe("helm uninstall my-release: uninstalled");
  });

  it("formats failed uninstall", () => {
    const data: HelmUninstallResult = {
      action: "uninstall",
      success: false,
      name: "my-release",
      exitCode: 1,
      error: "release not found",
    };
    const output = formatHelmUninstall(data);
    expect(output).toContain("helm uninstall my-release: failed");
    expect(output).toContain("release not found");
  });
});

describe("formatHelmRollback", () => {
  it("formats successful rollback", () => {
    const data: HelmRollbackResult = {
      action: "rollback",
      success: true,
      name: "my-release",
      namespace: "default",
      revision: "2",
      status: "success",
      exitCode: 0,
    };
    expect(formatHelmRollback(data)).toBe("helm rollback my-release to revision 2: success");
  });

  it("formats rollback without revision", () => {
    const data: HelmRollbackResult = {
      action: "rollback",
      success: true,
      name: "my-release",
      status: "success",
      exitCode: 0,
    };
    expect(formatHelmRollback(data)).toBe("helm rollback my-release: success");
  });

  it("formats failed rollback", () => {
    const data: HelmRollbackResult = {
      action: "rollback",
      success: false,
      name: "my-release",
      exitCode: 1,
      error: "release not found",
    };
    const output = formatHelmRollback(data);
    expect(output).toContain("helm rollback my-release: failed");
  });
});

describe("compactHelmUninstallMap", () => {
  it("maps uninstall result to compact form", () => {
    const data: HelmUninstallResult = {
      action: "uninstall",
      success: true,
      name: "my-release",
      namespace: "default",
      status: "uninstalled",
      exitCode: 0,
    };
    const compact = compactHelmUninstallMap(data);
    expect(compact.action).toBe("uninstall");
    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-release");
  });
});

describe("compactHelmRollbackMap", () => {
  it("maps rollback result to compact form", () => {
    const data: HelmRollbackResult = {
      action: "rollback",
      success: true,
      name: "my-release",
      revision: "2",
      status: "success",
      exitCode: 0,
    };
    const compact = compactHelmRollbackMap(data);
    expect(compact.action).toBe("rollback");
    expect(compact.revision).toBe("2");
  });
});

describe("formatHelmUninstallCompact", () => {
  it("formats compact success", () => {
    expect(
      formatHelmUninstallCompact({
        action: "uninstall",
        success: true,
        name: "my-release",
        status: "uninstalled",
      }),
    ).toBe("helm uninstall my-release: uninstalled");
  });

  it("formats compact failure", () => {
    expect(
      formatHelmUninstallCompact({
        action: "uninstall",
        success: false,
        name: "my-release",
      }),
    ).toBe("helm uninstall my-release: failed");
  });
});

describe("formatHelmRollbackCompact", () => {
  it("formats compact success with revision", () => {
    expect(
      formatHelmRollbackCompact({
        action: "rollback",
        success: true,
        name: "my-release",
        revision: "3",
        status: "success",
      }),
    ).toBe("helm rollback my-release to revision 3: success");
  });

  it("formats compact failure", () => {
    expect(
      formatHelmRollbackCompact({
        action: "rollback",
        success: false,
        name: "my-release",
      }),
    ).toBe("helm rollback my-release: failed");
  });
});

// ── Gap #164: Expanded metadata in formatGet ────────────────────────

describe("formatGet with expanded metadata", () => {
  it("formats resource with uid and resourceVersion", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      namespace: "default",
      items: [
        {
          kind: "Pod",
          metadata: {
            name: "nginx-abc",
            uid: "abc-123",
            resourceVersion: "456",
          },
        },
      ],
      total: 1,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("Pod nginx-abc");
    expect(output).toContain("uid: abc-123");
    expect(output).toContain("rv: 456");
  });

  it("formats resource with annotations count", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      items: [
        {
          kind: "Pod",
          metadata: {
            name: "annotated-pod",
            annotations: { key1: "val1", key2: "val2" },
          },
        },
      ],
      total: 1,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("annotations: 2 key(s)");
  });

  it("formats resource with ownerReferences", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      items: [
        {
          kind: "Pod",
          metadata: {
            name: "owned-pod",
            ownerReferences: [
              { apiVersion: "apps/v1", kind: "ReplicaSet", name: "web-rs", uid: "123" },
            ],
          },
        },
      ],
      total: 1,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("owner: ReplicaSet/web-rs");
  });

  it("formats resource with finalizers", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "namespaces",
      items: [
        {
          kind: "Namespace",
          metadata: {
            name: "my-ns",
            finalizers: ["kubernetes", "custom-finalizer"],
          },
        },
      ],
      total: 1,
      exitCode: 0,
    };
    const output = formatGet(data);
    expect(output).toContain("finalizers: kubernetes, custom-finalizer");
  });
});

// ── Gap #165: Helm history formatters ───────────────────────────────

describe("formatHelmHistory", () => {
  it("formats successful history", () => {
    const data: HelmHistoryResult = {
      action: "history",
      success: true,
      name: "my-release",
      namespace: "default",
      revisions: [
        {
          revision: 1,
          updated: "2026-01-01T00:00:00Z",
          status: "superseded",
          chart: "nginx-1.0.0",
          appVersion: "1.25.0",
          description: "Install complete",
        },
        {
          revision: 2,
          updated: "2026-01-02T00:00:00Z",
          status: "deployed",
          chart: "nginx-1.1.0",
          appVersion: "1.25.1",
          description: "Upgrade complete",
        },
      ],
      total: 2,
      exitCode: 0,
    };
    const output = formatHelmHistory(data);
    expect(output).toContain("helm history my-release -n default: 2 revision(s)");
    expect(output).toContain("1: nginx-1.0.0 (v1.25.0) superseded - Install complete");
    expect(output).toContain("2: nginx-1.1.0 (v1.25.1) deployed - Upgrade complete");
  });

  it("formats failed history", () => {
    const data: HelmHistoryResult = {
      action: "history",
      success: false,
      name: "missing",
      total: 0,
      exitCode: 1,
      error: "release not found",
    };
    const output = formatHelmHistory(data);
    expect(output).toContain("helm history missing: failed");
    expect(output).toContain("release not found");
  });
});

describe("compactHelmHistoryMap", () => {
  it("maps history result to compact form", () => {
    const data: HelmHistoryResult = {
      action: "history",
      success: true,
      name: "my-release",
      namespace: "default",
      revisions: [{ revision: 1, updated: "2026-01-01", status: "deployed", chart: "nginx-1.0.0" }],
      total: 1,
      exitCode: 0,
    };
    const compact = compactHelmHistoryMap(data);
    expect(compact.action).toBe("history");
    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-release");
    expect(compact.total).toBe(1);
    expect(compact).not.toHaveProperty("revisions");
  });
});

describe("formatHelmHistoryCompact", () => {
  it("formats compact success", () => {
    expect(
      formatHelmHistoryCompact({
        action: "history",
        success: true,
        name: "my-release",
        namespace: "default",
        total: 3,
      }),
    ).toBe("helm history my-release -n default: 3 revision(s)");
  });

  it("formats compact failure", () => {
    expect(
      formatHelmHistoryCompact({
        action: "history",
        success: false,
        name: "missing",
        total: 0,
      }),
    ).toBe("helm history missing: failed");
  });
});

// ── Gap #166: Helm template formatters ──────────────────────────────

describe("formatHelmTemplate", () => {
  it("formats successful template with manifests", () => {
    const data: HelmTemplateResult = {
      action: "template",
      success: true,
      manifests: "---\napiVersion: v1\nkind: Service\n---\napiVersion: apps/v1\nkind: Deployment",
      manifestCount: 2,
      exitCode: 0,
    };
    const output = formatHelmTemplate(data);
    expect(output).toContain("helm template: 2 manifest(s)");
    expect(output).toContain("Service");
    expect(output).toContain("Deployment");
  });

  it("formats failed template", () => {
    const data: HelmTemplateResult = {
      action: "template",
      success: false,
      manifestCount: 0,
      exitCode: 1,
      error: "chart not found",
    };
    const output = formatHelmTemplate(data);
    expect(output).toContain("helm template: failed");
    expect(output).toContain("chart not found");
  });
});

describe("compactHelmTemplateMap", () => {
  it("maps template result to compact form", () => {
    const data: HelmTemplateResult = {
      action: "template",
      success: true,
      manifests: "---\nkind: Service\n---\nkind: Deployment",
      manifestCount: 2,
      exitCode: 0,
    };
    const compact = compactHelmTemplateMap(data);
    expect(compact.action).toBe("template");
    expect(compact.success).toBe(true);
    expect(compact.manifestCount).toBe(2);
    expect(compact).not.toHaveProperty("manifests");
  });
});

describe("formatHelmTemplateCompact", () => {
  it("formats compact success", () => {
    expect(
      formatHelmTemplateCompact({
        action: "template",
        success: true,
        manifestCount: 5,
      }),
    ).toBe("helm template: 5 manifest(s)");
  });

  it("formats compact failure", () => {
    expect(
      formatHelmTemplateCompact({
        action: "template",
        success: false,
        manifestCount: 0,
      }),
    ).toBe("helm template: failed");
  });
});

// ── Updated formatHelmResult dispatch ───────────────────────────────

describe("formatHelmResult dispatches new actions", () => {
  it("dispatches history action", () => {
    const data: HelmResult = {
      action: "history",
      success: true,
      name: "my-release",
      revisions: [],
      total: 0,
    };
    expect(formatHelmResult(data)).toContain("helm history my-release");
  });

  it("dispatches template action", () => {
    const data: HelmResult = {
      action: "template",
      success: true,
      manifests: "---\nkind: Pod",
      manifestCount: 1,
    };
    expect(formatHelmResult(data)).toContain("helm template");
  });
});
