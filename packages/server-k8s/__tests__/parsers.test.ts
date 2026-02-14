import { describe, it, expect } from "vitest";
import {
  parseGetOutput,
  parseDescribeOutput,
  parseLogsOutput,
  parseApplyOutput,
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
