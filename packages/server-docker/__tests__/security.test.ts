/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in the run, exec, and pull tools.
 *
 * These tools accept user-provided strings (image names, container names) that
 * are passed as positional arguments to the Docker CLI. Without validation,
 * a malicious input like "--privileged" could be interpreted as a flag.
 *
 * Also tests assertValidPortMapping() for the run tool's ports parameter,
 * and Zod .max() input-limit constraints on Docker tool schemas.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { assertValidPortMapping } from "../src/lib/validation.js";

describe("assertNoFlagInjection — run tool (image param)", () => {
  it("accepts a normal image name", () => {
    expect(() => assertNoFlagInjection("nginx:latest", "image")).not.toThrow();
  });

  it("accepts an image with registry prefix", () => {
    expect(() =>
      assertNoFlagInjection("registry.example.com:5000/myapp:v1", "image"),
    ).not.toThrow();
  });

  it("accepts an image with sha256 digest", () => {
    expect(() => assertNoFlagInjection("nginx@sha256:abc123def456", "image")).not.toThrow();
  });

  it("rejects --privileged", () => {
    expect(() => assertNoFlagInjection("--privileged", "image")).toThrow(
      /Invalid image.*--privileged/,
    );
  });

  it("rejects -v /:/host", () => {
    expect(() => assertNoFlagInjection("-v", "image")).toThrow(/Invalid image.*"-v"/);
  });

  it("rejects --rm --privileged nginx (flag-prefixed compound)", () => {
    expect(() => assertNoFlagInjection("--rm --privileged nginx", "image")).toThrow(
      /Invalid image/,
    );
  });

  it("rejects --network=host", () => {
    expect(() => assertNoFlagInjection("--network=host", "image")).toThrow(/Invalid image/);
  });

  it("rejects -it (short flags)", () => {
    expect(() => assertNoFlagInjection("-it", "image")).toThrow(/Invalid image/);
  });

  it("rejects --cap-add=SYS_ADMIN", () => {
    expect(() => assertNoFlagInjection("--cap-add=SYS_ADMIN", "image")).toThrow(/Invalid image/);
  });

  it("rejects --pid=host", () => {
    expect(() => assertNoFlagInjection("--pid=host", "image")).toThrow(/Invalid image/);
  });

  it("rejects --security-opt", () => {
    expect(() => assertNoFlagInjection("--security-opt", "image")).toThrow(/Invalid image/);
  });

  it("rejects single dash with long value", () => {
    expect(() => assertNoFlagInjection("-d", "image")).toThrow(/Invalid image/);
  });
});

describe("assertNoFlagInjection — exec tool (container param)", () => {
  it("accepts a normal container name", () => {
    expect(() => assertNoFlagInjection("my-web-app", "container")).not.toThrow();
  });

  it("accepts a container ID", () => {
    expect(() => assertNoFlagInjection("abc123def456", "container")).not.toThrow();
  });

  it("accepts container name with underscores and dots", () => {
    expect(() => assertNoFlagInjection("my_app.service-1", "container")).not.toThrow();
  });

  it("rejects --privileged", () => {
    expect(() => assertNoFlagInjection("--privileged", "container")).toThrow(/Invalid container/);
  });

  it("rejects -u root", () => {
    expect(() => assertNoFlagInjection("-u", "container")).toThrow(/Invalid container/);
  });

  it("rejects --workdir=/tmp", () => {
    expect(() => assertNoFlagInjection("--workdir=/tmp", "container")).toThrow(/Invalid container/);
  });

  it("rejects -e (env injection)", () => {
    expect(() => assertNoFlagInjection("-e", "container")).toThrow(/Invalid container/);
  });

  it("rejects --detach", () => {
    expect(() => assertNoFlagInjection("--detach", "container")).toThrow(/Invalid container/);
  });
});

describe("assertNoFlagInjection — exec tool (command[0] param)", () => {
  it("accepts a normal command name", () => {
    expect(() => assertNoFlagInjection("ls", "command")).not.toThrow();
  });

  it("accepts a command with path", () => {
    expect(() => assertNoFlagInjection("/usr/bin/env", "command")).not.toThrow();
  });

  it("accepts a command like bash", () => {
    expect(() => assertNoFlagInjection("bash", "command")).not.toThrow();
  });

  it("rejects --help as command name (flag injection)", () => {
    expect(() => assertNoFlagInjection("--help", "command")).toThrow(/Invalid command/);
  });

  it("rejects -c as command name (flag injection)", () => {
    expect(() => assertNoFlagInjection("-c", "command")).toThrow(/Invalid command/);
  });

  it("rejects --privileged as command name", () => {
    expect(() => assertNoFlagInjection("--privileged", "command")).toThrow(/Invalid command/);
  });
});

