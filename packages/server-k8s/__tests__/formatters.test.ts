import { describe, it, expect } from "vitest";
import {
  formatGet,
  formatDescribe,
  formatLogs,
  formatApply,
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
} from "../src/lib/formatters.js";
import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
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
  it("formats successful apply", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      output: "service/my-svc created",
      exitCode: 0,
    };
    const output = formatApply(data);
    expect(output).toContain("kubectl apply: success");
    expect(output).toContain("service/my-svc created");
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

  it("formats failed compact get", () => {
    expect(
      formatGetCompact({ action: "get", success: false, resource: "foos", total: 0, names: [] }),
    ).toBe("kubectl get foos: failed");
  });
});

describe("compactDescribeMap", () => {
  it("keeps resource and name, drops output", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "nginx-abc",
      namespace: "default",
      output: "very long describe output...",
      exitCode: 0,
    };

    const compact = compactDescribeMap(data);

    expect(compact.resource).toBe("pod");
    expect(compact.name).toBe("nginx-abc");
    expect(compact).not.toHaveProperty("output");
  });
});

describe("formatDescribeCompact", () => {
  it("formats success", () => {
    expect(
      formatDescribeCompact({ action: "describe", success: true, resource: "pod", name: "nginx" }),
    ).toBe("kubectl describe pod nginx: success");
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
});

describe("compactApplyMap", () => {
  it("keeps success and exit code, drops output", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      output: "service/my-svc created",
      exitCode: 0,
    };

    const compact = compactApplyMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact).not.toHaveProperty("output");
  });
});

describe("formatApplyCompact", () => {
  it("formats success", () => {
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

  it("formats failure", () => {
    expect(formatHelmUpgradeCompact({ action: "upgrade", success: false, name: "nginx" })).toBe(
      "helm upgrade nginx: failed",
    );
  });
});
