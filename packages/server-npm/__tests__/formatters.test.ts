import { describe, it, expect } from "vitest";
import {
  formatInstall,
  formatAudit,
  formatOutdated,
  formatList,
  formatRun,
  formatTest,
  formatInit,
  formatInfo,
  formatSearch,
  formatNvm,
} from "../src/lib/formatters.js";
import type {
  NpmInstall,
  NpmAudit,
  NpmOutdated,
  NpmList,
  NpmRun,
  NpmTest,
  NpmInit,
  NpmInfo,
  NpmSearch,
  NvmResult,
} from "../src/schemas/index.js";

describe("formatInstall", () => {
  it("formats install with added packages", () => {
    const data: NpmInstall = {
      added: 5,
      removed: 0,
      changed: 0,
    };
    const output = formatInstall(data, 3.2);
    expect(output).toBe("added 5 (5 packages, 3.2s)");
  });

  it("formats install with added, removed, and changed", () => {
    const data: NpmInstall = {
      added: 3,
      removed: 1,
      changed: 2,
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
    const output = formatInstall(data, 5.1);
    expect(output).toContain("added 3, removed 1, changed 2 (6 packages, 5.1s)");
    expect(output).toContain("2 vulnerabilities (1 critical, 1 high)");
    expect(output).toContain("10 packages looking for funding");
  });

  it("formats up-to-date install with no changes", () => {
    const data: NpmInstall = {
      added: 0,
      removed: 0,
      changed: 0,
    };
    const output = formatInstall(data);
    expect(output).toBe("up to date");
  });

  it("omits vulnerability line when total is 0", () => {
    const data: NpmInstall = {
      added: 1,
      removed: 0,
      changed: 0,
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
    const data: NpmOutdated = { packages: [] };
    expect(formatOutdated(data)).toBe("All packages are up to date.");
  });

  it("formats outdated packages list", () => {
    const data: NpmOutdated = {
      packages: [
        { name: "express", current: "4.17.1", wanted: "4.18.2", latest: "5.0.0" },
        { name: "lodash", current: "4.17.20", wanted: "4.17.21", latest: "4.17.21" },
      ],
    };
    const output = formatOutdated(data);
    expect(output).toContain("2 outdated packages:");
    expect(output).toContain("express: 4.17.1 → 4.18.2 (latest: 5.0.0)");
    expect(output).toContain("lodash: 4.17.20 → 4.17.21 (latest: 4.17.21)");
  });

  it("formats outdated entries with homepage when present", () => {
    const data: NpmOutdated = {
      packages: [
        {
          name: "typescript",
          current: "5.3.0",
          wanted: "5.7.0",
          latest: "5.7.0",
          homepage: "https://www.typescriptlang.org/",
        },
      ],
    };
    const output = formatOutdated(data);
    expect(output).toContain("https://www.typescriptlang.org/");
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
    };
    const output = formatList(data);
    expect(output).toContain("my-app@1.0.0 (2 dependencies)");
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("lodash@4.17.21");
  });

  it("formats npm list problems when present", () => {
    const data: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: { version: "4.18.2" },
      },
      problems: ["missing: zod@^3.0.0, required by my-app@1.0.0"],
    };
    const output = formatList(data);
    expect(output).toContain("Problems (1):");
    expect(output).toContain("missing: zod@^3.0.0, required by my-app@1.0.0");
  });

  it("formats empty dependency list", () => {
    const data: NpmList = {
      name: "empty-app",
      version: "0.1.0",
      dependencies: {},
    };
    const output = formatList(data);
    expect(output).toBe("empty-app@0.1.0 (0 dependencies)");
  });
});

