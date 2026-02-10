import { describe, it, expect } from "vitest";
import {
  parsePsJson,
  parseBuildOutput,
  parseLogsOutput,
  parseImagesJson,
} from "../src/lib/parsers.js";

describe("parsePsJson", () => {
  it("parses multiple containers", () => {
    const stdout = [
      JSON.stringify({
        ID: "abc123def456",
        Names: "web-app",
        Image: "nginx:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: "0.0.0.0:8080->80/tcp",
        CreatedAt: "2024-01-01 10:00:00",
      }),
      JSON.stringify({
        ID: "def456abc789",
        Names: "db",
        Image: "postgres:16",
        Status: "Exited (0) 3 hours ago",
        State: "exited",
        Ports: "",
        CreatedAt: "2024-01-01 09:00:00",
      }),
    ].join("\n");

    const result = parsePsJson(stdout);

    expect(result.total).toBe(2);
    expect(result.running).toBe(1);
    expect(result.stopped).toBe(1);
    expect(result.containers[0].id).toBe("abc123def456");
    expect(result.containers[0].name).toBe("web-app");
    expect(result.containers[0].image).toBe("nginx:latest");
    expect(result.containers[0].state).toBe("running");
    expect(result.containers[0].ports).toHaveLength(1);
    expect(result.containers[0].ports[0]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
  });

  it("parses empty output", () => {
    const result = parsePsJson("");
    expect(result.total).toBe(0);
    expect(result.running).toBe(0);
    expect(result.stopped).toBe(0);
    expect(result.containers).toEqual([]);
  });

  it("parses container with multiple ports", () => {
    const stdout = JSON.stringify({
      ID: "aaa111",
      Names: "multi-port",
      Image: "myapp",
      Status: "Up 1 hour",
      State: "running",
      Ports: "0.0.0.0:443->443/tcp, 0.0.0.0:8080->80/tcp, 53/udp",
      CreatedAt: "2024-01-01",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].ports).toHaveLength(3);
    expect(result.containers[0].ports[0]).toEqual({ host: 443, container: 443, protocol: "tcp" });
    expect(result.containers[0].ports[1]).toEqual({ host: 8080, container: 80, protocol: "tcp" });
    expect(result.containers[0].ports[2]).toEqual({ container: 53, protocol: "udp" });
  });

  it("handles container with no ports", () => {
    const stdout = JSON.stringify({
      ID: "bbb222",
      Names: "worker",
      Image: "worker:1",
      Status: "Up 5 minutes",
      State: "running",
      Ports: "",
      CreatedAt: "2024-01-01",
    });

    const result = parsePsJson(stdout);
    expect(result.containers[0].ports).toEqual([]);
  });
});

describe("parseBuildOutput", () => {
  it("parses successful build", () => {
    const stdout = `#1 [internal] load build definition
#2 [internal] load metadata
#3 [1/3] FROM docker.io/library/node:20
#4 [2/3] COPY package.json .
#5 [3/3] RUN npm install
#6 exporting to image
#6 writing image sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`;
    const stderr = "";

    const result = parseBuildOutput(stdout, stderr, 0, 12.5);

    expect(result.success).toBe(true);
    expect(result.imageId).toBe("a1b2c3d4e5f6");
    expect(result.duration).toBe(12.5);
    expect(result.steps).toBe(6);
    expect(result.errors).toEqual([]);
  });

  it("parses failed build", () => {
    const stdout = `#1 [internal] load build definition
#2 [1/2] FROM docker.io/library/node:20
#3 [2/2] RUN npm install`;
    const stderr = 'ERROR: process "/bin/sh -c npm install" did not complete successfully';

    const result = parseBuildOutput(stdout, stderr, 1, 8.0);

    expect(result.success).toBe(false);
    expect(result.imageId).toBeUndefined();
    expect(result.duration).toBe(8.0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("parses build with no image ID", () => {
    const result = parseBuildOutput("step 1 done\nstep 2 done", "", 0, 5.0);
    expect(result.success).toBe(true);
    expect(result.imageId).toBeUndefined();
  });
});

describe("parseLogsOutput", () => {
  it("parses log lines", () => {
    const stdout =
      "2024-01-01 Starting app\n2024-01-01 Listening on port 3000\n2024-01-01 Request received";
    const result = parseLogsOutput(stdout, "web-app");

    expect(result.container).toBe("web-app");
    expect(result.lines).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.lines[0]).toBe("2024-01-01 Starting app");
  });

  it("handles empty logs", () => {
    const result = parseLogsOutput("", "empty-container");
    expect(result.container).toBe("empty-container");
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("parseImagesJson", () => {
  it("parses multiple images", () => {
    const stdout = [
      JSON.stringify({
        ID: "sha256:abc123def456abc123",
        Repository: "nginx",
        Tag: "latest",
        Size: "187MB",
        CreatedSince: "2 weeks ago",
      }),
      JSON.stringify({
        ID: "sha256:def456abc789def456",
        Repository: "node",
        Tag: "20-alpine",
        Size: "126MB",
        CreatedSince: "3 weeks ago",
      }),
    ].join("\n");

    const result = parseImagesJson(stdout);

    expect(result.total).toBe(2);
    expect(result.images[0].id).toBe("sha256:abc12");
    expect(result.images[0].repository).toBe("nginx");
    expect(result.images[0].tag).toBe("latest");
    expect(result.images[0].size).toBe("187MB");
    expect(result.images[1].repository).toBe("node");
    expect(result.images[1].tag).toBe("20-alpine");
  });

  it("parses empty image list", () => {
    const result = parseImagesJson("");
    expect(result.total).toBe(0);
    expect(result.images).toEqual([]);
  });

  it("handles image with CreatedAt fallback", () => {
    const stdout = JSON.stringify({
      ID: "sha256:111222333444555666",
      Repository: "myapp",
      Tag: "v1",
      Size: "50MB",
      CreatedAt: "2024-01-01T00:00:00Z",
    });

    const result = parseImagesJson(stdout);
    expect(result.images[0].created).toBe("2024-01-01T00:00:00Z");
  });
});
