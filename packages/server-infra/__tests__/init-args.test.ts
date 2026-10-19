/**
 * #1103: `terraform init -backend=false` lets a validate-only workflow run
 * without backend credentials. The `backend: false` input maps to it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/terraform-runner.js", () => ({ terraformCmd: vi.fn() }));

import { terraformCmd } from "../src/lib/terraform-runner.js";
import { registerInitTool } from "../src/tools/init.js";

type Handler = (p: Record<string, unknown>) => Promise<unknown>;

function initHandler(): Handler {
  let handler: Handler | undefined;
  registerInitTool({
    registerTool: (_n: string, _c: unknown, h: Handler) => {
      handler = h;
    },
  } as never);
  return handler!;
}

describe("init backend input", () => {
  beforeEach(() => {
    vi.mocked(terraformCmd).mockReset();
    vi.mocked(terraformCmd).mockResolvedValue({
      exitCode: 0,
      stdout: "Terraform has been successfully initialized!",
      stderr: "",
    });
  });

  it("passes -backend=false when backend is false", async () => {
    await initHandler()({ path: "/tf", backend: false });
    expect(vi.mocked(terraformCmd).mock.calls[0][0]).toContain("-backend=false");
  });

  it("initializes the backend by default", async () => {
    await initHandler()({ path: "/tf" });
    await initHandler()({ path: "/tf", backend: true });
    for (const call of vi.mocked(terraformCmd).mock.calls) {
      expect(call[0]).not.toContain("-backend=false");
    }
  });
});
