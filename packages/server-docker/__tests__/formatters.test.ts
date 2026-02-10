import { describe, it, expect } from "vitest";
import { formatPs, formatBuild, formatLogs, formatImages } from "../src/lib/formatters.js";
import type { DockerPs, DockerBuild, DockerLogs, DockerImages } from "../src/schemas/index.js";

describe("formatPs", () => {
  it("formats container list with ports", () => {
    const data: DockerPs = {
      containers: [
        {
          id: "abc123",
          name: "web",
          image: "nginx:latest",
          status: "Up 2 hours",
          state: "running",
          ports: [{ host: 8080, container: 80, protocol: "tcp" }],
          created: "2 hours ago",
        },
        {
          id: "def456",
          name: "db",
          image: "postgres:15",
          status: "Exited (0) 1 hour ago",
          state: "exited",
          ports: [],
          created: "3 hours ago",
        },
      ],
      total: 2,
      running: 1,
      stopped: 1,
    };
    const output = formatPs(data);
    expect(output).toContain("2 containers (1 running, 1 stopped)");
    expect(output).toContain("running    web (nginx:latest) [8080->80/tcp]");
    expect(output).toContain("exited     db (postgres:15)");
  });

  it("formats empty container list", () => {
    const data: DockerPs = {
      containers: [],
      total: 0,
      running: 0,
      stopped: 0,
    };
    const output = formatPs(data);
    expect(output).toBe("0 containers (0 running, 0 stopped)");
  });

  it("formats container with port without host mapping", () => {
    const data: DockerPs = {
      containers: [
        {
          id: "ghi789",
          name: "app",
          image: "myapp:dev",
          status: "Up 5 minutes",
          state: "running",
          ports: [{ container: 3000, protocol: "tcp" }],
          created: "5 minutes ago",
        },
      ],
      total: 1,
      running: 1,
      stopped: 0,
    };
    const output = formatPs(data);
    expect(output).toContain("[3000/tcp]");
    expect(output).not.toContain("->");
  });
});

describe("formatBuild", () => {
  it("formats successful build with image id and steps", () => {
    const data: DockerBuild = {
      success: true,
      imageId: "sha256:abc123",
      duration: 12.5,
      steps: 8,
      errors: [],
    };
    const output = formatBuild(data);
    expect(output).toContain("Build succeeded in 12.5s");
    expect(output).toContain("sha256:abc123");
    expect(output).toContain("8 steps");
  });

  it("formats successful build without optional fields", () => {
    const data: DockerBuild = {
      success: true,
      duration: 5.0,
      errors: [],
    };
    const output = formatBuild(data);
    expect(output).toBe("Build succeeded in 5s");
  });

  it("formats failed build with errors", () => {
    const data: DockerBuild = {
      success: false,
      duration: 3.2,
      errors: ["COPY failed: file not found", "Dockerfile syntax error at line 5"],
    };
    const output = formatBuild(data);
    expect(output).toContain("Build failed (3.2s)");
    expect(output).toContain("COPY failed: file not found");
    expect(output).toContain("Dockerfile syntax error at line 5");
  });
});

describe("formatLogs", () => {
  it("formats container logs", () => {
    const data: DockerLogs = {
      container: "web",
      lines: ["Starting server...", "Listening on port 3000", "Ready"],
      total: 3,
    };
    const output = formatLogs(data);
    expect(output).toContain("web (3 lines)");
    expect(output).toContain("Starting server...");
    expect(output).toContain("Listening on port 3000");
    expect(output).toContain("Ready");
  });

  it("formats empty logs", () => {
    const data: DockerLogs = {
      container: "idle-app",
      lines: [],
      total: 0,
    };
    const output = formatLogs(data);
    expect(output).toContain("idle-app (0 lines)");
  });
});

describe("formatImages", () => {
  it("formats image list with tags", () => {
    const data: DockerImages = {
      images: [
        {
          id: "abc123",
          repository: "nginx",
          tag: "latest",
          size: "142MB",
          created: "2 weeks ago",
        },
        {
          id: "def456",
          repository: "myapp",
          tag: "v1.2.0",
          size: "85MB",
          created: "3 days ago",
        },
      ],
      total: 2,
    };
    const output = formatImages(data);
    expect(output).toContain("2 images:");
    expect(output).toContain("nginx:latest (142MB, 2 weeks ago)");
    expect(output).toContain("myapp:v1.2.0 (85MB, 3 days ago)");
  });

  it("formats empty image list", () => {
    const data: DockerImages = {
      images: [],
      total: 0,
    };
    expect(formatImages(data)).toBe("No images found.");
  });

  it("formats image with <none> tag", () => {
    const data: DockerImages = {
      images: [
        {
          id: "xyz789",
          repository: "myapp",
          tag: "<none>",
          size: "50MB",
          created: "1 day ago",
        },
      ],
      total: 1,
    };
    const output = formatImages(data);
    expect(output).toContain("myapp (50MB, 1 day ago)");
    expect(output).not.toContain("<none>");
  });
});
