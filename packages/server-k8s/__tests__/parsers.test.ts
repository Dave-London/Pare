import { describe, it, expect } from "vitest";
import {
  parseGetOutput,
  parseDescribeOutput,
  parseDescribeConditions,
  parseDescribeEvents,
  parseLogsOutput,
  parseApplyOutput,
  parseApplyLine,
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

  // ── Gap #164: Expanded metadata fields ────────────────────────────

  it("extracts annotations from resource metadata", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "annotated-pod",
            namespace: "default",
            annotations: {
              "kubectl.kubernetes.io/last-applied-configuration": "{}",
              "prometheus.io/scrape": "true",
            },
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "default");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.annotations).toEqual({
      "kubectl.kubernetes.io/last-applied-configuration": "{}",
      "prometheus.io/scrape": "true",
    });
  });

  it("extracts ownerReferences from resource metadata", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "owned-pod",
            namespace: "default",
            ownerReferences: [
              {
                apiVersion: "apps/v1",
                kind: "ReplicaSet",
                name: "nginx-rs-abc123",
                uid: "12345-abcde",
                controller: true,
                blockOwnerDeletion: true,
              },
            ],
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "default");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.ownerReferences).toHaveLength(1);
    expect(result.items[0].metadata?.ownerReferences![0]).toEqual({
      apiVersion: "apps/v1",
      kind: "ReplicaSet",
      name: "nginx-rs-abc123",
      uid: "12345-abcde",
    });
  });

  it("extracts finalizers from resource metadata", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Namespace",
          metadata: {
            name: "my-ns",
            finalizers: ["kubernetes"],
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "namespaces");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.finalizers).toEqual(["kubernetes"]);
  });

  it("extracts resourceVersion and uid from resource metadata", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "my-pod",
            namespace: "default",
            resourceVersion: "12345",
            uid: "abc-def-ghi-jkl",
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "default");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.resourceVersion).toBe("12345");
    expect(result.items[0].metadata?.uid).toBe("abc-def-ghi-jkl");
  });

  it("skips invalid ownerReferences entries", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "my-pod",
            ownerReferences: [
              { kind: "ReplicaSet" }, // missing apiVersion, name, uid
              {
                apiVersion: "apps/v1",
                kind: "ReplicaSet",
                name: "valid-rs",
                uid: "valid-uid",
              },
            ],
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.ownerReferences).toHaveLength(1);
    expect(result.items[0].metadata?.ownerReferences![0].name).toBe("valid-rs");
  });

  it("omits empty ownerReferences and finalizers arrays", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "my-pod",
            ownerReferences: [],
            finalizers: [],
          },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods");

    expect(result.success).toBe(true);
    expect(result.items[0].metadata?.ownerReferences).toBeUndefined();
    expect(result.items[0].metadata?.finalizers).toBeUndefined();
  });

  it("extracts all expanded metadata fields together", () => {
    const stdout = JSON.stringify({
      kind: "List",
      apiVersion: "v1",
      items: [
        {
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "full-pod",
            namespace: "production",
            creationTimestamp: "2026-01-15T12:00:00Z",
            labels: { app: "web" },
            annotations: { note: "test" },
            ownerReferences: [
              {
                apiVersion: "apps/v1",
                kind: "ReplicaSet",
                name: "web-rs",
                uid: "owner-uid-123",
              },
            ],
            finalizers: ["kubernetes.io/pv-protection"],
            resourceVersion: "67890",
            uid: "pod-uid-456",
          },
          status: { phase: "Running" },
        },
      ],
    });

    const result = parseGetOutput(stdout, "", 0, "pods", "production");

    expect(result.success).toBe(true);
    const meta = result.items[0].metadata!;
    expect(meta.name).toBe("full-pod");
    expect(meta.namespace).toBe("production");
    expect(meta.annotations).toEqual({ note: "test" });
    expect(meta.ownerReferences).toHaveLength(1);
    expect(meta.ownerReferences![0].kind).toBe("ReplicaSet");
    expect(meta.finalizers).toEqual(["kubernetes.io/pv-protection"]);
    expect(meta.resourceVersion).toBe("67890");
    expect(meta.uid).toBe("pod-uid-456");
  });
});