describe("assertNoFlagInjection — pull tool (image param)", () => {
  it("accepts a normal image name", () => {
    expect(() => assertNoFlagInjection("ubuntu:22.04", "image")).not.toThrow();
  });

  it("accepts a private registry image", () => {
    expect(() => assertNoFlagInjection("ghcr.io/owner/repo:latest", "image")).not.toThrow();
  });

  it("rejects --all-tags", () => {
    expect(() => assertNoFlagInjection("--all-tags", "image")).toThrow(/Invalid image/);
  });

  it("rejects --platform (when passed as image)", () => {
    expect(() => assertNoFlagInjection("--platform", "image")).toThrow(/Invalid image/);
  });

  it("rejects -a (short flag)", () => {
    expect(() => assertNoFlagInjection("-a", "image")).toThrow(/Invalid image/);
  });

  it("rejects --quiet", () => {
    expect(() => assertNoFlagInjection("--quiet", "image")).toThrow(/Invalid image/);
  });

  it("rejects --disable-content-trust", () => {
    expect(() => assertNoFlagInjection("--disable-content-trust", "image")).toThrow(
      /Invalid image/,
    );
  });
});

// ---------------------------------------------------------------------------
// assertValidPortMapping — used by the run tool's ports[] parameter
// ---------------------------------------------------------------------------

