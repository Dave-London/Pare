import { describe, it, expect } from "vitest";
import {
  compactGetMap,
  formatGetCompact,
  compactDescribeMap,
  formatDescribeCompact,
  compactLogsMap,
  formatLogsCompact,
  compactApplyMap,
  formatApplyCompact,
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

// ---------------------------------------------------------------------------
// compactGetMap
// ---------------------------------------------------------------------------

describe("compactGetMap", () => {
  it("keeps action, success, resource, namespace, total, names; drops items detail", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "pods",
      namespace: "default",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "web-abc123",
            namespace: "default",
            creationTimestamp: "2024-01-15T10:00:00Z",
          },
          status: { phase: "Running" },
        },
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "db-def456",
            namespace: "default",
            creationTimestamp: "2024-01-15T09:00:00Z",
          },
          status: { phase: "Running" },
        },
      ],
      total: 2,
      exitCode: 0,
    };

    const compact = compactGetMap(data);

    expect(compact.action).toBe("get");
    expect(compact.success).toBe(true);
    expect(compact.resource).toBe("pods");
    expect(compact.namespace).toBe("default");
    expect(compact.total).toBe(2);
    expect(compact.names).toEqual(["web-abc123", "db-def456"]);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("items");
    expect(compact).not.toHaveProperty("exitCode");
  });

  it("handles items with no metadata name", () => {
    const data: KubectlGetResult = {
      action: "get",
      success: true,
      resource: "nodes",
      items: [{ kind: "Node" }],
      total: 1,
      exitCode: 0,
    };

    const compact = compactGetMap(data);
    expect(compact.names).toEqual(["unknown"]);
  });
});