describe("parseDescribeConditions", () => {
  it("parses basic conditions table with Type and Status columns", () => {
    const output = [
      "Name:         nginx-abc",
      "Conditions:",
      "  Type              Status",
      "  Initialized       True",
      "  Ready             True",
      "  ContainersReady   True",
      "  PodScheduled      True",
    ].join("\n");

    const conditions = parseDescribeConditions(output);

    expect(conditions).toHaveLength(4);
    expect(conditions[0]).toEqual({ type: "Initialized", status: "True" });
    expect(conditions[1]).toEqual({ type: "Ready", status: "True" });
    expect(conditions[2]).toEqual({ type: "ContainersReady", status: "True" });
    expect(conditions[3]).toEqual({ type: "PodScheduled", status: "True" });
  });

  it("parses conditions with separator line", () => {
    const output = [
      "Conditions:",
      "  Type              Status",
      "  ----              ------",
      "  Initialized       True",
      "  Ready             False",
    ].join("\n");

    const conditions = parseDescribeConditions(output);

    expect(conditions).toHaveLength(2);
    expect(conditions[0]).toEqual({ type: "Initialized", status: "True" });
    expect(conditions[1]).toEqual({ type: "Ready", status: "False" });
  });

  it("parses conditions with Reason and Message columns", () => {
    const output = [
      "Conditions:",
      "  Type              Status  Reason             Message",
      "  ----              ------  ------             -------",
      "  Initialized       True    PodInitialized     Pod initialized",
      "  Ready             False   ContainersNotReady Containers not ready",
    ].join("\n");

    const conditions = parseDescribeConditions(output);

    expect(conditions).toHaveLength(2);
    expect(conditions[0]).toEqual({
      type: "Initialized",
      status: "True",
      reason: "PodInitialized",
      message: "Pod initialized",
    });
    expect(conditions[1]).toEqual({
      type: "Ready",
      status: "False",
      reason: "ContainersNotReady",
      message: "Containers not ready",
    });
  });

  it("returns empty array when no Conditions section exists", () => {
    const output = "Name: test\nNamespace: default\nStatus: Running\n";
    expect(parseDescribeConditions(output)).toEqual([]);
  });

  it("handles conditions section followed by other sections", () => {
    const output = [
      "Conditions:",
      "  Type              Status",
      "  Ready             True",
      "Volumes:",
      "  default-token:",
    ].join("\n");

    const conditions = parseDescribeConditions(output);

    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toEqual({ type: "Ready", status: "True" });
  });
});