describe("assertValidPortMapping", () => {
  describe("accepts valid port mappings", () => {
    const validMappings = [
      "8080",
      "8080:80",
      "127.0.0.1:8080:80",
      "8080:80/tcp",
      "8080:80/udp",
      "8080:80/sctp",
      "8080-8090:80-90",
      "127.0.0.1:8080:80/udp",
      "443:443",
      "3000:3000/tcp",
    ];

    for (const mapping of validMappings) {
      it(`accepts "${mapping}"`, () => {
        expect(() => assertValidPortMapping(mapping)).not.toThrow();
      });
    }
  });

  describe("rejects invalid port mappings", () => {
    const invalidMappings = [
      { value: "abc", label: "non-numeric" },
      { value: "--privileged", label: "flag injection (--privileged)" },
      { value: "", label: "empty string" },
      { value: "999999:80", label: "out-of-range port (999999)" },
      { value: "-p 8080:80", label: "flag prefix (-p 8080:80)" },
      { value: "8080:80/http", label: "invalid protocol (http)" },
      { value: "host:8080:80", label: "non-IP host" },
      { value: "; rm -rf /", label: "shell injection" },
      { value: "8080:80 --privileged", label: "trailing flag" },
      { value: "$(whoami):80", label: "command substitution" },
    ];

    for (const { value, label } of invalidMappings) {
      it(`rejects ${label}`, () => {
        expect(() => assertValidPortMapping(value)).toThrow(/Invalid port mapping/);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// exec tool — workdir parameter flag injection
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — exec tool (workdir param)", () => {
  it("accepts a normal working directory", () => {
    expect(() => assertNoFlagInjection("/app/src", "workdir")).not.toThrow();
  });

  it("accepts a relative path", () => {
    expect(() => assertNoFlagInjection("src/lib", "workdir")).not.toThrow();
  });

  it("rejects --privileged as workdir", () => {
    expect(() => assertNoFlagInjection("--privileged", "workdir")).toThrow(/Invalid workdir/);
  });

  it("rejects -w as workdir (flag injection)", () => {
    expect(() => assertNoFlagInjection("-w", "workdir")).toThrow(/Invalid workdir/);
  });

  it("rejects --user=root as workdir", () => {
    expect(() => assertNoFlagInjection("--user=root", "workdir")).toThrow(/Invalid workdir/);
  });
});

// ---------------------------------------------------------------------------
// pull tool — platform parameter flag injection
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — pull tool (platform param)", () => {
  it("accepts a normal platform string", () => {
    expect(() => assertNoFlagInjection("linux/amd64", "platform")).not.toThrow();
  });

  it("accepts linux/arm64", () => {
    expect(() => assertNoFlagInjection("linux/arm64", "platform")).not.toThrow();
  });

  it("rejects --all-tags as platform", () => {
    expect(() => assertNoFlagInjection("--all-tags", "platform")).toThrow(/Invalid platform/);
  });

  it("rejects --privileged as platform", () => {
    expect(() => assertNoFlagInjection("--privileged", "platform")).toThrow(/Invalid platform/);
  });

  it("rejects -a as platform", () => {
    expect(() => assertNoFlagInjection("-a", "platform")).toThrow(/Invalid platform/);
  });
});

// ---------------------------------------------------------------------------
// run tool — volumes[] flag injection
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — run tool (volumes param)", () => {
  it("accepts a normal volume mount", () => {
    expect(() => assertNoFlagInjection("/host/path:/container/path", "volumes")).not.toThrow();
  });

  it("accepts named volumes", () => {
    expect(() => assertNoFlagInjection("myvolume:/data", "volumes")).not.toThrow();
  });

  it("rejects --privileged as volume", () => {
    expect(() => assertNoFlagInjection("--privileged", "volumes")).toThrow(/Invalid volumes/);
  });

  it("rejects -v as volume value (flag injection)", () => {
    expect(() => assertNoFlagInjection("-v", "volumes")).toThrow(/Invalid volumes/);
  });

  it("rejects --network=host as volume", () => {
    expect(() => assertNoFlagInjection("--network=host", "volumes")).toThrow(/Invalid volumes/);
  });
});

// ---------------------------------------------------------------------------
// run tool — env[] flag injection
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — run tool (env param)", () => {
  it("accepts a normal env var", () => {
    expect(() => assertNoFlagInjection("NODE_ENV=production", "env")).not.toThrow();
  });

  it("accepts env var with complex value", () => {
    expect(() =>
      assertNoFlagInjection("DATABASE_URL=postgres://user:pass@host:5432/db", "env"),
    ).not.toThrow();
  });

  it("rejects --privileged as env value", () => {
    expect(() => assertNoFlagInjection("--privileged", "env")).toThrow(/Invalid env/);
  });

  it("rejects -e as env value (flag injection)", () => {
    expect(() => assertNoFlagInjection("-e", "env")).toThrow(/Invalid env/);
  });

  it("rejects --cap-add=SYS_ADMIN as env value", () => {
    expect(() => assertNoFlagInjection("--cap-add=SYS_ADMIN", "env")).toThrow(/Invalid env/);
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Docker tools
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Docker tool schemas", () => {
  describe("image parameter (SHORT_STRING_MAX)", () => {
    const imageSchema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts an image name within the limit", () => {
      expect(imageSchema.safeParse("nginx:latest").success).toBe(true);
    });

    it("rejects an image name exceeding SHORT_STRING_MAX", () => {
      const oversized = "a".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(imageSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("container parameter (SHORT_STRING_MAX)", () => {
    const containerSchema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a container name within the limit", () => {
      expect(containerSchema.safeParse("my-container").success).toBe(true);
    });

    it("rejects a container name exceeding SHORT_STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(containerSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("ports array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const portsSchema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from(
        { length: INPUT_LIMITS.ARRAY_MAX + 1 },
        (_, i) => `${8000 + i}:80`,
      );
      expect(portsSchema.safeParse(oversized).success).toBe(false);
    });

    it("rejects port string exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(portsSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("volumes array (ARRAY_MAX + PATH_MAX)", () => {
    const volumesSchema = z
      .array(z.string().max(INPUT_LIMITS.PATH_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "/a:/b");
      expect(volumesSchema.safeParse(oversized).success).toBe(false);
    });

    it("rejects volume string exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(volumesSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("env array (ARRAY_MAX + STRING_MAX)", () => {
    const envSchema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "K=V");
      expect(envSchema.safeParse(oversized).success).toBe(false);
    });

    it("rejects env string exceeding STRING_MAX", () => {
      const oversized = ["K=" + "v".repeat(INPUT_LIMITS.STRING_MAX)];
      expect(envSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const pathSchema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(pathSchema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "/".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(pathSchema.safeParse(oversized).success).toBe(false);
    });
  });
});
