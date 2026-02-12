/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in the run, exec, and pull tools.
 *
 * These tools accept user-provided strings (image names, container names) that
 * are passed as positional arguments to the Docker CLI. Without validation,
 * a malicious input like "--privileged" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

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
