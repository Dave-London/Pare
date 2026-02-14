/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in the kubectl and helm tools.
 *
 * Also tests Zod .max() input-limit constraints on K8s tool schemas.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

// ---------------------------------------------------------------------------
// assertNoFlagInjection — kubectl get (resource, name, namespace, selector)
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — kubectl get (resource param)", () => {
  it("accepts a normal resource type", () => {
    expect(() => assertNoFlagInjection("pods", "resource")).not.toThrow();
  });

  it("accepts plural resource types", () => {
    expect(() => assertNoFlagInjection("deployments", "resource")).not.toThrow();
    expect(() => assertNoFlagInjection("services", "resource")).not.toThrow();
    expect(() => assertNoFlagInjection("configmaps", "resource")).not.toThrow();
  });

  it("rejects --all", () => {
    expect(() => assertNoFlagInjection("--all", "resource")).toThrow(/Invalid resource/);
  });

  it("rejects -o json", () => {
    expect(() => assertNoFlagInjection("-o", "resource")).toThrow(/Invalid resource/);
  });

  it("rejects --output=wide", () => {
    expect(() => assertNoFlagInjection("--output=wide", "resource")).toThrow(/Invalid resource/);
  });

  it("rejects --watch", () => {
    expect(() => assertNoFlagInjection("--watch", "resource")).toThrow(/Invalid resource/);
  });
});

describe("assertNoFlagInjection — kubectl (name param)", () => {
  it("accepts a normal resource name", () => {
    expect(() => assertNoFlagInjection("my-pod-abc123", "name")).not.toThrow();
  });

  it("accepts resource name with dots", () => {
    expect(() => assertNoFlagInjection("nginx.default.svc", "name")).not.toThrow();
  });

  it("rejects --privileged", () => {
    expect(() => assertNoFlagInjection("--privileged", "name")).toThrow(/Invalid name/);
  });

  it("rejects -n (short flag)", () => {
    expect(() => assertNoFlagInjection("-n", "name")).toThrow(/Invalid name/);
  });

  it("rejects --all", () => {
    expect(() => assertNoFlagInjection("--all", "name")).toThrow(/Invalid name/);
  });
});

describe("assertNoFlagInjection — kubectl (namespace param)", () => {
  it("accepts a normal namespace", () => {
    expect(() => assertNoFlagInjection("default", "namespace")).not.toThrow();
  });

  it("accepts kube-system namespace", () => {
    expect(() => assertNoFlagInjection("kube-system", "namespace")).not.toThrow();
  });

  it("accepts custom namespace", () => {
    expect(() => assertNoFlagInjection("my-app-staging", "namespace")).not.toThrow();
  });

  it("rejects --all-namespaces", () => {
    expect(() => assertNoFlagInjection("--all-namespaces", "namespace")).toThrow(
      /Invalid namespace/,
    );
  });

  it("rejects -A", () => {
    expect(() => assertNoFlagInjection("-A", "namespace")).toThrow(/Invalid namespace/);
  });

  it("rejects --output=yaml", () => {
    expect(() => assertNoFlagInjection("--output=yaml", "namespace")).toThrow(/Invalid namespace/);
  });

  it("rejects --context", () => {
    expect(() => assertNoFlagInjection("--context", "namespace")).toThrow(/Invalid namespace/);
  });
});

// ---------------------------------------------------------------------------
// assertNoFlagInjection — helm (release, chart, namespace)
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — helm (release param)", () => {
  it("accepts a normal release name", () => {
    expect(() => assertNoFlagInjection("my-app", "release")).not.toThrow();
  });

  it("accepts release name with numbers", () => {
    expect(() => assertNoFlagInjection("nginx-v2", "release")).not.toThrow();
  });

  it("rejects --all", () => {
    expect(() => assertNoFlagInjection("--all", "release")).toThrow(/Invalid release/);
  });

  it("rejects --dry-run", () => {
    expect(() => assertNoFlagInjection("--dry-run", "release")).toThrow(/Invalid release/);
  });

  it("rejects -n", () => {
    expect(() => assertNoFlagInjection("-n", "release")).toThrow(/Invalid release/);
  });
});

describe("assertNoFlagInjection — helm (chart param)", () => {
  it("accepts a normal chart reference", () => {
    expect(() => assertNoFlagInjection("bitnami/nginx", "chart")).not.toThrow();
  });

  it("accepts a chart path", () => {
    expect(() => assertNoFlagInjection("./charts/my-app", "chart")).not.toThrow();
  });

  it("rejects --set as chart", () => {
    expect(() => assertNoFlagInjection("--set", "chart")).toThrow(/Invalid chart/);
  });

  it("rejects --values as chart", () => {
    expect(() => assertNoFlagInjection("--values", "chart")).toThrow(/Invalid chart/);
  });
});

describe("assertNoFlagInjection — helm (setValues items)", () => {
  it("accepts a normal set value", () => {
    expect(() => assertNoFlagInjection("replicas=3", "setValues")).not.toThrow();
  });

  it("accepts nested set value", () => {
    expect(() => assertNoFlagInjection("image.tag=v1.2.3", "setValues")).not.toThrow();
  });

  it("rejects --privileged as setValues item", () => {
    expect(() => assertNoFlagInjection("--privileged", "setValues")).toThrow(/Invalid setValues/);
  });

  it("rejects --namespace as setValues item", () => {
    expect(() => assertNoFlagInjection("--namespace", "setValues")).toThrow(/Invalid setValues/);
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — K8s tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — K8s tool schemas", () => {
  describe("resource parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a resource name within the limit", () => {
      expect(schema.safeParse("pods").success).toBe(true);
    });

    it("rejects a resource name exceeding SHORT_STRING_MAX", () => {
      const oversized = "r".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("name parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a name within the limit", () => {
      expect(schema.safeParse("my-pod-abc123").success).toBe(true);
    });

    it("rejects a name exceeding SHORT_STRING_MAX", () => {
      const oversized = "n".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("namespace parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a namespace within the limit", () => {
      expect(schema.safeParse("kube-system").success).toBe(true);
    });

    it("rejects a namespace exceeding SHORT_STRING_MAX", () => {
      const oversized = "n".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("selector parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a label selector within the limit", () => {
      expect(schema.safeParse("app=nginx,env=production").success).toBe(true);
    });

    it("rejects a selector exceeding STRING_MAX", () => {
      const oversized = "s".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("file parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a file path within the limit", () => {
      expect(schema.safeParse("/home/user/manifests/deployment.yaml").success).toBe(true);
    });

    it("rejects a file path exceeding PATH_MAX", () => {
      const oversized = "f".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("helm chart parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a chart reference within the limit", () => {
      expect(schema.safeParse("bitnami/nginx").success).toBe(true);
    });

    it("rejects a chart reference exceeding STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("helm setValues array (STRING_MAX per item)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX));

    it("accepts valid set values", () => {
      expect(schema.safeParse(["replicas=3", "image.tag=v1.2.3"]).success).toBe(true);
    });

    it("rejects set value exceeding STRING_MAX", () => {
      const oversized = ["k=" + "v".repeat(INPUT_LIMITS.STRING_MAX)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