describe("parseDescribeEvents", () => {
  it("parses events with standard columns", () => {
    const output = [
      "Name: test",
      "Events:",
      "  Type     Reason     Age   From               Message",
      "  ----     ------     ---   ----               -------",
      "  Normal   Scheduled  10m   default-scheduler  Successfully assigned default/nginx to node-1",
      '  Normal   Pulled     10m   kubelet            Container image "nginx:latest" already present',
      "  Warning  Unhealthy  5m    kubelet            Readiness probe failed",
    ].join("\n");

    const events = parseDescribeEvents(output);

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({
      type: "Normal",
      reason: "Scheduled",
      age: "10m",
      from: "default-scheduler",
      message: "Successfully assigned default/nginx to node-1",
    });
    expect(events[1]).toEqual({
      type: "Normal",
      reason: "Pulled",
      age: "10m",
      from: "kubelet",
      message: 'Container image "nginx:latest" already present',
    });
    expect(events[2]).toEqual({
      type: "Warning",
      reason: "Unhealthy",
      age: "5m",
      from: "kubelet",
      message: "Readiness probe failed",
    });
  });

  it("returns empty array when Events section has <none>", () => {
    const output = "Events:\n  <none>\n";
    expect(parseDescribeEvents(output)).toEqual([]);
  });

  it("returns empty array when no Events section exists", () => {
    const output = "Name: test\nNamespace: default\n";
    expect(parseDescribeEvents(output)).toEqual([]);
  });

  it("parses events without separator line", () => {
    const output = [
      "Events:",
      "  Type     Reason    Age   From      Message",
      "  Normal   Created   2m    kubelet   Created container nginx",
    ].join("\n");

    const events = parseDescribeEvents(output);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "Normal",
      reason: "Created",
      age: "2m",
      from: "kubelet",
      message: "Created container nginx",
    });
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
    expect(result.conditions).toBeUndefined();
    expect(result.events).toBeUndefined();
  });

  it("trims trailing whitespace from output", () => {
    const result = parseDescribeOutput("Name: test\n\n  \n", "", 0, "svc", "test");

    expect(result.output).toBe("Name: test");
  });

  it("extracts conditions and events from describe output", () => {
    const stdout = [
      "Name:         nginx-abc",
      "Namespace:    default",
      "Conditions:",
      "  Type              Status",
      "  Initialized       True",
      "  Ready             True",
      "Events:",
      "  Type     Reason     Age   From               Message",
      "  ----     ------     ---   ----               -------",
      "  Normal   Scheduled  10m   default-scheduler  Successfully assigned",
    ].join("\n");

    const result = parseDescribeOutput(stdout, "", 0, "pod", "nginx-abc", "default");

    expect(result.success).toBe(true);
    expect(result.conditions).toHaveLength(2);
    expect(result.conditions![0].type).toBe("Initialized");
    expect(result.events).toHaveLength(1);
    expect(result.events![0].reason).toBe("Scheduled");
  });

  it("returns undefined conditions/events when sections are absent", () => {
    const stdout = "Name: test\nNamespace: default\nStatus: Running\n";
    const result = parseDescribeOutput(stdout, "", 0, "pod", "test", "default");

    expect(result.success).toBe(true);
    expect(result.conditions).toBeUndefined();
    expect(result.events).toBeUndefined();
  });

  it("extracts labels, annotations, and pod-specific details", () => {
    const stdout = [
      "Name:               nginx-abc",
      "Namespace:          default",
      "Labels:             app=nginx",
      "                    tier=frontend",
      "Annotations:        checksum/config: abc123",
      "                    prometheus.io/scrape: true",
      "Node:               node-1/10.0.0.1",
      "IP:                 10.244.0.12",
      "Service Account:    default",
      "QoS Class:          Burstable",
      "Containers:",
      "  nginx:",
      "    Image: nginx:latest",
      "  sidecar:",
      "    Image: busybox:latest",
    ].join("\n");

    const result = parseDescribeOutput(stdout, "", 0, "pod", "nginx-abc", "default");

    expect(result.labels).toEqual({ app: "nginx", tier: "frontend" });
    expect(result.annotations).toEqual({
      "checksum/config": "abc123",
      "prometheus.io/scrape": "true",
    });
    expect(result.resourceDetails?.pod?.node).toBe("node-1/10.0.0.1");
    expect(result.resourceDetails?.pod?.ip).toBe("10.244.0.12");
    expect(result.resourceDetails?.pod?.serviceAccount).toBe("default");
    expect(result.resourceDetails?.pod?.qosClass).toBe("Burstable");
    expect(result.resourceDetails?.pod?.containers).toEqual(["nginx", "sidecar"]);
  });

  it("extracts service details", () => {
    const stdout = [
      "Name:              my-service",
      "Namespace:         default",
      "Type:              ClusterIP",
      "IP:                10.96.0.10",
      "Port:              http  80/TCP",
      "TargetPort:        8080/TCP",
      "Port:              metrics  9090/TCP",
      "TargetPort:        9090/TCP",
    ].join("\n");

    const result = parseDescribeOutput(stdout, "", 0, "service", "my-service", "default");

    expect(result.resourceDetails?.service?.type).toBe("ClusterIP");
    expect(result.resourceDetails?.service?.clusterIP).toBe("10.96.0.10");
    expect(result.resourceDetails?.service?.ports).toHaveLength(2);
    expect(result.resourceDetails?.service?.ports?.[0]).toEqual({
      name: "http",
      port: "80",
      protocol: "TCP",
      targetPort: "8080/TCP",
    });
  });

  it("extracts deployment details", () => {
    const stdout = [
      "Name:                   web",
      "Namespace:              default",
      "StrategyType:           RollingUpdate",
      "Replicas:               3 desired | 3 updated | 3 total | 2 available | 1 unavailable",
    ].join("\n");

    const result = parseDescribeOutput(stdout, "", 0, "deployment", "web", "default");

    expect(result.resourceDetails?.deployment?.strategy).toBe("RollingUpdate");
    expect(result.resourceDetails?.deployment?.replicas).toEqual({
      desired: 3,
      updated: 3,
      total: 3,
      available: 2,
      unavailable: 1,
    });
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

  it("sets truncated=true when tail limit likely truncated output", () => {
    const stdout = ["line-1", "line-2", "line-3"].join("\n");
    const result = parseLogsOutput(stdout, "", 0, "my-pod", "default", undefined, 3);

    expect(result.truncated).toBe(true);
  });

  it("parses JSON logs when enabled", () => {
    const stdout = ['{"level":"info","msg":"ready"}', "not-json"].join("\n");
    const result = parseLogsOutput(
      stdout,
      "",
      0,
      "my-pod",
      "default",
      undefined,
      undefined,
      undefined,
      true,
    );

    expect(result.logEntries).toHaveLength(2);
    expect(result.logEntries?.[0].json).toEqual({ level: "info", msg: "ready" });
    expect(result.logEntries?.[1].json).toBeUndefined();
  });
});