describe("formatRun", () => {
  it("formats successful script run", () => {
    const data: NpmRun = {
      packageManager: "npm",
      exitCode: 0,
      stdout: "Build completed.",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatRun(data, "build", 2.5);
    expect(output).toContain('Script "build" completed successfully in 2.5s');
    expect(output).toContain("Build completed.");
  });

  it("formats failed script run with stderr", () => {
    const data: NpmRun = {
      packageManager: "npm",
      exitCode: 1,
      stdout: "",
      stderr: "ESLint found 3 errors",
      success: false,
      timedOut: false,
    };
    const output = formatRun(data, "lint", 1.2);
    expect(output).toContain('Script "lint" failed (exit code 1) in 1.2s');
    expect(output).toContain("ESLint found 3 errors");
  });
});

describe("formatTest", () => {
  it("formats passing tests", () => {
    const data: NpmTest = {
      packageManager: "npm",
      exitCode: 0,
      stdout: "All tests passed",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatTest(data, 4.0);
    expect(output).toContain("Tests passed in 4s");
    expect(output).toContain("All tests passed");
  });

  it("formats failing tests", () => {
    const data: NpmTest = {
      packageManager: "npm",
      exitCode: 1,
      stdout: "",
      stderr: "2 tests failed",
      success: false,
      timedOut: false,
    };
    const output = formatTest(data, 3.1);
    expect(output).toContain("Tests failed (exit code 1) in 3.1s");
    expect(output).toContain("2 tests failed");
  });

  it("formats timed out tests", () => {
    const data: NpmTest = {
      packageManager: "npm",
      exitCode: 124,
      stdout: "",
      stderr: "Command timed out",
      success: false,
      timedOut: true,
    };
    const output = formatTest(data, 300);
    expect(output).toContain("Tests timed out in 300s");
  });
});

describe("formatInit", () => {
  it("formats successful init", () => {
    const data: NpmInit = {
      packageManager: "npm",
      success: true,
      packageName: "my-new-project",
      version: "1.0.0",
      path: "/home/user/my-new-project/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe("Created my-new-project@1.0.0 at /home/user/my-new-project/package.json");
  });

  it("formats failed init without stderr", () => {
    const data: NpmInit = {
      packageManager: "npm",
      success: false,
      packageName: "",
      version: "",
      path: "/home/user/restricted",
    };
    const output = formatInit(data);
    expect(output).toBe("Failed to initialize package.json at /home/user/restricted");
  });

  it("formats failed init with stderr", () => {
    const data: NpmInit = {
      packageManager: "npm",
      success: false,
      packageName: "",
      version: "",
      path: "/home/user/restricted",
      stderr: "npm ERR! EACCES: permission denied",
    };
    const output = formatInit(data);
    expect(output).toContain("Failed to initialize package.json at /home/user/restricted");
    expect(output).toContain("stderr:");
    expect(output).toContain("npm ERR! EACCES: permission denied");
  });
});

describe("formatInfo", () => {
  it("formats package info with all fields", () => {
    const data: NpmInfo = {
      packageManager: "npm",
      name: "express",
      version: "4.18.2",
      description: "Fast, unopinionated, minimalist web framework",
      license: "MIT",
      homepage: "http://expressjs.com/",
      dependencies: { "body-parser": "1.20.1", cookie: "0.5.0" },
      dist: { tarball: "https://registry.npmjs.org/express/-/express-4.18.2.tgz" },
    };
    const output = formatInfo(data);
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("Fast, unopinionated, minimalist web framework");
    expect(output).toContain("License: MIT");
    expect(output).toContain("Homepage: http://expressjs.com/");
    expect(output).toContain("Dependencies: 2");
    expect(output).toContain("body-parser: 1.20.1");
    expect(output).toContain("Tarball:");
  });

  it("formats minimal package info", () => {
    const data: NpmInfo = {
      packageManager: "npm",
      name: "tiny-pkg",
      version: "0.0.1",
      description: "A tiny package",
    };
    const output = formatInfo(data);
    expect(output).toContain("tiny-pkg@0.0.1");
    expect(output).toContain("A tiny package");
    expect(output).not.toContain("License:");
    expect(output).not.toContain("Dependencies:");
  });
});

describe("formatSearch", () => {
  it("formats search results with packages", () => {
    const data: NpmSearch = {
      packageManager: "npm",
      packages: [
        { name: "express", version: "4.18.2", description: "Web framework", author: "TJ" },
        { name: "koa", version: "2.14.0", description: "Koa web framework" },
      ],
    };
    const output = formatSearch(data);
    expect(output).toContain("2 packages found:");
    expect(output).toContain("express@4.18.2 — Web framework by TJ");
    expect(output).toContain("koa@2.14.0 — Koa web framework");
    expect(output).not.toContain("koa@2.14.0 — Koa web framework by");
  });

  it("formats empty search results", () => {
    const data: NpmSearch = {
      packageManager: "npm",
      packages: [],
    };
    expect(formatSearch(data)).toBe("No packages found.");
  });
});

describe("formatNvm", () => {
  it("formats nvm with current, default, and installed versions", () => {
    const data: NvmResult = {
      current: "v20.11.0",
      versions: [{ version: "v18.19.0" }, { version: "v20.11.0" }, { version: "v22.0.0" }],
      default: "v20.11.0",
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.0");
    expect(output).toContain("Default: v20.11.0");
    expect(output).toContain("Installed (3):");
    expect(output).toContain("v20.11.0 (current)");
    expect(output).toContain("v18.19.0");
    expect(output).not.toContain("v18.19.0 (current)");
  });

  it("formats nvm with no installed versions", () => {
    const data: NvmResult = {
      current: "system",
      versions: [],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: system");
    expect(output).toContain("No versions installed.");
  });
});
