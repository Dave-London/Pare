import { describe, it, expect } from "vitest";
import { schemaReloadMap, formatReload } from "../src/lib/formatters.js";
import type { ReloadResultInternal } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// schemaReloadMap
// ---------------------------------------------------------------------------

describe("schemaReloadMap", () => {
  it("keeps rebuilt, notificationSent; drops buildCommand, buildDuration, buildOutput", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "pnpm build",
      buildDuration: 2500,
      buildOutput: "Build complete.",
    };

    const schema = schemaReloadMap(data);

    expect(schema.rebuilt).toBe(true);
    expect(schema.notificationSent).toBe(true);
    expect(schema).not.toHaveProperty("buildCommand");
    expect(schema).not.toHaveProperty("buildDuration");
    expect(schema).not.toHaveProperty("buildOutput");
  });

  it("preserves error when present", () => {
    const data: ReloadResultInternal = {
      rebuilt: false,
      notificationSent: true,
      error: "Build exited with code 1",
      buildCommand: "pnpm build",
      buildDuration: 800,
    };

    const schema = schemaReloadMap(data);

    expect(schema.rebuilt).toBe(false);
    expect(schema.error).toBe("Build exited with code 1");
    expect(schema).not.toHaveProperty("buildCommand");
    expect(schema).not.toHaveProperty("buildDuration");
  });

  it("omits error when undefined", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "npm run build",
      buildDuration: 1200,
    };

    const schema = schemaReloadMap(data);

    expect(schema.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// formatReload
// ---------------------------------------------------------------------------

describe("formatReload", () => {
  it("formats successful rebuild with notification", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "pnpm build",
      buildDuration: 2500,
    };

    const output = formatReload(data);

    expect(output).toContain('reload: rebuilt via "pnpm build" (2500ms).');
    expect(output).toContain("notifications/tools/list_changed sent.");
  });

  it("formats failed rebuild", () => {
    const data: ReloadResultInternal = {
      rebuilt: false,
      notificationSent: true,
      error: "TypeScript compilation failed",
      buildCommand: "pnpm build",
      buildDuration: 800,
    };

    const output = formatReload(data);

    expect(output).toContain('reload: build failed via "pnpm build" (800ms).');
    expect(output).toContain("error: TypeScript compilation failed");
  });

  it("formats rebuild without notification", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: false,
      buildCommand: "npm run build",
      buildDuration: 3000,
    };

    const output = formatReload(data);

    expect(output).toContain('reload: rebuilt via "npm run build" (3000ms).');
    expect(output).not.toContain("notifications/tools/list_changed");
  });

  it("includes build output when present", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "pnpm build",
      buildDuration: 1500,
      buildOutput: "✓ Compiled successfully",
    };

    const output = formatReload(data);

    expect(output).toContain("✓ Compiled successfully");
  });

  it("handles rebuild with no output and no error", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "pnpm build",
      buildDuration: 400,
    };

    const output = formatReload(data);

    expect(output).toBe(
      'reload: rebuilt via "pnpm build" (400ms).\n  notifications/tools/list_changed sent.',
    );
  });

  it("formats custom build command", () => {
    const data: ReloadResultInternal = {
      rebuilt: true,
      notificationSent: true,
      buildCommand: "make build-dev",
      buildDuration: 5000,
    };

    const output = formatReload(data);

    expect(output).toContain('reload: rebuilt via "make build-dev" (5000ms).');
  });
});