describe("parseApplyLine", () => {
  it("parses a created resource", () => {
    const result = parseApplyLine("deployment.apps/my-app created");
    expect(result).toEqual({ kind: "deployment.apps", name: "my-app", operation: "created" });
  });

  it("parses a configured resource", () => {
    const result = parseApplyLine("service/my-service configured");
    expect(result).toEqual({ kind: "service", name: "my-service", operation: "configured" });
  });

  it("parses an unchanged resource", () => {
    const result = parseApplyLine("configmap/my-config unchanged");
    expect(result).toEqual({ kind: "configmap", name: "my-config", operation: "unchanged" });
  });

  it("parses a deleted resource", () => {
    const result = parseApplyLine("pod/old-pod deleted");
    expect(result).toEqual({ kind: "pod", name: "old-pod", operation: "deleted" });
  });

  it("parses a line with dry-run annotation", () => {
    const result = parseApplyLine("namespace/my-ns created (server-side dry run)");
    expect(result).toEqual({ kind: "namespace", name: "my-ns", operation: "created" });
  });

  it("returns null for non-resource lines", () => {
    expect(parseApplyLine("Warning: some warning")).toBeNull();
    expect(parseApplyLine("")).toBeNull();
    expect(parseApplyLine("some random text")).toBeNull();
  });
});

