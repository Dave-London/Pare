import { describe, it, expect } from "vitest";
import {
  compactPsMap,
  formatPsCompact,
  compactImagesMap,
  formatImagesCompact,
  compactBuildMap,
  formatBuildCompact,
  compactLogsMap,
  formatLogsCompact,
  compactPullMap,
  formatPullCompact,
  compactRunMap,
  formatRunCompact,
  compactExecMap,
  formatExecCompact,
  compactComposeUpMap,
  formatComposeUpCompact,
  compactComposeDownMap,
  formatComposeDownCompact,
} from "../src/lib/formatters.js";
import type {
  DockerPs,
  DockerImages,
  DockerBuild,
  DockerLogs,
  DockerPull,
  DockerRun,
  DockerExec,
  DockerComposeUp,
  DockerComposeDown,
} from "../src/schemas/index.js";

describe("compactPsMap", () => {
  it("keeps only short id, name, image, status; drops ports, created, state", () => {
    const data: DockerPs = {
      containers: [
        {
          id: "abc123def456full",
          name: "web",
          image: "nginx:latest",
          status: "Up 2 hours",
          state: "running",
          ports: [{ host: 8080, container: 80, protocol: "tcp" }],
          created: "2 hours ago",
        },
        {
          id: "def456ghi789full",
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

    const compact = compactPsMap(data);

    expect(compact.total).toBe(2);
    expect(compact.running).toBe(1);
    expect(compact.stopped).toBe(1);
    expect(compact.containers).toHaveLength(2);
    expect(compact.containers[0]).toEqual({
      id: "abc123def456",
      name: "web",
      image: "nginx:latest",
      status: "Up 2 hours",
    });
    expect(compact.containers[1]).toEqual({
      id: "def456ghi789",
      name: "db",
      image: "postgres:15",
      status: "Exited (0) 1 hour ago",
    });
    // Verify dropped fields
    expect(compact.containers[0]).not.toHaveProperty("ports");
    expect(compact.containers[0]).not.toHaveProperty("created");
    expect(compact.containers[0]).not.toHaveProperty("state");
  });
});

describe("formatPsCompact", () => {
  it("formats compact ps output", () => {
    const compact = {
      containers: [
        { id: "abc123def456", name: "web", image: "nginx:latest", status: "Up 2 hours" },
      ],
      total: 1,
      running: 1,
    };
    const output = formatPsCompact(compact);
    expect(output).toContain("1 containers (1 running)");
    expect(output).toContain("abc123def456 web (nginx:latest) Up 2 hours");
  });
});

describe("compactImagesMap", () => {
  it("keeps id, repository, tag, size; drops created", () => {
    const data: DockerImages = {
      images: [
        {
          id: "abc123def456",
          repository: "nginx",
          tag: "latest",
          size: "142MB",
          created: "2 weeks ago",
        },
        {
          id: "def456ghi789",
          repository: "myapp",
          tag: "v1.2.0",
          size: "85MB",
          created: "3 days ago",
        },
      ],
      total: 2,
    };

    const compact = compactImagesMap(data);

    expect(compact.total).toBe(2);
    expect(compact.images).toHaveLength(2);
    expect(compact.images[0]).toEqual({
      id: "abc123def456",
      repository: "nginx",
      tag: "latest",
      size: "142MB",
    });
    // Verify dropped fields
    expect(compact.images[0]).not.toHaveProperty("created");
    expect(compact.images[1]).not.toHaveProperty("created");
  });
});

describe("formatImagesCompact", () => {
  it("formats compact images without created field", () => {
    const compact = {
      images: [{ id: "abc123", repository: "nginx", tag: "latest", size: "142MB" }],
      total: 1,
    };
    const output = formatImagesCompact(compact);
    expect(output).toContain("1 images:");
    expect(output).toContain("nginx:latest (142MB)");
    expect(output).not.toContain("weeks ago");
  });

  it("handles empty images list", () => {
    const compact = { images: [], total: 0 };
    expect(formatImagesCompact(compact)).toBe("No images found.");
  });

  it("handles <none> tag", () => {
    const compact = {
      images: [{ id: "xyz789", repository: "myapp", tag: "<none>", size: "50MB" }],
      total: 1,
    };
    const output = formatImagesCompact(compact);
    expect(output).toContain("myapp (50MB)");
    expect(output).not.toContain("<none>");
  });
});

describe("compactBuildMap", () => {
  it("keeps success, imageId, duration; replaces errors array with errorCount", () => {
    const data: DockerBuild = {
      success: true,
      imageId: "sha256:abc123",
      duration: 12.5,
      steps: 8,
      errors: [],
    };

    const compact = compactBuildMap(data);

    expect(compact).toEqual({
      success: true,
      imageId: "sha256:abc123",
      duration: 12.5,
      errorCount: 0,
    });
    // Verify dropped fields
    expect(compact).not.toHaveProperty("steps");
    expect(compact).not.toHaveProperty("errors");
  });

  it("counts errors", () => {
    const data: DockerBuild = {
      success: false,
      duration: 3.2,
      errors: ["COPY failed: file not found", "Dockerfile syntax error at line 5"],
    };

    const compact = compactBuildMap(data);

    expect(compact.success).toBe(false);
    expect(compact.errorCount).toBe(2);
    expect(compact).not.toHaveProperty("imageId");
  });
});

describe("formatBuildCompact", () => {
  it("formats successful compact build", () => {
    const compact = { success: true, imageId: "sha256:abc123", duration: 12.5, errorCount: 0 };
    expect(formatBuildCompact(compact)).toBe("Build succeeded in 12.5s → sha256:abc123");
  });

  it("formats failed compact build with error count", () => {
    const compact = { success: false, duration: 3.2, errorCount: 2 };
    expect(formatBuildCompact(compact)).toBe("Build failed (3.2s, 2 errors)");
  });
});

describe("compactLogsMap", () => {
  it("keeps head and tail for large log sets", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`);
    const data: DockerLogs = {
      container: "web",
      lines,
      total: 50,
    };

    const compact = compactLogsMap(data);

    expect(compact.container).toBe("web");
    expect(compact.total).toBe(50);
    expect(compact.head).toEqual(["line 1", "line 2", "line 3", "line 4", "line 5"]);
    expect(compact.tail).toEqual(["line 46", "line 47", "line 48", "line 49", "line 50"]);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("lines");
  });

  it("keeps only head for small log sets (no tail needed)", () => {
    const data: DockerLogs = {
      container: "app",
      lines: ["line 1", "line 2", "line 3"],
      total: 3,
    };

    const compact = compactLogsMap(data);

    expect(compact.head).toEqual(["line 1", "line 2", "line 3"]);
    expect(compact.tail).toEqual([]);
  });
});

describe("formatLogsCompact", () => {
  it("formats compact logs with head and tail", () => {
    const compact = {
      container: "web",
      total: 50,
      head: ["line 1", "line 2"],
      tail: ["line 49", "line 50"],
    };
    const output = formatLogsCompact(compact);
    expect(output).toContain("web (50 lines)");
    expect(output).toContain("line 1");
    expect(output).toContain("line 2");
    expect(output).toContain("lines omitted");
    expect(output).toContain("line 49");
    expect(output).toContain("line 50");
  });

  it("formats compact logs without tail when small", () => {
    const compact = {
      container: "app",
      total: 2,
      head: ["line 1", "line 2"],
      tail: [],
    };
    const output = formatLogsCompact(compact);
    expect(output).toContain("app (2 lines)");
    expect(output).toContain("line 1");
    expect(output).not.toContain("omitted");
  });
});

describe("compactPullMap", () => {
  it("preserves digest and status in compact output", () => {
    const data: DockerPull = {
      image: "nginx",
      tag: "latest",
      digest: "sha256:abc123def456",
      status: "pulled",
      success: true,
    };

    const compact = compactPullMap(data);

    expect(compact).toEqual({
      image: "nginx",
      tag: "latest",
      digest: "sha256:abc123def456",
      status: "pulled",
      success: true,
    });
    expect(compact).toHaveProperty("digest", "sha256:abc123def456");
    expect(compact).toHaveProperty("status", "pulled");
  });

  it("preserves up-to-date status", () => {
    const data: DockerPull = {
      image: "ubuntu",
      tag: "latest",
      status: "up-to-date",
      success: true,
    };

    const compact = compactPullMap(data);

    expect(compact.status).toBe("up-to-date");
    expect(compact.success).toBe(true);
  });
});

describe("formatPullCompact", () => {
  it("formats compact pull", () => {
    const compact = {
      image: "nginx",
      tag: "latest",
      status: "pulled" as const,
      success: true,
    };
    expect(formatPullCompact(compact)).toBe("Pulled nginx:latest");
  });

  it("formats compact pull up-to-date", () => {
    const compact = {
      image: "ubuntu",
      tag: "latest",
      digest: "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      status: "up-to-date" as const,
      success: true,
    };
    expect(formatPullCompact(compact)).toBe("ubuntu:latest is up to date (sha256:abc123def456...)");
  });

  it("formats compact pull failure", () => {
    const compact = {
      image: "nginx",
      tag: "latest",
      status: "error" as const,
      success: false,
    };
    expect(formatPullCompact(compact)).toBe("Pull failed for nginx:latest");
  });
});

describe("compactRunMap", () => {
  it("drops name", () => {
    const data: DockerRun = {
      containerId: "abc123def456",
      image: "nginx:latest",
      detached: true,
      name: "web",
    };

    const compact = compactRunMap(data);

    expect(compact).toEqual({
      containerId: "abc123def456",
      image: "nginx:latest",
      detached: true,
    });
    expect(compact).not.toHaveProperty("name");
  });
});

describe("formatRunCompact", () => {
  it("formats compact run", () => {
    const compact = { containerId: "abc123", image: "nginx:latest", detached: true };
    expect(formatRunCompact(compact)).toBe("Container abc123 from nginx:latest [detached]");
  });
});

describe("compactExecMap", () => {
  it("keeps compact previews for stdout/stderr", () => {
    const data: DockerExec = {
      exitCode: 0,
      stdout: "some output",
      stderr: "",
      success: true,
    };

    const compact = compactExecMap(data);

    expect(compact).toEqual({ exitCode: 0, success: true, stdoutPreview: "some output" });
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

describe("formatExecCompact", () => {
  it("formats compact exec success", () => {
    expect(formatExecCompact({ exitCode: 0, success: true })).toBe("Exec succeeded");
  });

  it("formats compact exec failure", () => {
    expect(formatExecCompact({ exitCode: 1, success: false })).toBe("Exec failed (exit code 1)");
  });
});

describe("compactComposeUpMap", () => {
  it("drops services list", () => {
    const data: DockerComposeUp = {
      success: true,
      services: ["web-1", "db-1"],
      started: 2,
    };

    const compact = compactComposeUpMap(data);

    expect(compact).toEqual({ success: true, started: 2 });
    expect(compact).not.toHaveProperty("services");
  });
});

describe("formatComposeUpCompact", () => {
  it("formats compact compose up", () => {
    expect(formatComposeUpCompact({ success: true, started: 3 })).toBe(
      "Compose up: 3 services started",
    );
  });

  it("formats compact compose up failure", () => {
    expect(formatComposeUpCompact({ success: false, started: 0 })).toBe("Compose up failed");
  });
});

describe("compactComposeDownMap", () => {
  it("passes through all fields (already compact)", () => {
    const data: DockerComposeDown = {
      success: true,
      stopped: 3,
      removed: 4,
    };

    const compact = compactComposeDownMap(data);

    expect(compact).toEqual({ success: true, stopped: 3, removed: 4 });
  });
});

describe("formatComposeDownCompact", () => {
  it("formats compact compose down", () => {
    expect(formatComposeDownCompact({ success: true, stopped: 2, removed: 3 })).toBe(
      "Compose down: 2 stopped, 3 removed",
    );
  });

  it("formats compact compose down failure", () => {
    expect(formatComposeDownCompact({ success: false, stopped: 0, removed: 0 })).toBe(
      "Compose down failed",
    );
  });
});

// ── Additional tests for uncovered compact formatter branches ────────

import {
  compactComposePsMap,
  formatComposePsCompact,
  compactComposeLogsMap,
  formatComposeLogsCompact,
  compactInspectMap,
  formatInspectCompact,
  compactNetworkLsMap,
  formatNetworkLsCompact,
  compactVolumeLsMap,
  formatVolumeLsCompact,
} from "../src/lib/formatters.js";
import type {
  DockerComposePs,
  DockerComposeLogs,
  DockerInspect,
  DockerNetworkLs,
  DockerVolumeLs,
} from "../src/schemas/index.js";

describe("compactComposePsMap", () => {
  it("keeps name, service, state; drops status and ports", () => {
    const data: DockerComposePs = {
      services: [
        {
          name: "myapp-web-1",
          service: "web",
          state: "running",
          status: "Up 2 hours",
          ports: [{ host: 8080, container: 80, protocol: "tcp" }],
        },
        {
          name: "myapp-db-1",
          service: "db",
          state: "running",
          status: "Up 2 hours",
        },
      ],
      total: 2,
    };

    const compact = compactComposePsMap(data);

    expect(compact.total).toBe(2);
    expect(compact.services).toHaveLength(2);
    expect(compact.services[0]).toEqual({
      name: "myapp-web-1",
      service: "web",
      state: "running",
    });
    expect(compact.services[1]).toEqual({
      name: "myapp-db-1",
      service: "db",
      state: "running",
    });
    expect(compact.services[0]).not.toHaveProperty("ports");
    expect(compact.services[0]).not.toHaveProperty("status");
  });
});

describe("formatComposePsCompact", () => {
  it("formats compact compose ps output", () => {
    const compact = {
      services: [
        { name: "myapp-web-1", service: "web", state: "running" },
        { name: "myapp-db-1", service: "db", state: "exited" },
      ],
      total: 2,
    };
    const output = formatComposePsCompact(compact);
    expect(output).toContain("2 services:");
    expect(output).toContain("running    myapp-web-1 (web)");
    expect(output).toContain("exited     myapp-db-1 (db)");
  });

  it("formats empty compact compose ps", () => {
    const compact = { services: [], total: 0 };
    expect(formatComposePsCompact(compact)).toBe("No compose services found.");
  });
});

describe("compactComposeLogsMap", () => {
  it("keeps head and tail for large log entries", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      service: "web-1",
      message: `msg ${i + 1}`,
      timestamp: `2024-06-01T10:00:${String(i).padStart(2, "0")}.000Z`,
    }));
    const data: DockerComposeLogs = {
      services: ["web-1"],
      entries,
      total: 20,
    };

    const compact = compactComposeLogsMap(data);

    expect(compact.services).toEqual(["web-1"]);
    expect(compact.total).toBe(20);
    expect(compact.head).toHaveLength(5);
    expect(compact.tail).toHaveLength(5);
    expect(compact.head[0].message).toBe("msg 1");
    expect(compact.head[0].timestamp).toBe("2024-06-01T10:00:00.000Z");
    expect(compact.tail[4].message).toBe("msg 20");
    expect(compact).not.toHaveProperty("entries");
  });

  it("keeps only head for small log entries (no tail needed)", () => {
    const data: DockerComposeLogs = {
      services: ["web-1"],
      entries: [
        { service: "web-1", message: "msg 1" },
        { service: "web-1", message: "msg 2" },
      ],
      total: 2,
    };

    const compact = compactComposeLogsMap(data);

    expect(compact.head).toHaveLength(2);
    expect(compact.tail).toEqual([]);
  });

  it("omits timestamp when not present", () => {
    const data: DockerComposeLogs = {
      services: ["web-1"],
      entries: [{ service: "web-1", message: "no timestamp" }],
      total: 1,
    };

    const compact = compactComposeLogsMap(data);

    expect(compact.head[0]).not.toHaveProperty("timestamp");
    expect(compact.head[0].message).toBe("no timestamp");
  });
});

describe("formatComposeLogsCompact", () => {
  it("formats compact compose logs with head and tail", () => {
    const compact = {
      services: ["web-1"],
      total: 20,
      head: [
        { service: "web-1", message: "msg 1", timestamp: "2024-06-01T10:00:00.000Z" },
        { service: "web-1", message: "msg 2" },
      ],
      tail: [
        { service: "web-1", message: "msg 19" },
        { service: "web-1", message: "msg 20", timestamp: "2024-06-01T10:00:19.000Z" },
      ],
    };
    const output = formatComposeLogsCompact(compact);
    expect(output).toContain("1 services, 20 entries");
    expect(output).toContain("web-1 | 2024-06-01T10:00:00.000Z msg 1");
    expect(output).toContain("web-1 | msg 2");
    expect(output).toContain("entries omitted");
    expect(output).toContain("web-1 | msg 19");
    expect(output).toContain("web-1 | 2024-06-01T10:00:19.000Z msg 20");
  });

  it("formats compact compose logs without tail when small", () => {
    const compact = {
      services: ["web-1"],
      total: 2,
      head: [
        { service: "web-1", message: "msg 1" },
        { service: "web-1", message: "msg 2" },
      ],
      tail: [],
    };
    const output = formatComposeLogsCompact(compact);
    expect(output).toContain("1 services, 2 entries");
    expect(output).toContain("web-1 | msg 1");
    expect(output).not.toContain("omitted");
  });
});

describe("compactInspectMap + formatInspectCompact", () => {
  it("maps container inspect to compact form", () => {
    const data: DockerInspect = {
      id: "abc123def456",
      name: "web-app",
      state: {
        status: "running",
        running: true,
        startedAt: "2024-06-01T10:00:00Z",
      },
      image: "nginx:latest",
      platform: "linux",
      created: "2024-06-01T09:00:00Z",
      healthStatus: "healthy",
    };

    const compact = compactInspectMap(data);

    expect(compact.id).toBe("abc123def456");
    expect(compact.name).toBe("web-app");
    expect(compact.inspectType).toBe("container");
    expect(compact.status).toBe("running");
    expect(compact.running).toBe(true);
    expect(compact.image).toBe("nginx:latest");
    expect(compact.healthStatus).toBe("healthy");
    // Dropped fields
    expect(compact).not.toHaveProperty("platform");
    expect(compact).not.toHaveProperty("created");
    expect(compact).not.toHaveProperty("startedAt");
  });

  it("formats compact container inspect", () => {
    const compact = {
      id: "abc123",
      name: "web-app",
      inspectType: "container" as const,
      status: "running",
      running: true,
      image: "nginx:latest",
      healthStatus: "healthy" as const,
    };
    const output = formatInspectCompact(compact);
    expect(output).toContain("web-app (abc123)");
    expect(output).toContain("running");
    expect(output).toContain("[running]");
    expect(output).toContain("image=nginx:latest");
    expect(output).toContain("health=healthy");
  });

  it("formats compact container inspect without health", () => {
    const compact = {
      id: "abc123",
      name: "web-app",
      inspectType: "container" as const,
      status: "exited",
      running: false,
      image: "nginx:latest",
    };
    const output = formatInspectCompact(compact);
    expect(output).toContain("[stopped]");
    expect(output).not.toContain("health=");
  });

  it("maps image inspect to compact form", () => {
    const data: DockerInspect = {
      id: "sha256:abc123",
      name: "nginx",
      inspectType: "image",
      image: "nginx:latest",
      repoTags: ["nginx:latest", "nginx:1.25"],
      created: "2024-06-01T00:00:00Z",
      platform: "linux",
      size: 142000000,
    };

    const compact = compactInspectMap(data);

    expect(compact.id).toBe("sha256:abc123");
    expect(compact.name).toBe("nginx");
    expect(compact.inspectType).toBe("image");
    expect(compact.status).toBe("n/a");
    expect(compact.running).toBe(false);
    expect(compact.image).toBe("nginx:latest");
    expect(compact.repoTags).toEqual(["nginx:latest", "nginx:1.25"]);
  });

  it("formats compact image inspect with tags", () => {
    const compact = {
      id: "sha256:abc123",
      name: "nginx",
      inspectType: "image" as const,
      status: "n/a",
      running: false,
      image: "nginx:latest",
      repoTags: ["nginx:latest", "nginx:1.25"],
    };
    const output = formatInspectCompact(compact);
    expect(output).toContain("Image nginx (sha256:abc123)");
    expect(output).toContain("tags=nginx:latest,nginx:1.25");
  });

  it("formats compact image inspect without tags", () => {
    const compact = {
      id: "sha256:abc123",
      name: "nginx",
      inspectType: "image" as const,
      status: "n/a",
      running: false,
      image: "nginx:latest",
    };
    const output = formatInspectCompact(compact);
    expect(output).toBe("Image nginx (sha256:abc123)");
    expect(output).not.toContain("tags=");
  });
});

describe("compactNetworkLsMap + formatNetworkLsCompact", () => {
  it("maps networks to compact form with id", () => {
    const data: DockerNetworkLs = {
      networks: [
        { id: "aaa111", name: "bridge", driver: "bridge", scope: "local" },
        { id: "bbb222", name: "mynet", driver: "overlay", scope: "swarm" },
      ],
      total: 2,
    };

    const compact = compactNetworkLsMap(data);

    expect(compact.total).toBe(2);
    expect(compact.networks).toHaveLength(2);
    expect(compact.networks[0]).toEqual({ id: "aaa111", name: "bridge", driver: "bridge" });
    expect(compact.networks[1]).toEqual({ id: "bbb222", name: "mynet", driver: "overlay" });
    expect(compact.networks[0]).not.toHaveProperty("scope");
  });

  it("maps networks to compact form without id", () => {
    const data: DockerNetworkLs = {
      networks: [{ name: "bridge", driver: "bridge", scope: "local" }],
      total: 1,
    };

    const compact = compactNetworkLsMap(data);

    expect(compact.networks[0]).toEqual({ name: "bridge", driver: "bridge" });
    expect(compact.networks[0]).not.toHaveProperty("id");
  });

  it("formats compact network list with id", () => {
    const compact = {
      networks: [{ id: "aaa111", name: "bridge", driver: "bridge" }],
      total: 1,
    };
    const output = formatNetworkLsCompact(compact);
    expect(output).toContain("1 networks:");
    expect(output).toContain("bridge (bridge) [aaa111]");
  });

  it("formats compact network list without id", () => {
    const compact = {
      networks: [{ name: "bridge", driver: "bridge" }],
      total: 1,
    };
    const output = formatNetworkLsCompact(compact);
    expect(output).toContain("bridge (bridge)");
    expect(output).not.toContain("[");
  });

  it("formats empty compact network list", () => {
    const compact = { networks: [], total: 0 };
    expect(formatNetworkLsCompact(compact)).toBe("No networks found.");
  });
});

describe("compactVolumeLsMap + formatVolumeLsCompact", () => {
  it("maps volumes to compact form with mountpoint", () => {
    const data: DockerVolumeLs = {
      volumes: [
        {
          name: "my-data",
          driver: "local",
          mountpoint: "/var/lib/docker/volumes/my-data/_data",
          scope: "local",
        },
      ],
      total: 1,
    };

    const compact = compactVolumeLsMap(data);

    expect(compact.total).toBe(1);
    expect(compact.volumes[0]).toEqual({
      name: "my-data",
      driver: "local",
      mountpoint: "/var/lib/docker/volumes/my-data/_data",
    });
    expect(compact.volumes[0]).not.toHaveProperty("scope");
  });

  it("maps volumes to compact form without mountpoint", () => {
    const data: DockerVolumeLs = {
      volumes: [{ name: "my-data", driver: "local", scope: "local" }],
      total: 1,
    };

    const compact = compactVolumeLsMap(data);

    expect(compact.volumes[0]).toEqual({ name: "my-data", driver: "local" });
    expect(compact.volumes[0]).not.toHaveProperty("mountpoint");
  });

  it("formats compact volume list with mountpoint", () => {
    const compact = {
      volumes: [
        { name: "my-data", driver: "local", mountpoint: "/var/lib/docker/volumes/my-data/_data" },
      ],
      total: 1,
    };
    const output = formatVolumeLsCompact(compact);
    expect(output).toContain("1 volumes:");
    expect(output).toContain("my-data (local) @ /var/lib/docker/volumes/my-data/_data");
  });

  it("formats compact volume list without mountpoint", () => {
    const compact = {
      volumes: [{ name: "my-data", driver: "local" }],
      total: 1,
    };
    const output = formatVolumeLsCompact(compact);
    expect(output).toContain("my-data (local)");
    expect(output).not.toContain("@");
  });

  it("formats empty compact volume list", () => {
    const compact = { volumes: [], total: 0 };
    expect(formatVolumeLsCompact(compact)).toBe("No volumes found.");
  });
});
