import { describe, it, expect } from "vitest";
import {
  parsePnpmAuditJson,
  parseOutdatedJson,
  parseInstallOutput,
  parseInstallPackageDetails,
  parsePnpmPackagesSummary,
  collapseVersionBumps,
  countInstallPackageDetails,
} from "../src/lib/parsers.js";
import { NpmInstallSchema } from "../src/schemas/index.js";

describe("parsePnpmAuditJson", () => {
  it("parses npm-compatible format (pnpm v8+)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        lodash: {
          severity: "high",
          title: "Prototype Pollution",
          via: [{ title: "Prototype Pollution", url: "https://npmjs.com/advisories/1234" }],
          range: "<4.17.21",
          fixAvailable: true,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
      },
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("lodash");
  });

  it("parses classic advisories format", () => {
    const json = JSON.stringify({
      advisories: {
        "1234": {
          module_name: "vulnerable-pkg",
          severity: "moderate",
          title: "Cross-Site Scripting",
          url: "https://npmjs.com/advisories/1234",
          vulnerable_versions: "<2.0.0",
          patched_versions: ">=2.0.0",
        },
      },
      metadata: {
        totalDependencies: 100,
        vulnerabilities: { critical: 0, high: 0, moderate: 1, low: 0, info: 0 },
      },
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("vulnerable-pkg");
    expect(result.vulnerabilities[0].severity).toBe("moderate");
    expect(result.vulnerabilities[0].title).toBe("Cross-Site Scripting");
    expect(result.vulnerabilities[0].fixAvailable).toBe(true);
    expect(result.vulnerabilities[0].severity).toBe("moderate");
  });

  it("handles advisory with no patched versions (no fix available)", () => {
    const json = JSON.stringify({
      advisories: {
        "5678": {
          module_name: "no-fix-pkg",
          severity: "high",
          title: "Memory Leak",
          patched_versions: "<0.0.0",
        },
      },
      metadata: {},
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities[0].fixAvailable).toBe(false);
  });

  it("handles empty advisories", () => {
    const json = JSON.stringify({
      advisories: {},
      metadata: {},
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });
});

describe("parseOutdatedJson with pnpm", () => {
  it("parses pnpm-style object format (same as npm)", () => {
    const json = JSON.stringify({
      turbo: {
        current: "2.8.3",
        latest: "2.8.8",
        wanted: "2.8.3",
        dependencyType: "devDependencies",
      },
    });

    const result = parseOutdatedJson(json, "pnpm");

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("turbo");
    expect(result.packages[0].current).toBe("2.8.3");
    expect(result.packages[0].latest).toBe("2.8.8");
    expect(result.packages[0].type).toBe("devDependencies");
  });

  it("parses pnpm array format", () => {
    const json = JSON.stringify([
      {
        packageName: "express",
        current: "4.18.0",
        wanted: "4.18.2",
        latest: "5.0.0",
        dependencyType: "dependencies",
      },
      {
        packageName: "zod",
        current: "3.22.0",
        wanted: "3.25.0",
        latest: "3.25.0",
      },
    ]);

    const result = parseOutdatedJson(json, "pnpm");

    expect(result.packages).toHaveLength(2);
    expect(result.packages[0].name).toBe("express");
    expect(result.packages[0].type).toBe("dependencies");
    expect(result.packages[1].name).toBe("zod");
    expect(result.packages[1].type).toBeUndefined();
  });

  it("handles empty array", () => {
    const result = parseOutdatedJson("[]", "pnpm");
    expect(result.packages).toEqual([]);
  });
});

describe("parseInstallOutput with pnpm-style output", () => {
  it("parses pnpm install output (similar to npm)", () => {
    // pnpm can output npm-compatible summary lines
    const output = "added 5 packages in 2s";
    const result = parseInstallOutput(output);

    expect(result.added).toBe(5);
  });

  it("parses pnpm output with packages in line", () => {
    const output =
      "Packages: +52\n\nProgress: resolved 287, reused 235, downloaded 52, added 52\n\ndone in 3.5s\n\n52 packages in 3s";
    const result = parseInstallOutput(output);

    // pnpm uses the "Packages: +52" store line instead of npm's
    // "added 52 packages" sentence — both must yield a non-zero count (#1081).
    expect(result.added).toBe(52);
  });
});

// ─── #1081: counters must agree with packageDetails ──────────────────────────

/**
 * Real `pnpm install --frozen-lockfile` output captured from pnpm 10.29.2 on a
 * two-project workspace after bumping @types/node, picocolors and tsx, adding
 * nanoid and dropping left-pad. pnpm prints no "added N packages" sentence, so
 * the old parser returned added:0/removed:0/changed:0 alongside 8 detail rows.
 */
const PNPM10_FROZEN_WORKSPACE_BUMP = `Scope: all 2 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +6 -6
++++++------
Progress: resolved 6, reused 2, downloaded 4, added 6, done

devDependencies:
- @types/node 22.7.0
+ @types/node 22.9.0
- left-pad 1.3.0
+ nanoid 5.0.9
- picocolors 1.0.0
+ picocolors 1.1.1
- tsx 4.19.0
+ tsx 4.20.3

╭ Warning ─────────────────────────────────────────────────────────────────────╮
│                                                                              │
│   Ignored build scripts: esbuild@0.25.12.                                    │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed     │
│   to run scripts.                                                            │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯
Done in 889ms using pnpm v10.29.2
`;

/**
 * Same workspace, but only a transitive dependency moved — pnpm prints the
 * store-level `Packages: +1 -1` line and no per-package detail rows at all.
 */
const PNPM10_FROZEN_TRANSITIVE_ONLY = `Scope: all 2 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +1 -1
+-
Progress: resolved 1, reused 1, downloaded 0, added 1, done

Done in 399ms using pnpm v10.29.2
`;

describe("#1081: pnpm 10 install counters agree with packageDetails", () => {
  it("derives counts from packageDetails when pnpm prints no summary sentence", () => {
    const result = parseInstallOutput(PNPM10_FROZEN_WORKSPACE_BUMP);

    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(3);
  });

  it("reports a same-name version bump as one updated entry with previousVersion", () => {
    const result = parseInstallOutput(PNPM10_FROZEN_WORKSPACE_BUMP);
    const details = result.packageDetails!;

    expect(details).toContainEqual({
      name: "@types/node",
      version: "22.9.0",
      action: "updated",
      previousVersion: "22.7.0",
    });
    expect(details).toContainEqual({
      name: "picocolors",
      version: "1.1.1",
      action: "updated",
      previousVersion: "1.0.0",
    });
    expect(details).toContainEqual({
      name: "tsx",
      version: "4.20.3",
      action: "updated",
      previousVersion: "4.19.0",
    });
    // Genuine add / remove stay as-is
    expect(details).toContainEqual({ name: "nanoid", version: "5.0.9", action: "added" });
    expect(details).toContainEqual({ name: "left-pad", version: "1.3.0", action: "removed" });
    expect(details).toHaveLength(5);
  });

  it("keeps counters consistent with the detail rows", () => {
    const result = parseInstallOutput(PNPM10_FROZEN_WORKSPACE_BUMP);
    const details = result.packageDetails ?? [];

    expect(result.added).toBe(details.filter((d) => d.action === "added").length);
    expect(result.removed).toBe(details.filter((d) => d.action === "removed").length);
    expect(result.changed).toBe(details.filter((d) => d.action === "updated").length);
  });

  it("validates against the output schema", () => {
    const result = parseInstallOutput(PNPM10_FROZEN_WORKSPACE_BUMP);
    expect(NpmInstallSchema.safeParse({ ...result, packageManager: "pnpm" }).success).toBe(true);
  });

  it("falls back to pnpm's `Packages: +N -M` line when there are no details", () => {
    const result = parseInstallOutput(PNPM10_FROZEN_TRANSITIVE_ONLY);

    expect(result.packageDetails).toBeUndefined();
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(0);
  });

  it("does not mistake pnpm's progress glyph line for package details", () => {
    const details = parseInstallPackageDetails(PNPM10_FROZEN_TRANSITIVE_ONLY);
    expect(details).toBeUndefined();
  });

  it("parses the store summary line in both directions", () => {
    expect(parsePnpmPackagesSummary("Packages: +6 -6")).toEqual({ added: 6, removed: 6 });
    expect(parsePnpmPackagesSummary("Packages: +52")).toEqual({ added: 52, removed: 0 });
    expect(parsePnpmPackagesSummary("Packages: -3")).toEqual({ added: 0, removed: 3 });
    expect(parsePnpmPackagesSummary("Progress: resolved 6, added 6")).toBeUndefined();
  });

  it("leaves an unpaired removal alone", () => {
    expect(
      collapseVersionBumps([{ name: "left-pad", version: "1.3.0", action: "removed" }]),
    ).toEqual([{ name: "left-pad", version: "1.3.0", action: "removed" }]);
  });

  it("counts npm-style 'updated' entries as changed", () => {
    expect(
      countInstallPackageDetails([
        { name: "a", version: "1", action: "added" },
        { name: "b", version: "1", action: "removed" },
        { name: "c", version: "2", action: "updated", previousVersion: "1" },
      ]),
    ).toEqual({ added: 1, removed: 1, changed: 1 });
  });
});