describe("parseApplyOutput", () => {
  it("parses successful apply output with resources", () => {
    const stdout = [
      "deployment.apps/my-app configured",
      "service/my-service unchanged",
      "configmap/my-config created",
    ].join("\n");

    const result = parseApplyOutput(stdout, "", 0);

    expect(result.action).toBe("apply");
    expect(result.success).toBe(true);
    expect(result.resources).toHaveLength(3);
    expect(result.resources![0]).toEqual({
      kind: "deployment.apps",
      name: "my-app",
      operation: "configured",
    });
    expect(result.resources![1]).toEqual({
      kind: "service",
      name: "my-service",
      operation: "unchanged",
    });
    expect(result.resources![2]).toEqual({
      kind: "configmap",
      name: "my-config",
      operation: "created",
    });
    expect(result.output).toContain("my-app");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles apply failure", () => {
    const result = parseApplyOutput("", "error: no objects passed to apply", 1);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("no objects passed to apply");
    expect(result.output).toContain("no objects passed to apply");
    expect(result.resources).toBeUndefined();
  });

  it("trims trailing whitespace", () => {
    const result = parseApplyOutput("service/my-svc created\n\n", "", 0);

    expect(result.output).toBe("service/my-svc created");
    expect(result.resources).toHaveLength(1);
  });

  it("handles output with non-resource lines mixed in", () => {
    const stdout = [
      "Warning: resource namespaces/default is missing",
      "service/my-svc created",
      "deployment.apps/my-app configured",
    ].join("\n");

    const result = parseApplyOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.resources).toHaveLength(2);
    expect(result.resources![0].name).toBe("my-svc");
    expect(result.resources![1].name).toBe("my-app");
  });

  it("returns undefined resources when stdout has no parseable lines", () => {
    const result = parseApplyOutput("some non-standard output", "", 0);

    expect(result.success).toBe(true);
    expect(result.resources).toBeUndefined();
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
      chart: {
        metadata: {
          name: "nginx",
          version: "18.1.0",
          appVersion: "1.27.0",
        },
      },
    });

    const result = parseHelmInstallOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("install");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.revision).toBe("1");
    expect(result.status).toBe("deployed");
    expect(result.chart).toBe("nginx-18.1.0");
    expect(result.appVersion).toBe("1.27.0");
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
      chart: {
        metadata: {
          name: "nginx",
          version: "18.2.0",
          appVersion: "1.27.1",
        },
      },
    });

    const result = parseHelmUpgradeOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("upgrade");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.revision).toBe("3");
    expect(result.status).toBe("deployed");
    expect(result.chart).toBe("nginx-18.2.0");
    expect(result.appVersion).toBe("1.27.1");
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

// ── Helm uninstall/rollback parser tests ─────────────────────────────

import {
  parseHelmUninstallOutput,
  parseHelmRollbackOutput,
  parseHelmHistoryOutput,
  parseHelmTemplateOutput,
} from "../src/lib/parsers.js";

describe("parseHelmUninstallOutput", () => {
  it("parses successful uninstall", () => {
    const stdout = 'release "my-release" uninstalled\n';
    const result = parseHelmUninstallOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("uninstall");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.status).toBe("uninstalled");
  });

  it("parses failed uninstall", () => {
    const stderr = "Error: uninstall: Release not loaded: my-release: release: not found";
    const result = parseHelmUninstallOutput("", stderr, 1, "my-release");

    expect(result.action).toBe("uninstall");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});

describe("parseHelmRollbackOutput", () => {
  it("parses successful rollback", () => {
    const stdout = "Rollback was a success! Happy Helming!\n";
    const result = parseHelmRollbackOutput(stdout, "", 0, "my-release", 2, "default");

    expect(result.action).toBe("rollback");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.revision).toBe("2");
    expect(result.status).toBe("success");
  });

  it("parses rollback without revision", () => {
    const stdout = "Rollback was a success! Happy Helming!\n";
    const result = parseHelmRollbackOutput(stdout, "", 0, "my-release");

    expect(result.success).toBe(true);
    expect(result.revision).toBeUndefined();
  });

  it("parses failed rollback", () => {
    const stderr = "Error: release: not found";
    const result = parseHelmRollbackOutput("", stderr, 1, "my-release", 1);

    expect(result.action).toBe("rollback");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(result.revision).toBe("1");
  });
});

// ── Gap #165: Helm history parser tests ─────────────────────────────

