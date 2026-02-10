import { describe, it, expect } from "vitest";
import { parseComposeUpOutput, parseComposeDownOutput } from "../src/lib/parsers.js";
import { formatComposeUp, formatComposeDown } from "../src/lib/formatters.js";
import type { DockerComposeUp, DockerComposeDown } from "../src/schemas/index.js";

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
