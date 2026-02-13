import { describe, it, expect } from "vitest";
import {
  formatPs,
  formatBuild,
  formatLogs,
  formatImages,
  formatInspect,
  formatNetworkLs,
  formatVolumeLs,
  formatComposePs,
} from "../src/lib/formatters.js";
import type {
  DockerPs,
  DockerBuild,
  DockerLogs,
  DockerImages,
  DockerInspect,
  DockerNetworkLs,
  DockerVolumeLs,
  DockerComposePs,
} from "../src/schemas/index.js";

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

  it("formats truncated logs with truncation indicator", () => {
    const data: DockerLogs = {
      container: "busy-app",
      lines: ["line 1", "line 2"],
      total: 2,
      isTruncated: true,
      totalLines: 500,
    };
    const output = formatLogs(data);
    expect(output).toContain("busy-app (2 of 500 lines, truncated)");
    expect(output).toContain("line 1");
    expect(output).toContain("line 2");
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

describe("formatInspect", () => {
  it("formats running container inspect data", () => {
    const data: DockerInspect = {
      id: "abc123def456",
      name: "web-app",
      state: {
        status: "running",
        running: true,
        startedAt: "2024-06-01T10:00:00Z",
      },
      image: "nginx:latest",
      created: "2024-06-01T09:00:00Z",
    };
    const output = formatInspect(data);
    expect(output).toContain("web-app (abc123def456)");
    expect(output).toContain("Image: nginx:latest");
    expect(output).toContain("State: running (running: true)");
    expect(output).toContain("Started: 2024-06-01T10:00:00Z");
    expect(output).toContain("Created: 2024-06-01T09:00:00Z");
  });

  it("formats stopped container without startedAt", () => {
    const data: DockerInspect = {
      id: "def456abc789",
      name: "stopped-app",
      state: {
        status: "exited",
        running: false,
      },
      image: "myapp:v1",
      created: "2024-05-15T08:00:00Z",
    };
    const output = formatInspect(data);
    expect(output).toContain("stopped-app (def456abc789)");
    expect(output).toContain("State: exited (running: false)");
    expect(output).not.toContain("Started:");
  });

  it("includes platform when present", () => {
    const data: DockerInspect = {
      id: "aaa111",
      name: "plat-test",
      state: { status: "running", running: true },
      image: "node:20",
      platform: "linux",
      created: "2024-01-01T00:00:00Z",
    };
    const output = formatInspect(data);
    expect(output).toContain("Platform: linux");
  });
});

describe("formatNetworkLs", () => {
  it("formats network list", () => {
    const data: DockerNetworkLs = {
      networks: [
        { id: "aaa111", name: "bridge", driver: "bridge", scope: "local" },
        { id: "bbb222", name: "mynet", driver: "overlay", scope: "swarm" },
      ],
      total: 2,
    };
    const output = formatNetworkLs(data);
    expect(output).toContain("2 networks:");
    expect(output).toContain("bridge (bridge, local)");
    expect(output).toContain("mynet (overlay, swarm)");
  });

  it("formats empty network list", () => {
    const data: DockerNetworkLs = { networks: [], total: 0 };
    expect(formatNetworkLs(data)).toBe("No networks found.");
  });
});

describe("formatVolumeLs", () => {
  it("formats volume list", () => {
    const data: DockerVolumeLs = {
      volumes: [
        {
          name: "my-data",
          driver: "local",
          mountpoint: "/var/lib/docker/volumes/my-data/_data",
          scope: "local",
        },
        {
          name: "pg-data",
          driver: "local",
          mountpoint: "/var/lib/docker/volumes/pg-data/_data",
          scope: "local",
        },
      ],
      total: 2,
    };
    const output = formatVolumeLs(data);
    expect(output).toContain("2 volumes:");
    expect(output).toContain("my-data (local, local)");
    expect(output).toContain("pg-data (local, local)");
  });

  it("formats empty volume list", () => {
    const data: DockerVolumeLs = { volumes: [], total: 0 };
    expect(formatVolumeLs(data)).toBe("No volumes found.");
  });
});

describe("formatComposePs", () => {
  it("formats compose service list with ports", () => {
    const data: DockerComposePs = {
      services: [
        {
          name: "myapp-web-1",
          service: "web",
          state: "running",
          status: "Up 2 hours",
          ports: "0.0.0.0:8080->80/tcp",
        },
        { name: "myapp-db-1", service: "db", state: "running", status: "Up 2 hours" },
      ],
      total: 2,
    };
    const output = formatComposePs(data);
    expect(output).toContain("2 services:");
    expect(output).toContain("myapp-web-1 (web)");
    expect(output).toContain("[0.0.0.0:8080->80/tcp]");
    expect(output).toContain("myapp-db-1 (db)");
  });

  it("formats empty compose service list", () => {
    const data: DockerComposePs = { services: [], total: 0 };
    expect(formatComposePs(data)).toBe("No compose services found.");
  });
});
