import { describe, it, expect } from "vitest";
import { formatInstall, formatAudit, formatOutdated, formatList } from "../src/lib/formatters.js";
import type { NpmInstall, NpmAudit, NpmOutdated, NpmList } from "../src/schemas/index.js";

describe("formatInstall", () => {
  it("formats install with added packages", () => {
    const data: NpmInstall = {
      added: 5,
      removed: 0,
      changed: 0,
      duration: 3.2,
      packages: 120,
    };
    const output = formatInstall(data);
    expect(output).toBe("added 5 (120 packages, 3.2s)");
  });

  it("formats install with added, removed, and changed", () => {
    const data: NpmInstall = {
      added: 3,
      removed: 1,
      changed: 2,
      duration: 5.1,
      packages: 150,
      vulnerabilities: {
        total: 2,
        critical: 1,
        high: 1,
        moderate: 0,
        low: 0,
        info: 0,
      },
      funding: 10,
    };
    const output = formatInstall(data);
    expect(output).toContain("added 3, removed 1, changed 2 (150 packages, 5.1s)");
    expect(output).toContain("2 vulnerabilities (1 critical, 1 high)");
    expect(output).toContain("10 packages looking for funding");
  });

  it("formats up-to-date install with no changes", () => {
    const data: NpmInstall = {
      added: 0,
      removed: 0,
      changed: 0,
      duration: 0.5,
      packages: 80,
    };
    const output = formatInstall(data);
    expect(output).toBe("up to date (80 packages)");
  });

  it("omits vulnerability line when total is 0", () => {
    const data: NpmInstall = {
      added: 1,
      removed: 0,
      changed: 0,
      duration: 1.0,
      packages: 50,
      vulnerabilities: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
      },
    };
    const output = formatInstall(data);
    expect(output).not.toContain("vulnerabilities");
  });
});

describe("formatAudit", () => {
  it("formats clean audit with no vulnerabilities", () => {
    const data: NpmAudit = {
      vulnerabilities: [],
      summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
    };
    expect(formatAudit(data)).toBe("No vulnerabilities found.");
  });

  it("formats audit with vulnerabilities", () => {
    const data: NpmAudit = {
      vulnerabilities: [
        {
          name: "lodash",
          severity: "critical",
          title: "Prototype Pollution",
          fixAvailable: true,
        },
        {
          name: "minimist",
          severity: "high",
          title: "Prototype Pollution",
          fixAvailable: false,
        },
      ],
      summary: { total: 2, critical: 1, high: 1, moderate: 0, low: 0, info: 0 },
    };
    const output = formatAudit(data);
    expect(output).toContain("2 vulnerabilities (1 critical, 1 high, 0 moderate, 0 low)");
    expect(output).toContain("[critical] lodash: Prototype Pollution (fix available)");
    expect(output).toContain("[high] minimist: Prototype Pollution");
    expect(output).not.toContain("minimist: Prototype Pollution (fix available)");
  });
});

describe("formatOutdated", () => {
  it("formats when all packages are up to date", () => {
    const data: NpmOutdated = { packages: [], total: 0 };
    expect(formatOutdated(data)).toBe("All packages are up to date.");
  });

  it("formats outdated packages list", () => {
    const data: NpmOutdated = {
      packages: [
        { name: "express", current: "4.17.1", wanted: "4.18.2", latest: "5.0.0" },
        { name: "lodash", current: "4.17.20", wanted: "4.17.21", latest: "4.17.21" },
      ],
      total: 2,
    };
    const output = formatOutdated(data);
    expect(output).toContain("2 outdated packages:");
    expect(output).toContain("express: 4.17.1 → 4.18.2 (latest: 5.0.0)");
    expect(output).toContain("lodash: 4.17.20 → 4.17.21 (latest: 4.17.21)");
  });
});

describe("formatList", () => {
  it("formats dependency list", () => {
    const data: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: { version: "4.18.2" },
        lodash: { version: "4.17.21" },
      },
      total: 2,
    };
    const output = formatList(data);
    expect(output).toContain("my-app@1.0.0 (2 dependencies)");
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("lodash@4.17.21");
  });

  it("formats empty dependency list", () => {
    const data: NpmList = {
      name: "empty-app",
      version: "0.1.0",
      dependencies: {},
      total: 0,
    };
    const output = formatList(data);
    expect(output).toBe("empty-app@0.1.0 (0 dependencies)");
  });
});
