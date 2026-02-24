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
  KubectlGetResultInternal,
  KubectlDescribeResultInternal,
  KubectlLogsResultInternal,
  KubectlApplyResultInternal,
  HelmListResultInternal,
  HelmStatusResultInternal,
  HelmInstallResultInternal,
  HelmUpgradeResultInternal,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// compactGetMap
// ---------------------------------------------------------------------------

describe("compactGetMap", () => {
  it("keeps action, success; drops items, resource, namespace, total, names", () => {
    const data: KubectlGetResultInternal = {
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
    // Verify schema-only fields are present
    expect(compact.exitCode).toBe(0);
    // Verify Internal-only and detail fields are dropped
    expect(compact).not.toHaveProperty("resource");
    expect(compact).not.toHaveProperty("namespace");
    expect(compact).not.toHaveProperty("total");
    expect(compact).not.toHaveProperty("names");
    expect(compact).not.toHaveProperty("items");
  });
});

describe("formatGetCompact", () => {
  it("formats compact get success", () => {
    const compact = {
      action: "get" as const,
      success: true,
    };
    const output = formatGetCompact(compact);
    expect(output).toContain("kubectl get");
    expect(output).toContain("success");
  });

  it("formats failed get", () => {
    const compact = {
      action: "get" as const,
      success: false,
    };
    const output = formatGetCompact(compact);
    expect(output).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactDescribeMap
// ---------------------------------------------------------------------------

describe("compactDescribeMap", () => {
  it("keeps action, success, conditions, events; drops output, resource, name, namespace", () => {
    const data: KubectlDescribeResultInternal = {
      action: "describe",
      success: true,
      resource: "pod",
      name: "web-abc123",
      namespace: "default",
      output: "Name: web-abc123\nNamespace: default\nStatus: Running\n...",
      conditions: [
        { type: "Ready", status: "True" },
        { type: "Initialized", status: "True" },
      ],
      events: [
        { type: "Normal", reason: "Scheduled", age: "5m", from: "scheduler", message: "Assigned" },
      ],
      exitCode: 0,
    };

    const compact = compactDescribeMap(data);

    expect(compact.action).toBe("describe");
    expect(compact.success).toBe(true);
    expect(compact.conditions).toHaveLength(2);
    expect(compact.events).toHaveLength(1);
    // Verify Internal-only and detail fields are dropped
    expect(compact).not.toHaveProperty("resource");
    expect(compact).not.toHaveProperty("name");
    expect(compact).not.toHaveProperty("namespace");
    expect(compact).not.toHaveProperty("output");
  });
});

describe("formatDescribeCompact", () => {
  it("formats compact describe output", () => {
    const compact = {
      action: "describe" as const,
      success: true,
    };
    expect(formatDescribeCompact(compact)).toContain("kubectl describe: success");
  });

  it("formats compact describe with conditions and events", () => {
    const compact = {
      action: "describe" as const,
      success: true,
      conditions: [
        { type: "Ready", status: "True" },
        { type: "Initialized", status: "True" },
        { type: "PodScheduled", status: "True" },
        { type: "ContainersReady", status: "True" },
      ],
      events: [
        { type: "Normal", reason: "Scheduled", age: "5m", from: "scheduler", message: "Assigned" },
        { type: "Normal", reason: "Pulled", age: "4m", from: "kubelet", message: "Pulled" },
        { type: "Normal", reason: "Created", age: "4m", from: "kubelet", message: "Created" },
      ],
    };
    expect(formatDescribeCompact(compact)).toContain("4 condition(s)");
    expect(formatDescribeCompact(compact)).toContain("3 event(s)");
  });

  it("formats failed describe", () => {
    const compact = {
      action: "describe" as const,
      success: false,
    };
    expect(formatDescribeCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactLogsMap
// ---------------------------------------------------------------------------

describe("compactLogsMap", () => {
  it("keeps action, success, truncated; drops logs, pod, namespace, lineCount", () => {
    const data: KubectlLogsResultInternal = {
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
    // Verify Internal-only and detail fields are dropped
    expect(compact).not.toHaveProperty("pod");
    expect(compact).not.toHaveProperty("namespace");
    expect(compact).not.toHaveProperty("lineCount");
    expect(compact).not.toHaveProperty("logs");
    expect(compact).not.toHaveProperty("container");
  });
});

describe("formatLogsCompact", () => {
  it("formats compact logs output", () => {
    const compact = {
      action: "logs" as const,
      success: true,
    };
    expect(formatLogsCompact(compact)).toContain("kubectl logs: success");
  });

  it("formats failed logs", () => {
    const compact = {
      action: "logs" as const,
      success: false,
    };
    expect(formatLogsCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactApplyMap
// ---------------------------------------------------------------------------

describe("compactApplyMap", () => {
  it("keeps action, success, exitCode, resources; drops output and error", () => {
    const data: KubectlApplyResultInternal = {
      action: "apply",
      success: true,
      resources: [
        { kind: "deployment.apps", name: "nginx", operation: "configured" },
        { kind: "service", name: "nginx", operation: "unchanged" },
      ],
      output: "deployment.apps/nginx configured\nservice/nginx unchanged",
      exitCode: 0,
    };

    const compact = compactApplyMap(data);

    expect(compact.action).toBe("apply");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.resources).toHaveLength(2);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("output");
    expect(compact).not.toHaveProperty("error");
  });
});

describe("formatApplyCompact", () => {
  it("formats compact apply success with resources", () => {
    const compact = {
      action: "apply" as const,
      success: true,
      exitCode: 0,
      resources: [
        { kind: "svc", name: "a", operation: "created" as const },
        { kind: "deploy", name: "b", operation: "configured" as const },
        { kind: "cm", name: "c", operation: "unchanged" as const },
      ],
    };
    expect(formatApplyCompact(compact)).toBe("kubectl apply: 3 resource(s)");
  });

  it("formats compact apply success without resources", () => {
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
  it("keeps action, success; drops releases, namespace, total, names", () => {
    const data: HelmListResultInternal = {
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
    // Verify Internal-only and detail fields are dropped
    expect(compact).not.toHaveProperty("namespace");
    expect(compact).not.toHaveProperty("total");
    expect(compact).not.toHaveProperty("names");
    expect(compact).not.toHaveProperty("releases");
  });
});

describe("formatHelmListCompact", () => {
  it("formats compact helm list success", () => {
    const compact = {
      action: "list" as const,
      success: true,
    };
    const output = formatHelmListCompact(compact);
    expect(output).toContain("helm list");
    expect(output).toContain("success");
  });

  it("formats failed helm list", () => {
    const compact = {
      action: "list" as const,
      success: false,
    };
    expect(formatHelmListCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmStatusMap
// ---------------------------------------------------------------------------

describe("compactHelmStatusMap", () => {
  it("keeps action, success, status, revision, description; drops name, namespace, notes", () => {
    const data: HelmStatusResultInternal = {
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
    expect(compact.status).toBe("deployed");
    expect(compact.revision).toBe("3");
    expect(compact.description).toBe("Install complete");
    // Verify Internal-only fields are dropped
    expect(compact).not.toHaveProperty("name");
    expect(compact).not.toHaveProperty("namespace");
    expect(compact).not.toHaveProperty("notes");
  });
});

describe("formatHelmStatusCompact", () => {
  it("formats compact helm status output", () => {
    const compact = {
      action: "status" as const,
      success: true,
      status: "deployed",
    };
    expect(formatHelmStatusCompact(compact)).toContain("helm status: deployed");
  });

  it("formats failed helm status", () => {
    const compact = {
      action: "status" as const,
      success: false,
    };
    expect(formatHelmStatusCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmInstallMap
// ---------------------------------------------------------------------------

describe("compactHelmInstallMap", () => {
  it("keeps action, success, namespace, status; drops name, revision, exitCode", () => {
    const data: HelmInstallResultInternal = {
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
    expect(compact.namespace).toBe("staging");
    expect(compact.status).toBe("deployed");
    // Verify Internal-only fields are dropped
    expect(compact).not.toHaveProperty("name");
    expect(compact).not.toHaveProperty("revision");
  });
});

describe("formatHelmInstallCompact", () => {
  it("formats compact helm install success", () => {
    const compact = {
      action: "install" as const,
      success: true,
      status: "deployed",
    };
    expect(formatHelmInstallCompact(compact)).toContain("helm install: deployed");
  });

  it("formats failed helm install", () => {
    const compact = {
      action: "install" as const,
      success: false,
    };
    expect(formatHelmInstallCompact(compact)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// compactHelmUpgradeMap
// ---------------------------------------------------------------------------

describe("compactHelmUpgradeMap", () => {
  it("keeps action, success, namespace, status; drops name, revision, exitCode", () => {
    const data: HelmUpgradeResultInternal = {
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
    expect(compact.namespace).toBe("production");
    expect(compact.status).toBe("deployed");
    // Verify Internal-only fields are dropped
    expect(compact).not.toHaveProperty("name");
    expect(compact).not.toHaveProperty("revision");
  });
});

describe("formatHelmUpgradeCompact", () => {
  it("formats compact helm upgrade success", () => {
    const compact = {
      action: "upgrade" as const,
      success: true,
      status: "deployed",
    };
    expect(formatHelmUpgradeCompact(compact)).toContain("helm upgrade: deployed");
  });

  it("formats failed helm upgrade", () => {
    const compact = {
      action: "upgrade" as const,
      success: false,
    };
    expect(formatHelmUpgradeCompact(compact)).toContain("failed");
  });
});

// ── Gap #165 & #166: Helm history & template compact tests ──────────

import {
  compactHelmHistoryMap,
  formatHelmHistoryCompact,
  compactHelmTemplateMap,
  formatHelmTemplateCompact,
} from "../src/lib/formatters.js";
import type { HelmHistoryResultInternal, HelmTemplateResult } from "../src/schemas/index.js";

describe("compactHelmHistoryMap", () => {
  it("keeps action, success, namespace; drops name, total, revisions", () => {
    const data: HelmHistoryResultInternal = {
      action: "history",
      success: true,
      name: "my-release",
      namespace: "production",
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
        },
      ],
      total: 2,
      exitCode: 0,
    };

    const compact = compactHelmHistoryMap(data);

    expect(compact.action).toBe("history");
    expect(compact.success).toBe(true);
    expect(compact.namespace).toBe("production");
    // Verify Internal-only and detail fields are dropped
    expect(compact).not.toHaveProperty("name");
    expect(compact).not.toHaveProperty("total");
    expect(compact).not.toHaveProperty("revisions");
  });
});

describe("formatHelmHistoryCompact", () => {
  it("formats compact helm history output with namespace", () => {
    const compact = {
      action: "history" as const,
      success: true,
      namespace: "staging",
    };
    expect(formatHelmHistoryCompact(compact)).toBe("helm history -n staging: success");
  });

  it("formats compact helm history without namespace", () => {
    const compact = {
      action: "history" as const,
      success: true,
    };
    expect(formatHelmHistoryCompact(compact)).toBe("helm history: success");
  });

  it("formats failed helm history", () => {
    const compact = {
      action: "history" as const,
      success: false,
    };
    expect(formatHelmHistoryCompact(compact)).toBe("helm history: failed");
  });
});

describe("compactHelmTemplateMap", () => {
  it("keeps action, success, manifestCount; drops manifests content", () => {
    const data: HelmTemplateResult = {
      action: "template",
      success: true,
      manifests: "---\napiVersion: v1\nkind: Service\n---\napiVersion: apps/v1\nkind: Deployment",
      manifestCount: 2,
      exitCode: 0,
    };

    const compact = compactHelmTemplateMap(data);

    expect(compact.action).toBe("template");
    expect(compact.success).toBe(true);
    expect(compact.manifestCount).toBe(2);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("manifests");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatHelmTemplateCompact", () => {
  it("formats compact helm template output", () => {
    const compact = {
      action: "template" as const,
      success: true,
      manifestCount: 3,
    };
    expect(formatHelmTemplateCompact(compact)).toBe("helm template: 3 manifest(s)");
  });

  it("formats failed helm template", () => {
    const compact = {
      action: "template" as const,
      success: false,
      manifestCount: 0,
    };
    expect(formatHelmTemplateCompact(compact)).toBe("helm template: failed");
  });
});
