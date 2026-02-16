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
// assertNoFlagInjection — new kubectl params (fieldSelector, context, etc.)
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — kubectl get (fieldSelector param)", () => {
  it("accepts a normal field selector", () => {
    expect(() => assertNoFlagInjection("status.phase=Running", "fieldSelector")).not.toThrow();
  });

  it("accepts field selector with metadata", () => {
    expect(() => assertNoFlagInjection("metadata.name=my-pod", "fieldSelector")).not.toThrow();
  });

  it("rejects flag injection in fieldSelector", () => {
    expect(() => assertNoFlagInjection("--all", "fieldSelector")).toThrow(/Invalid fieldSelector/);
  });
});

describe("assertNoFlagInjection — kubectl (context param)", () => {
  it("accepts a normal context name", () => {
    expect(() => assertNoFlagInjection("my-cluster-context", "context")).not.toThrow();
  });

  it("rejects flag injection in context", () => {
    expect(() => assertNoFlagInjection("--all-namespaces", "context")).toThrow(/Invalid context/);
  });
});

describe("assertNoFlagInjection — kubectl (kubeconfig param)", () => {
  it("accepts a normal kubeconfig path", () => {
    expect(() => assertNoFlagInjection("/home/user/.kube/config", "kubeconfig")).not.toThrow();
  });

  it("rejects flag injection in kubeconfig", () => {
    expect(() => assertNoFlagInjection("--exec", "kubeconfig")).toThrow(/Invalid kubeconfig/);
  });
});

describe("assertNoFlagInjection — kubectl get (sortBy param)", () => {
  it("accepts a JSONPath expression", () => {
    expect(() => assertNoFlagInjection(".metadata.creationTimestamp", "sortBy")).not.toThrow();
  });

  it("rejects flag injection in sortBy", () => {
    expect(() => assertNoFlagInjection("--output", "sortBy")).toThrow(/Invalid sortBy/);
  });
});

describe("assertNoFlagInjection — kubectl apply (fieldManager param)", () => {
  it("accepts a normal field manager name", () => {
    expect(() => assertNoFlagInjection("my-controller", "fieldManager")).not.toThrow();
  });

  it("rejects flag injection in fieldManager", () => {
    expect(() => assertNoFlagInjection("--force", "fieldManager")).toThrow(/Invalid fieldManager/);
  });
});

describe("assertNoFlagInjection — kubectl apply (selector param)", () => {
  it("accepts a normal label selector", () => {
    expect(() => assertNoFlagInjection("app=nginx", "selector")).not.toThrow();
  });

  it("rejects flag injection in selector", () => {
    expect(() => assertNoFlagInjection("--prune", "selector")).toThrow(/Invalid selector/);
  });
});

describe("assertNoFlagInjection — kubectl logs (sinceTime param)", () => {
  it("accepts an RFC3339 timestamp", () => {
    expect(() => assertNoFlagInjection("2024-01-15T10:00:00Z", "sinceTime")).not.toThrow();
  });

  it("rejects flag injection in sinceTime", () => {
    expect(() => assertNoFlagInjection("--follow", "sinceTime")).toThrow(/Invalid sinceTime/);
  });
});

describe("assertNoFlagInjection — kubectl get (subresource param)", () => {
  it("accepts a normal subresource name", () => {
    expect(() => assertNoFlagInjection("status", "subresource")).not.toThrow();
  });

  it("accepts 'scale' subresource", () => {
    expect(() => assertNoFlagInjection("scale", "subresource")).not.toThrow();
  });

  it("rejects flag injection in subresource", () => {
    expect(() => assertNoFlagInjection("--exec", "subresource")).toThrow(/Invalid subresource/);
  });
});

describe("assertNoFlagInjection — kubectl logs (podRunningTimeout param)", () => {
  it("accepts a duration string", () => {
    expect(() => assertNoFlagInjection("20s", "podRunningTimeout")).not.toThrow();
  });

  it("rejects flag injection in podRunningTimeout", () => {
    expect(() => assertNoFlagInjection("--follow", "podRunningTimeout")).toThrow(
      /Invalid podRunningTimeout/,
    );
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
// assertNoFlagInjection — new helm params (version, filter, repo, etc.)
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — helm (version param)", () => {
  it("accepts a semver version", () => {
    expect(() => assertNoFlagInjection("1.2.3", "version")).not.toThrow();
  });

  it("accepts a version with v prefix", () => {
    expect(() => assertNoFlagInjection("v1.0.0", "version")).not.toThrow();
  });

  it("rejects flag injection in version", () => {
    expect(() => assertNoFlagInjection("--set", "version")).toThrow(/Invalid version/);
  });
});

describe("assertNoFlagInjection — helm (filter param)", () => {
  it("accepts a regex pattern", () => {
    expect(() => assertNoFlagInjection("nginx.*", "filter")).not.toThrow();
  });

  it("rejects flag injection in filter", () => {
    expect(() => assertNoFlagInjection("--all", "filter")).toThrow(/Invalid filter/);
  });
});

describe("assertNoFlagInjection — helm (repo param)", () => {
  it("accepts a URL", () => {
    expect(() => assertNoFlagInjection("https://charts.bitnami.com/bitnami", "repo")).not.toThrow();
  });

  it("rejects flag injection in repo", () => {
    expect(() => assertNoFlagInjection("--set", "repo")).toThrow(/Invalid repo/);
  });
});

describe("assertNoFlagInjection — helm (description param)", () => {
  it("accepts a description string", () => {
    expect(() => assertNoFlagInjection("Initial release for staging", "description")).not.toThrow();
  });

  it("rejects flag injection in description", () => {
    expect(() => assertNoFlagInjection("--force", "description")).toThrow(/Invalid description/);
  });
});

describe("assertNoFlagInjection — helm (waitTimeout param)", () => {
  it("accepts a duration string", () => {
    expect(() => assertNoFlagInjection("5m0s", "waitTimeout")).not.toThrow();
  });

  it("rejects flag injection in waitTimeout", () => {
    expect(() => assertNoFlagInjection("--force", "waitTimeout")).toThrow(/Invalid waitTimeout/);
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

  describe("fieldSelector parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a field selector within the limit", () => {
      expect(schema.safeParse("status.phase=Running").success).toBe(true);
    });

    it("rejects a field selector exceeding STRING_MAX", () => {
      const oversized = "f".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("context parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a context name within the limit", () => {
      expect(schema.safeParse("my-cluster").success).toBe(true);
    });

    it("rejects a context exceeding SHORT_STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
