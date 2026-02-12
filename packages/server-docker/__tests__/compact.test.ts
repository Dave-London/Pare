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
  it("drops digest", () => {
    const data: DockerPull = {
      image: "nginx",
      tag: "latest",
      digest: "sha256:abc123def456",
      success: true,
    };

    const compact = compactPullMap(data);

    expect(compact).toEqual({ image: "nginx", tag: "latest", success: true });
    expect(compact).not.toHaveProperty("digest");
  });
});

describe("formatPullCompact", () => {
  it("formats compact pull", () => {
    const compact = { image: "nginx", tag: "latest", success: true };
    expect(formatPullCompact(compact)).toBe("Pulled nginx:latest");
  });

  it("formats compact pull failure", () => {
    const compact = { image: "nginx", tag: "latest", success: false };
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
  it("drops stdout and stderr", () => {
    const data: DockerExec = {
      exitCode: 0,
      stdout: "some output",
      stderr: "",
      success: true,
    };

    const compact = compactExecMap(data);

    expect(compact).toEqual({ exitCode: 0, success: true });
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
