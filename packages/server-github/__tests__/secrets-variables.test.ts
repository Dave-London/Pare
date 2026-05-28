import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerSecretDeleteTool,
  registerSecretListTool,
  registerSecretSetTool,
  registerVariableDeleteTool,
  registerVariableListTool,
  registerVariableSetTool,
} from "../src/tools/secrets-variables.js";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: Record<string, unknown> }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function registerAll(server: FakeServer) {
  registerSecretSetTool(server as never);
  registerSecretListTool(server as never);
  registerSecretDeleteTool(server as never);
  registerVariableSetTool(server as never);
  registerVariableListTool(server as never);
  registerVariableDeleteTool(server as never);
}

describe("secrets and variables tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets repository secrets via stdin without echoing the value", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = await server.tools.get("secret-set")!.handler({
      name: "MAXMIND_LICENSE_KEY",
      value: "super-secret",
      repo: "owner/repo",
      path: "/tmp/repo",
    });

    expect(ghCmd).toHaveBeenCalledWith(
      ["secret", "set", "MAXMIND_LICENSE_KEY", "--repo", "owner/repo"],
      { cwd: "/tmp/repo", stdin: "super-secret" },
    );
    expect(out.structuredContent).toMatchObject({
      name: "MAXMIND_LICENSE_KEY",
      action: "set",
      scope: "repo",
      secretValueMasked: true,
    });
    expect(JSON.stringify(out.structuredContent)).not.toContain("super-secret");
  });

  it("sets organization secrets with visibility and selected repositories", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await server.tools.get("secret-set")!.handler({
      name: "DEPLOY_TOKEN",
      value: "secret",
      org: "acme",
      visibility: "selected",
      repos: ["web", "api"],
      app: "actions",
    });

    expect(ghCmd).toHaveBeenCalledWith(
      [
        "secret",
        "set",
        "DEPLOY_TOKEN",
        "--org",
        "acme",
        "--visibility",
        "selected",
        "--repos",
        "web,api",
        "--app",
        "actions",
      ],
      { cwd: expect.any(String), stdin: "secret" },
    );
  });

  it("lists environment secrets", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([{ name: "TOKEN", updatedAt: "2026-01-01T00:00:00Z" }]),
      stderr: "",
      exitCode: 0,
    });

    const out = await server.tools.get("secret-list")!.handler({
      repo: "owner/repo",
      env: "production",
    });

    expect(ghCmd).toHaveBeenCalledWith(
      [
        "secret",
        "list",
        "--json",
        "name,updatedAt,visibility,numSelectedRepos,selectedReposURL",
        "--repo",
        "owner/repo",
        "--env",
        "production",
      ],
      expect.any(String),
    );
    expect(out.structuredContent).toMatchObject({
      scope: "environment",
      secrets: [{ name: "TOKEN", updatedAt: "2026-01-01T00:00:00Z" }],
    });
  });

  it("deletes organization secrets", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = await server.tools.get("secret-delete")!.handler({
      name: "DEPLOY_TOKEN",
      org: "acme",
    });

    expect(ghCmd).toHaveBeenCalledWith(
      ["secret", "delete", "DEPLOY_TOKEN", "--org", "acme"],
      expect.any(String),
    );
    expect(out.structuredContent).toMatchObject({
      name: "DEPLOY_TOKEN",
      action: "delete",
      scope: "org",
      secretValueMasked: true,
    });
  });

  it("sets variables via stdin", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = await server.tools.get("variable-set")!.handler({
      name: "PUBLIC_URL",
      value: "https://example.com",
      repo: "owner/repo",
    });

    expect(ghCmd).toHaveBeenCalledWith(["variable", "set", "PUBLIC_URL", "--repo", "owner/repo"], {
      cwd: expect.any(String),
      stdin: "https://example.com",
    });
    expect(out.structuredContent).toMatchObject({
      name: "PUBLIC_URL",
      action: "set",
      scope: "repo",
    });
  });

  it("lists organization variables with values", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([
        { name: "PUBLIC_URL", value: "https://example.com", updatedAt: "2026-01-01T00:00:00Z" },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = await server.tools.get("variable-list")!.handler({ org: "acme" });

    expect(ghCmd).toHaveBeenCalledWith(
      [
        "variable",
        "list",
        "--json",
        "name,value,createdAt,updatedAt,visibility,numSelectedRepos,selectedReposURL",
        "--org",
        "acme",
      ],
      expect.any(String),
    );
    expect(out.structuredContent).toMatchObject({
      scope: "org",
      variables: [{ name: "PUBLIC_URL", value: "https://example.com" }],
    });
  });

  it("deletes environment variables", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = await server.tools.get("variable-delete")!.handler({
      name: "PUBLIC_URL",
      repo: "owner/repo",
      env: "production",
    });

    expect(ghCmd).toHaveBeenCalledWith(
      ["variable", "delete", "PUBLIC_URL", "--repo", "owner/repo", "--env", "production"],
      expect.any(String),
    );
    expect(out.structuredContent).toMatchObject({
      name: "PUBLIC_URL",
      action: "delete",
      scope: "environment",
    });
  });

  it("returns typed permission errors", async () => {
    const server = new FakeServer();
    registerAll(server);
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "HTTP 403: requires admin:org scope",
      exitCode: 1,
    });

    const out = await server.tools.get("secret-list")!.handler({ org: "acme" });

    expect(out.structuredContent).toMatchObject({
      scope: "org",
      errorType: "permission-denied",
    });
  });
});
