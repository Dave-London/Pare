import { describe, it, expect } from "vitest";
import {
  parseComposeUpOutput,
  parseComposeDownOutput,
  parseComposeBuildOutput,
} from "../src/lib/parsers.js";
import { formatComposeUp, formatComposeDown, formatComposeBuild } from "../src/lib/formatters.js";
import type {
  DockerComposeUp,
  DockerComposeDown,
  DockerComposeBuild,
} from "../src/schemas/index.js";

describe("parseComposeUpOutput", () => {
  it("parses compose up with multiple started services", () => {
    const stderr = [
      " ✔ Network myapp_default  Created",
      " ✔ Container myapp-db-1   Started",
      " ✔ Container myapp-web-1  Started",
      " ✔ Container myapp-redis-1  Started",
    ].join("\n");

    const result = parseComposeUpOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.services).toContain("myapp-db-1");
    expect(result.services).toContain("myapp-web-1");
    expect(result.services).toContain("myapp-redis-1");
    expect(result.started).toBe(3);
  });

  it("parses compose up with already running services", () => {
    const stderr = [" ✔ Container myapp-db-1   Running", " ✔ Container myapp-web-1  Started"].join(
      "\n",
    );

    const result = parseComposeUpOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.services).toContain("myapp-db-1");
    expect(result.services).toContain("myapp-web-1");
    expect(result.started).toBe(2);
  });

  it("parses compose up failure", () => {
    const stderr = "no configuration file provided: not found";

    const result = parseComposeUpOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.started).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("parses compose up with Created status", () => {
    const stderr = [" ✔ Container myapp-init-1  Created"].join("\n");

    const result = parseComposeUpOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.services).toContain("myapp-init-1");
    expect(result.started).toBe(1);
  });

  it("handles empty output", () => {
    const result = parseComposeUpOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.started).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("does not double-count duplicate service entries", () => {
    const stderr = [" ✔ Container myapp-web-1  Created", " ✔ Container myapp-web-1  Started"].join(
      "\n",
    );

    const result = parseComposeUpOutput("", stderr, 0);

    expect(result.services).toContain("myapp-web-1");
    // Set deduplication means it should appear only once
    expect(result.services.filter((s) => s === "myapp-web-1")).toHaveLength(1);
  });

  it("parses partial failure (some services started, non-zero exit)", () => {
    const stderr = [
      " ✔ Container myapp-db-1   Started",
      " ✗ Container myapp-web-1  Error",
      "dependency failed to start: container myapp-web-1 is unhealthy",
    ].join("\n");

    const result = parseComposeUpOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.services).toContain("myapp-db-1");
    expect(result.started).toBeGreaterThanOrEqual(1);
  });

  it("parses missing compose file error", () => {
    const stderr = "no configuration file provided: not found\nvalidating: no compose file found";

    const result = parseComposeUpOutput("", stderr, 14);

    expect(result.success).toBe(false);
    expect(result.started).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("parses build failure during compose up", () => {
    const stderr = [
      " Container myapp-db-1  Started",
      "failed to solve: process '/bin/sh -c npm install' did not complete successfully",
    ].join("\n");

    const result = parseComposeUpOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.services).toContain("myapp-db-1");
  });
});

describe("parseComposeDownOutput", () => {
  it("parses compose down with stopped and removed containers", () => {
    const stderr = [
      " ✔ Container myapp-web-1    Stopped",
      " ✔ Container myapp-db-1     Stopped",
      " ✔ Container myapp-web-1    Removed",
      " ✔ Container myapp-db-1     Removed",
      " ✔ Network myapp_default    Removed",
    ].join("\n");

    const result = parseComposeDownOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.stopped).toBe(2);
    expect(result.removed).toBe(3); // 2 containers + 1 network
  });

  it("parses compose down with no containers", () => {
    const stderr = " ✔ Network myapp_default  Removed\n";

    const result = parseComposeDownOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.stopped).toBe(0);
    expect(result.removed).toBe(1);
  });

  it("parses compose down failure", () => {
    const stderr = "no configuration file provided: not found";

    const result = parseComposeDownOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.stopped).toBe(0);
    expect(result.removed).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseComposeDownOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.stopped).toBe(0);
    expect(result.removed).toBe(0);
  });

  it("parses compose down with missing compose file (non-zero exit)", () => {
    const stderr = "no configuration file provided: not found";

    const result = parseComposeDownOutput("", stderr, 14);

    expect(result.success).toBe(false);
    expect(result.stopped).toBe(0);
    expect(result.removed).toBe(0);
  });

  it("parses partial failure (some containers stopped, error removing)", () => {
    const stderr = [
      " ✔ Container myapp-web-1  Stopped",
      " ✗ Container myapp-db-1   Error while Stopping",
      " ✔ Container myapp-web-1  Removed",
    ].join("\n");

    const result = parseComposeDownOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.stopped).toBe(1);
    expect(result.removed).toBe(1);
  });
});

describe("formatComposeUp", () => {
  it("formats successful compose up with services", () => {
    const data: DockerComposeUp = {
      success: true,
      services: ["myapp-web-1", "myapp-db-1"],
      started: 2,
    };
    const output = formatComposeUp(data);
    expect(output).toBe("Compose up: 2 services started (myapp-web-1, myapp-db-1)");
  });

  it("formats compose up with no new services", () => {
    const data: DockerComposeUp = {
      success: true,
      services: [],
      started: 0,
    };
    const output = formatComposeUp(data);
    expect(output).toBe("Compose up succeeded (no new services started)");
  });

  it("formats failed compose up", () => {
    const data: DockerComposeUp = {
      success: false,
      services: [],
      started: 0,
    };
    const output = formatComposeUp(data);
    expect(output).toBe("Compose up failed");
  });
});

