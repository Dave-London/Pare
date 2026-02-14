import { describe, it, expect, vi, afterEach } from "vitest";
import { detectPackageManager } from "../src/lib/detect-pm.js";
import { access } from "node:fs/promises";
import { join } from "node:path";

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
}));

const mockAccess = vi.mocked(access);

afterEach(() => {
  mockAccess.mockReset();
});

describe("detectPackageManager", () => {
  it("returns explicit value when provided", async () => {
    const result = await detectPackageManager("/some/dir", "pnpm");
    expect(result).toBe("pnpm");
    // Should not even check the filesystem
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it("returns explicit npm when provided", async () => {
    const result = await detectPackageManager("/some/dir", "npm");
    expect(result).toBe("npm");
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it("detects pnpm when pnpm-lock.yaml exists", async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    const result = await detectPackageManager("/project");
    expect(result).toBe("pnpm");
    expect(mockAccess).toHaveBeenCalledWith(join("/project", "pnpm-lock.yaml"));
  });

  it("defaults to npm when no pnpm-lock.yaml", async () => {
    mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
    const result = await detectPackageManager("/project");
    expect(result).toBe("npm");
  });

  it("defaults to npm when access throws", async () => {
    mockAccess.mockRejectedValueOnce(new Error("Permission denied"));
    const result = await detectPackageManager("/project");
    expect(result).toBe("npm");
  });
});
