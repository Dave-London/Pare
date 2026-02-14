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

  it("returns explicit yarn when provided", async () => {
    const result = await detectPackageManager("/some/dir", "yarn");
    expect(result).toBe("yarn");
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it("detects pnpm when pnpm-lock.yaml exists", async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    const result = await detectPackageManager("/project");
    expect(result).toBe("pnpm");
    expect(mockAccess).toHaveBeenCalledWith(join("/project", "pnpm-lock.yaml"));
  });

  it("detects yarn when yarn.lock exists (no pnpm-lock.yaml)", async () => {
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // no pnpm-lock.yaml
    mockAccess.mockResolvedValueOnce(undefined); // yarn.lock exists
    const result = await detectPackageManager("/project");
    expect(result).toBe("yarn");
    expect(mockAccess).toHaveBeenCalledWith(join("/project", "yarn.lock"));
  });

  it("prefers pnpm over yarn when both lock files exist", async () => {
    mockAccess.mockResolvedValueOnce(undefined); // pnpm-lock.yaml exists
    const result = await detectPackageManager("/project");
    expect(result).toBe("pnpm");
    // Should not check for yarn.lock since pnpm was found first
    expect(mockAccess).toHaveBeenCalledTimes(1);
  });

  it("defaults to npm when no lock files exist", async () => {
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // no pnpm-lock.yaml
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // no yarn.lock
    const result = await detectPackageManager("/project");
    expect(result).toBe("npm");
  });

  it("defaults to npm when access throws", async () => {
    mockAccess.mockRejectedValueOnce(new Error("Permission denied")); // pnpm-lock.yaml
    mockAccess.mockRejectedValueOnce(new Error("Permission denied")); // yarn.lock
    const result = await detectPackageManager("/project");
    expect(result).toBe("npm");
  });
});
