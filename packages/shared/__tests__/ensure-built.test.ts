import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), rmSync: vi.fn() }));

import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { ensureBuilt } from "../vitest.ensure-built.js";

describe("ensureBuilt", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("never rebuilds a package whose dist/index.js exists (#1085)", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    ensureBuilt(["/repo/packages/a", "/repo/packages/b"]);

    expect(existsSync).toHaveBeenCalledWith(resolve("/repo/packages/a", "dist", "index.js"));
    expect(existsSync).toHaveBeenCalledWith(resolve("/repo/packages/b", "dist", "index.js"));
    expect(execFileSync).not.toHaveBeenCalled();
    expect(rmSync).not.toHaveBeenCalled();
  });

  it("builds only the packages whose dist/index.js is missing", () => {
    // Normalise separators so the match also holds on Windows.
    vi.mocked(existsSync).mockImplementation(
      (p) => !String(p).replace(/\\/g, "/").includes("packages/b"),
    );

    ensureBuilt(["/repo/packages/a", "/repo/packages/b"]);

    expect(execFileSync).toHaveBeenCalledTimes(1);
    expect(execFileSync).toHaveBeenCalledWith(
      "pnpm",
      ["build"],
      expect.objectContaining({ cwd: "/repo/packages/b" }),
    );
    expect(rmSync).not.toHaveBeenCalled();
  });

  it("removes the partial dist and rethrows when the build fails", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("tsc failed");
    });

    expect(() => ensureBuilt(["/repo/packages/a", "/repo/packages/b"])).toThrow("tsc failed");

    // tsc emits on type errors; leaving that dist behind would let the next run skip the build.
    expect(rmSync).toHaveBeenCalledWith(resolve("/repo/packages/a", "dist"), {
      recursive: true,
      force: true,
    });
    // Stops at the first failure rather than building later packages.
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });
});