describe("formatComposeDown", () => {
  it("formats successful compose down", () => {
    const data: DockerComposeDown = {
      success: true,
      stopped: 3,
      removed: 4,
    };
    const output = formatComposeDown(data);
    expect(output).toBe("Compose down: 3 stopped, 4 removed");
  });

  it("formats compose down with nothing to stop", () => {
    const data: DockerComposeDown = {
      success: true,
      stopped: 0,
      removed: 0,
    };
    const output = formatComposeDown(data);
    expect(output).toBe("Compose down: 0 stopped, 0 removed");
  });

  it("formats failed compose down", () => {
    const data: DockerComposeDown = {
      success: false,
      stopped: 0,
      removed: 0,
    };
    const output = formatComposeDown(data);
    expect(output).toBe("Compose down failed");
  });
});

// ---------------------------------------------------------------------------
// parseComposeBuildOutput
// ---------------------------------------------------------------------------

describe("parseComposeBuildOutput", () => {
  it("parses compose build with multiple successful services", () => {
    const stderr = [" ✔ Service web Built", " ✔ Service api Built", " ✔ Service worker Built"].join(
      "\n",
    );

    const result = parseComposeBuildOutput("", stderr, 0, 15.3);

    expect(result.success).toBe(true);
    expect(result.built).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.duration).toBe(15.3);
    expect(result.services).toHaveLength(3);
    expect(result.services.map((s) => s.service)).toContain("web");
    expect(result.services.map((s) => s.service)).toContain("api");
    expect(result.services.map((s) => s.service)).toContain("worker");
    expect(result.services.every((s) => s.success)).toBe(true);
  });

  it("parses compose build failure", () => {
    const stderr = "no configuration file provided: not found";

    const result = parseComposeBuildOutput("", stderr, 1, 0.5);

    expect(result.success).toBe(false);
    expect(result.built).toBe(0);
    expect(result.duration).toBe(0.5);
  });

  it("handles empty output with success", () => {
    const result = parseComposeBuildOutput("", "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.built).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.services).toEqual([]);
  });

  it("parses build step output to discover services", () => {
    const stdout = [
      "#1 [web internal] load build definition from Dockerfile",
      "#2 [web 1/3] FROM docker.io/library/node:20",
      "#3 [web 2/3] COPY package.json .",
      "#4 [web 3/3] RUN npm install",
      "#5 [api internal] load build definition from Dockerfile",
      "#6 [api 1/2] FROM docker.io/library/python:3.12",
    ].join("\n");

    const result = parseComposeBuildOutput(stdout, "", 0, 20.0);

    expect(result.success).toBe(true);
    expect(result.services.map((s) => s.service)).toContain("web");
    expect(result.services.map((s) => s.service)).toContain("api");
  });

  it("parses Building service lines", () => {
    const stderr = ["Building web", "Building api"].join("\n");

    const result = parseComposeBuildOutput("", stderr, 0, 5.0);

    expect(result.success).toBe(true);
    expect(result.services.map((s) => s.service)).toContain("web");
    expect(result.services.map((s) => s.service)).toContain("api");
  });

  it("does not include internal as a service name from build steps", () => {
    const stdout = "#1 [internal] load build definition from Dockerfile\n";

    const result = parseComposeBuildOutput(stdout, "", 0, 2.0);

    expect(result.services.map((s) => s.service)).not.toContain("internal");
  });

  it("records correct duration", () => {
    const result = parseComposeBuildOutput("", "", 0, 42.7);
    expect(result.duration).toBe(42.7);
  });
});

// ---------------------------------------------------------------------------
// formatComposeBuild
// ---------------------------------------------------------------------------

describe("formatComposeBuild", () => {
  it("formats successful compose build with services", () => {
    const data: DockerComposeBuild = {
      success: true,
      services: [
        { service: "web", success: true },
        { service: "api", success: true },
      ],
      built: 2,
      failed: 0,
      duration: 15.3,
    };
    const output = formatComposeBuild(data);
    expect(output).toContain("Compose build: 2 built, 0 failed (15.3s)");
    expect(output).toContain("web: built");
    expect(output).toContain("api: built");
  });

  it("formats failed compose build with no services built", () => {
    const data: DockerComposeBuild = {
      success: false,
      services: [{ service: "web", success: false, error: "Dockerfile not found" }],
      built: 0,
      failed: 1,
      duration: 0.5,
    };
    const output = formatComposeBuild(data);
    expect(output).toContain("Compose build failed (0.5s)");
    expect(output).toContain("web: Dockerfile not found");
  });

  it("formats partial failure", () => {
    const data: DockerComposeBuild = {
      success: false,
      services: [
        { service: "web", success: true },
        { service: "api", success: false, error: "build error" },
      ],
      built: 1,
      failed: 1,
      duration: 10.0,
    };
    const output = formatComposeBuild(data);
    expect(output).toContain("Compose build: 1 built, 1 failed (10s)");
    expect(output).toContain("web: built");
    expect(output).toContain("api: failed");
  });

  it("formats empty build (no services)", () => {
    const data: DockerComposeBuild = {
      success: true,
      services: [],
      built: 0,
      failed: 0,
      duration: 1.0,
    };
    const output = formatComposeBuild(data);
    expect(output).toContain("Compose build: 0 built, 0 failed (1s)");
  });
});