describe("formatGetCompact", () => {
  it("formats compact get output", () => {
    const compact = {
      action: "get" as const,
      success: true,
      resource: "pods",
      namespace: "kube-system",
      total: 5,
      names: ["coredns-abc", "etcd-xyz"],
    };
    const output = formatGetCompact(compact);
    expect(output).toContain("kubectl get pods");
    expect(output).toContain("-n kube-system");
    expect(output).toContain("5 item(s)");
  });

  it("formats failed get", () => {
    const compact = {
      action: "get" as const,
      success: false,
      resource: "pods",
      total: 0,
      names: [],
    };
    const output = formatGetCompact(compact);
    expect(output).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactDescribeMap
// ---------------------------------------------------------------------------

describe("compactDescribeMap", () => {
  it("keeps action, success, resource, name, namespace; drops output", () => {
    const data: KubectlDescribeResult = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "web-abc123",
      namespace: "default",
      output: "Name: web-abc123\nNamespace: default\nStatus: Running\n...",
      exitCode: 0,
    };

    const compact = compactDescribeMap(data);

    expect(compact.action).toBe("describe");
    expect(compact.success).toBe(true);
    expect(compact.resource).toBe("pod");
    expect(compact.name).toBe("web-abc123");
    expect(compact.namespace).toBe("default");
    // Verify dropped fields
    expect(compact).not.toHaveProperty("output");
    expect(compact).not.toHaveProperty("exitCode");
    expect(compact).not.toHaveProperty("error");
  });
});

describe("formatDescribeCompact", () => {
  it("formats compact describe output", () => {
    const compact = {
      action: "describe" as const,
      success: true,
      resource: "pod",
      name: "web-abc123",
      namespace: "default",
    };
    expect(formatDescribeCompact(compact)).toContain("kubectl describe pod web-abc123: success");
  });

  it("formats failed describe", () => {
    const compact = {
      action: "describe" as const,
      success: false,
      resource: "deployment",
      name: "nonexistent",
    };
    expect(formatDescribeCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactLogsMap
// ---------------------------------------------------------------------------

describe("compactLogsMap", () => {
  it("keeps action, success, pod, namespace, lineCount; drops logs content", () => {
    const data: KubectlLogsResult = {
      action: "logs",
      success: true,
      pod: "web-abc123",
      namespace: "default",
      container: "nginx",
      logs: "line 1\nline 2\nline 3\nline 4\nline 5",
      lineCount: 5,
      exitCode: 0,
    };

    const compact = compactLogsMap(data);

    expect(compact.action).toBe("logs");
    expect(compact.success).toBe(true);
    expect(compact.pod).toBe("web-abc123");
    expect(compact.namespace).toBe("default");
    expect(compact.lineCount).toBe(5);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("logs");
    expect(compact).not.toHaveProperty("container");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatLogsCompact", () => {
  it("formats compact logs output", () => {
    const compact = {
      action: "logs" as const,
      success: true,
      pod: "web-abc123",
      lineCount: 42,
    };
    expect(formatLogsCompact(compact)).toContain("kubectl logs web-abc123: 42 line(s)");
  });

  it("formats failed logs", () => {
    const compact = {
      action: "logs" as const,
      success: false,
      pod: "nonexistent",
      lineCount: 0,
    };
    expect(formatLogsCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactApplyMap
// ---------------------------------------------------------------------------

describe("compactApplyMap", () => {
  it("keeps action, success, exitCode; drops output and error", () => {
    const data: KubectlApplyResult = {
      action: "apply",
      success: true,
      output: "deployment.apps/nginx configured\nservice/nginx unchanged",
      exitCode: 0,
    };

    const compact = compactApplyMap(data);

    expect(compact.action).toBe("apply");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("output");
    expect(compact).not.toHaveProperty("error");
  });
});

describe("formatApplyCompact", () => {
  it("formats compact apply success", () => {
    const compact = { action: "apply" as const, success: true, exitCode: 0 };
    expect(formatApplyCompact(compact)).toBe("kubectl apply: success");
  });

  it("formats compact apply failure", () => {
    const compact = { action: "apply" as const, success: false, exitCode: 1 };
    expect(formatApplyCompact(compact)).toContain("failed");
    expect(formatApplyCompact(compact)).toContain("exit 1");
  });
});

// ---------------------------------------------------------------------------
// compactHelmListMap
// ---------------------------------------------------------------------------

describe("compactHelmListMap", () => {
  it("keeps action, success, namespace, total, names; drops releases detail", () => {
    const data: HelmListResult = {
      action: "list",
      success: true,
      namespace: "default",
      releases: [
        {
          name: "nginx",
          namespace: "default",
          revision: "3",
          status: "deployed",
          chart: "nginx-15.0.0",
          app_version: "1.25.0",
        },
        {
          name: "redis",
          namespace: "default",
          revision: "1",
          status: "deployed",
          chart: "redis-18.0.0",
          app_version: "7.2.0",
        },
      ],
      total: 2,
      exitCode: 0,
    };

    const compact = compactHelmListMap(data);

    expect(compact.action).toBe("list");
    expect(compact.success).toBe(true);
    expect(compact.namespace).toBe("default");
    expect(compact.total).toBe(2);
    expect(compact.names).toEqual(["nginx", "redis"]);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("releases");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatHelmListCompact", () => {
  it("formats compact helm list output", () => {
    const compact = {
      action: "list" as const,
      success: true,
      namespace: "production",
      total: 3,
      names: ["app", "db", "cache"],
    };
    const output = formatHelmListCompact(compact);
    expect(output).toContain("helm list");
    expect(output).toContain("-n production");
    expect(output).toContain("3 release(s)");
  });

  it("formats failed helm list", () => {
    const compact = {
      action: "list" as const,
      success: false,
      total: 0,
      names: [],
    };
    expect(formatHelmListCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmStatusMap
// ---------------------------------------------------------------------------

describe("compactHelmStatusMap", () => {
  it("keeps action, success, name, namespace, status, revision; drops description and notes", () => {
    const data: HelmStatusResult = {
      action: "status",
      success: true,
      name: "nginx",
      namespace: "default",
      revision: "3",
      status: "deployed",
      description: "Install complete",
      notes: "Get the application URL...",
      exitCode: 0,
    };

    const compact = compactHelmStatusMap(data);

    expect(compact.action).toBe("status");
    expect(compact.success).toBe(true);
    expect(compact.name).toBe("nginx");
    expect(compact.namespace).toBe("default");
    expect(compact.status).toBe("deployed");
    expect(compact.revision).toBe("3");
    // Verify dropped fields
    expect(compact).not.toHaveProperty("description");
    expect(compact).not.toHaveProperty("notes");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatHelmStatusCompact", () => {
  it("formats compact helm status output", () => {
    const compact = {
      action: "status" as const,
      success: true,
      name: "nginx",
      status: "deployed",
    };
    expect(formatHelmStatusCompact(compact)).toContain("helm status nginx: deployed");
  });

  it("formats failed helm status", () => {
    const compact = {
      action: "status" as const,
      success: false,
      name: "nonexistent",
    };
    expect(formatHelmStatusCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmInstallMap
// ---------------------------------------------------------------------------

describe("compactHelmInstallMap", () => {
  it("keeps action, success, name, namespace, status; drops revision and error", () => {
    const data: HelmInstallResult = {
      action: "install",
      success: true,
      name: "my-app",
      namespace: "staging",
      revision: "1",
      status: "deployed",
      exitCode: 0,
    };

    const compact = compactHelmInstallMap(data);

    expect(compact.action).toBe("install");
    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-app");
    expect(compact.namespace).toBe("staging");
    expect(compact.status).toBe("deployed");
    // Verify dropped fields
    expect(compact).not.toHaveProperty("revision");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatHelmInstallCompact", () => {
  it("formats compact helm install success", () => {
    const compact = {
      action: "install" as const,
      success: true,
      name: "my-app",
      status: "deployed",
    };
    expect(formatHelmInstallCompact(compact)).toContain("helm install my-app: deployed");
  });

  it("formats failed helm install", () => {
    const compact = {
      action: "install" as const,
      success: false,
      name: "my-app",
    };
    expect(formatHelmInstallCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmUpgradeMap
// ---------------------------------------------------------------------------

describe("compactHelmUpgradeMap", () => {
  it("keeps action, success, name, namespace, status; drops revision and error", () => {
    const data: HelmUpgradeResult = {
      action: "upgrade",
      success: true,
      name: "my-app",
      namespace: "production",
      revision: "5",
      status: "deployed",
      exitCode: 0,
    };

    const compact = compactHelmUpgradeMap(data);

    expect(compact.action).toBe("upgrade");
    expect(compact.success).toBe(true);
    expect(compact.name).toBe("my-app");
    expect(compact.namespace).toBe("production");
    expect(compact.status).toBe("deployed");
    // Verify dropped fields
    expect(compact).not.toHaveProperty("revision");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatHelmUpgradeCompact", () => {
  it("formats compact helm upgrade success", () => {
    const compact = {
      action: "upgrade" as const,
      success: true,
      name: "my-app",
      status: "deployed",
    };
    expect(formatHelmUpgradeCompact(compact)).toContain("helm upgrade my-app: deployed");
  });

  it("formats failed helm upgrade", () => {
    const compact = {
      action: "upgrade" as const,
      success: false,
      name: "my-app",
    };
    expect(formatHelmUpgradeCompact(compact)).toContain("failed");
  });
});