describe("parseHelmHistoryOutput", () => {
  it("parses successful history output", () => {
    const stdout = JSON.stringify([
      {
        revision: 1,
        updated: "2026-01-01T00:00:00Z",
        status: "superseded",
        chart: "nginx-1.0.0",
        app_version: "1.25.0",
        description: "Install complete",
      },
      {
        revision: 2,
        updated: "2026-01-02T00:00:00Z",
        status: "deployed",
        chart: "nginx-1.1.0",
        app_version: "1.25.1",
        description: "Upgrade complete",
      },
    ]);

    const result = parseHelmHistoryOutput(stdout, "", 0, "my-release", "default");

    expect(result.action).toBe("history");
    expect(result.success).toBe(true);
    expect(result.name).toBe("my-release");
    expect(result.namespace).toBe("default");
    expect(result.total).toBe(2);
    expect(result.revisions).toHaveLength(2);
    expect(result.revisions![0]).toEqual({
      revision: 1,
      updated: "2026-01-01T00:00:00Z",
      status: "superseded",
      chart: "nginx-1.0.0",
      appVersion: "1.25.0",
      description: "Install complete",
    });
    expect(result.revisions![1]).toEqual({
      revision: 2,
      updated: "2026-01-02T00:00:00Z",
      status: "deployed",
      chart: "nginx-1.1.0",
      appVersion: "1.25.1",
      description: "Upgrade complete",
    });
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles failure with stderr", () => {
    const result = parseHelmHistoryOutput("", "Error: release: not found", 1, "missing", "default");

    expect(result.success).toBe(false);
    expect(result.name).toBe("missing");
    expect(result.namespace).toBe("default");
    expect(result.total).toBe(0);
    expect(result.revisions).toEqual([]);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("not found");
  });

  it("handles invalid JSON output", () => {
    const result = parseHelmHistoryOutput("not-json{", "", 0, "test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse helm JSON output");
  });

  it("handles revision without optional fields", () => {
    const stdout = JSON.stringify([
      {
        revision: 1,
        updated: "2026-01-01T00:00:00Z",
        status: "deployed",
        chart: "nginx-1.0.0",
      },
    ]);

    const result = parseHelmHistoryOutput(stdout, "", 0, "my-release");

    expect(result.success).toBe(true);
    expect(result.revisions![0].appVersion).toBeUndefined();
    expect(result.revisions![0].description).toBeUndefined();
  });

  it("handles empty history array", () => {
    const result = parseHelmHistoryOutput("[]", "", 0, "my-release");

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.revisions).toEqual([]);
  });
});

// ── Gap #166: Helm template parser tests ────────────────────────────

describe("parseHelmTemplateOutput", () => {
  it("parses successful template output with multiple manifests", () => {
    const stdout = [
      "---",
      "# Source: nginx/templates/serviceaccount.yaml",
      "apiVersion: v1",
      "kind: ServiceAccount",
      "metadata:",
      "  name: my-release-nginx",
      "---",
      "# Source: nginx/templates/service.yaml",
      "apiVersion: v1",
      "kind: Service",
      "metadata:",
      "  name: my-release-nginx",
      "---",
      "# Source: nginx/templates/deployment.yaml",
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      "  name: my-release-nginx",
    ].join("\n");

    const result = parseHelmTemplateOutput(stdout, "", 0);

    expect(result.action).toBe("template");
    expect(result.success).toBe(true);
    expect(result.manifestCount).toBe(3);
    expect(result.manifests).toContain("ServiceAccount");
    expect(result.manifests).toContain("Service");
    expect(result.manifests).toContain("Deployment");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("handles failure with stderr", () => {
    const result = parseHelmTemplateOutput("", "Error: chart not found", 1);

    expect(result.success).toBe(false);
    expect(result.manifestCount).toBe(0);
    expect(result.manifests).toBeUndefined();
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("chart not found");
  });

  it("handles empty output", () => {
    const result = parseHelmTemplateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.manifestCount).toBe(0);
    expect(result.manifests).toBe("");
  });

  it("handles single manifest without separator", () => {
    const stdout = ["apiVersion: v1", "kind: ConfigMap", "metadata:", "  name: test-config"].join(
      "\n",
    );

    const result = parseHelmTemplateOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.manifestCount).toBe(1);
    expect(result.manifests).toContain("ConfigMap");
  });

  it("counts manifests correctly with trailing newlines", () => {
    const stdout = "---\napiVersion: v1\nkind: Pod\n---\napiVersion: v1\nkind: Service\n\n";

    const result = parseHelmTemplateOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.manifestCount).toBe(2);
  });
});
