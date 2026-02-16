import { describe, it, expect } from "vitest";
import { parsePullOutput } from "../src/lib/parsers.js";
import { formatPull } from "../src/lib/formatters.js";
import type { DockerPull } from "../src/schemas/index.js";

describe("parsePullOutput", () => {
  it("parses successful pull with digest and status=pulled", () => {
    const stdout = [
      "Using default tag: latest",
      "latest: Pulling from library/nginx",
      "a2abf6c4d29d: Pull complete",
      "Digest: sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      "Status: Downloaded newer image for nginx:latest",
      "docker.io/library/nginx:latest",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "nginx:latest");

    expect(result.image).toBe("nginx");
    expect(result.tag).toBe("latest");
    expect(result.digest).toBe(
      "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe("pulled");
  });

  it("parses pull up-to-date with status=up-to-date", () => {
    const stdout = [
      "Using default tag: latest",
      "latest: Pulling from library/ubuntu",
      "Digest: sha256:fedcba987654fedcba987654fedcba987654fedcba987654fedcba987654fedc",
      "Status: Image is up to date for ubuntu:latest",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "ubuntu");

    expect(result.image).toBe("ubuntu");
    expect(result.tag).toBe("latest");
    expect(result.digest).toBe(
      "sha256:fedcba987654fedcba987654fedcba987654fedcba987654fedcba987654fedc",
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe("up-to-date");
  });

  it("parses pull with specific tag", () => {
    const stdout = [
      "22.04: Pulling from library/ubuntu",
      "Digest: sha256:1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      "Status: Downloaded newer image for ubuntu:22.04",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "ubuntu:22.04");

    expect(result.image).toBe("ubuntu");
    expect(result.tag).toBe("22.04");
    expect(result.success).toBe(true);
    expect(result.status).toBe("pulled");
  });

  it("parses failed pull with status=error", () => {
    const stderr =
      "Error response from daemon: pull access denied for nonexistent/image, repository does not exist";

    const result = parsePullOutput("", stderr, 1, "nonexistent/image:v1");

    expect(result.image).toBe("nonexistent/image");
    expect(result.tag).toBe("v1");
    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.digest).toBeUndefined();
  });

  it("parses pull from private registry with port", () => {
    const stdout = [
      "v1: Pulling from myapp",
      "Digest: sha256:aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344",
      "Status: Downloaded newer image",
    ].join("\n");

    const result = parsePullOutput(stdout, "", 0, "registry.example.com:5000/myapp:v1");

    expect(result.image).toBe("registry.example.com:5000/myapp");
    expect(result.tag).toBe("v1");
    expect(result.success).toBe(true);
    expect(result.status).toBe("pulled");
  });

  it("handles pull with digest in stderr", () => {
    const stderr =
      "Digest: sha256:deadbeef1234deadbeef1234deadbeef1234deadbeef1234deadbeef1234dead";

    const result = parsePullOutput("", stderr, 0, "alpine:3.19");

    expect(result.digest).toBe(
      "sha256:deadbeef1234deadbeef1234deadbeef1234deadbeef1234deadbeef1234dead",
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe("pulled");
  });

  it("handles pull with no digest info", () => {
    const result = parsePullOutput("Already up to date", "", 0, "myimage:dev");

    expect(result.image).toBe("myimage");
    expect(result.tag).toBe("dev");
    expect(result.digest).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.status).toBe("pulled");
  });

  it("parses auth failure (unauthorized)", () => {
    const stderr =
      'Error response from daemon: Head "https://registry.example.com/v2/myapp/manifests/latest": unauthorized: authentication required';

    const result = parsePullOutput("", stderr, 1, "registry.example.com/myapp:latest");

    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.image).toBe("registry.example.com/myapp");
    expect(result.tag).toBe("latest");
    expect(result.digest).toBeUndefined();
  });

  it("parses nonexistent image (manifest not found)", () => {
    const stderr =
      "Error response from daemon: manifest for library/totallynotarealimage:latest not found: manifest unknown: manifest unknown";

    const result = parsePullOutput("", stderr, 1, "totallynotarealimage:latest");

    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.image).toBe("totallynotarealimage");
    expect(result.tag).toBe("latest");
    expect(result.digest).toBeUndefined();
  });

  it("parses rate limit error", () => {
    const stderr =
      "Error response from daemon: toomanyrequests: You have reached your pull rate limit. You may increase the limit by authenticating.";

    const result = parsePullOutput("", stderr, 1, "nginx:latest");

    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.image).toBe("nginx");
    expect(result.tag).toBe("latest");
    expect(result.digest).toBeUndefined();
  });

  it("parses network timeout error", () => {
    const stderr =
      'Error response from daemon: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection';

    const result = parsePullOutput("", stderr, 1, "alpine:3.19");

    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.image).toBe("alpine");
    expect(result.tag).toBe("3.19");
    expect(result.digest).toBeUndefined();
  });
});

describe("formatPull", () => {
  it("formats successful pull with digest", () => {
    const data: DockerPull = {
      image: "nginx",
      tag: "latest",
      digest: "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      status: "pulled",
      success: true,
    };
    const output = formatPull(data);
    expect(output).toBe("Pulled nginx:latest (sha256:abc123def456...)");
  });

  it("formats successful pull without digest", () => {
    const data: DockerPull = {
      image: "ubuntu",
      tag: "22.04",
      status: "pulled",
      success: true,
    };
    const output = formatPull(data);
    expect(output).toBe("Pulled ubuntu:22.04");
  });

  it("formats up-to-date pull", () => {
    const data: DockerPull = {
      image: "ubuntu",
      tag: "latest",
      digest: "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      status: "up-to-date",
      success: true,
    };
    const output = formatPull(data);
    expect(output).toBe("ubuntu:latest is up to date (sha256:abc123def456...)");
  });

  it("formats failed pull", () => {
    const data: DockerPull = {
      image: "nonexistent/image",
      tag: "v1",
      status: "error",
      success: false,
    };
    const output = formatPull(data);
    expect(output).toBe("Pull failed for nonexistent/image:v1");
  });
});
