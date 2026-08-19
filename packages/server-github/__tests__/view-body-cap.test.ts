/**
 * Tool-level coverage for the `body` cap on pr-view / issue-view (issue #1067).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerPrViewTool } from "../src/tools/pr-view.js";
import { registerIssueViewTool } from "../src/tools/issue-view.js";
import { DEFAULT_MAX_BODY_LENGTH } from "../src/lib/body-truncate.js";
import { IssueViewResultSchema, PrViewResultSchema } from "../src/schemas/index.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent: Record<string, unknown>;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function mockGh(stdout: string) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
}

/** A Dependabot-shaped body: a one-line preamble plus two huge <details>. */
const DEPENDABOT_BODY = `Bumps [foo](https://github.com/foo/foo) from 1.0.0 to 2.0.0.
<details>
<summary>Release notes</summary>
${"a very long release note line that repeats\n".repeat(500)}
</details>
<details>
<summary>Commits</summary>
${"- 0123456 chore: bump something\n".repeat(500)}
</details>
`;

function prJson(body: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    number: 1064,
    state: "OPEN",
    title: "chore(deps): bump foo",
    body,
    mergeable: "MERGEABLE",
    reviewDecision: "",
    statusCheckRollup: [],
    additions: 1,
    deletions: 1,
    changedFiles: 1,
    author: { login: "dependabot" },
    ...extra,
  });
}

function issueJson(body: string) {
  return JSON.stringify({
    number: 1067,
    state: "OPEN",
    title: "unbounded body",
    body,
    labels: [],
    assignees: [],
    url: "https://github.com/Dave-London/Pare/issues/1067",
    createdAt: "2026-08-18T04:06:29Z",
  });
}

describe("pr-view body cap (#1067)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrViewTool(server as never);
    handler = server.tools.get("pr-view")!.handler;
  });

  it("collapses <details> and caps a Dependabot-sized body by default", async () => {
    mockGh(prJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1064", compact: false });
    const parsed = PrViewResultSchema.parse(out.structuredContent);

    expect(parsed.body!.length).toBeLessThanOrEqual(DEFAULT_MAX_BODY_LENGTH);
    expect(parsed.body).toContain("Bumps [foo]");
    expect(parsed.body).toContain("Release notes […]");
    expect(parsed.body).toContain("Commits […]");
    expect(parsed.body).not.toContain("chore: bump something");
    expect(parsed.bodyTruncated).toBe(true);
    expect(parsed.bodyLength).toBe(DEPENDABOT_BODY.length);
  });

  it("leaves a short body untouched and unflagged", async () => {
    mockGh(prJson("A short description."));
    const out = await handler({ number: "1", compact: false });
    const parsed = PrViewResultSchema.parse(out.structuredContent);

    expect(parsed.body).toBe("A short description.");
    expect(parsed.bodyTruncated).toBeUndefined();
    expect(parsed.bodyLength).toBeUndefined();
  });

  it("honours an explicit maxBodyLength", async () => {
    mockGh(prJson("y".repeat(1000)));
    const out = await handler({ number: "1", maxBodyLength: 50, compact: false });
    const parsed = PrViewResultSchema.parse(out.structuredContent);

    expect(parsed.body).toHaveLength(50);
    expect(parsed.bodyTruncated).toBe(true);
    expect(parsed.bodyLength).toBe(1000);
  });

  it("returns the body verbatim with maxBodyLength: 0", async () => {
    mockGh(prJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1064", maxBodyLength: 0, compact: false });
    const parsed = PrViewResultSchema.parse(out.structuredContent);

    expect(parsed.body).toBe(DEPENDABOT_BODY);
    expect(parsed.bodyTruncated).toBeUndefined();
  });

  it("caps oversized review bodies too", async () => {
    mockGh(
      prJson("short", {
        reviews: [
          { author: { login: "alice" }, state: "APPROVED", body: "r".repeat(9000) },
          { author: { login: "bob" }, state: "COMMENTED", body: "lgtm" },
        ],
      }),
    );
    const out = await handler({ number: "1", compact: false });
    const parsed = PrViewResultSchema.parse(out.structuredContent);

    expect(parsed.reviews![0].body).toHaveLength(DEFAULT_MAX_BODY_LENGTH);
    expect(parsed.reviews![0].bodyTruncated).toBe(true);
    expect(parsed.reviews![1].body).toBe("lgtm");
    expect(parsed.reviews![1].bodyTruncated).toBeUndefined();
  });

  it("mentions truncation in the human-readable text", async () => {
    mockGh(prJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1064", compact: false });
    expect(out.content[0].text).toContain("body truncated");
    expect(out.content[0].text).toContain(String(DEPENDABOT_BODY.length));
  });
});

describe("issue-view body cap (#1067)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueViewTool(server as never);
    handler = server.tools.get("issue-view")!.handler;
  });

  it("collapses <details> and caps by default", async () => {
    mockGh(issueJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1067", compact: false });
    const parsed = IssueViewResultSchema.parse(out.structuredContent);

    expect(parsed.body!.length).toBeLessThanOrEqual(DEFAULT_MAX_BODY_LENGTH);
    expect(parsed.bodyTruncated).toBe(true);
    expect(parsed.bodyLength).toBe(DEPENDABOT_BODY.length);
  });

  it("leaves a short body untouched and unflagged", async () => {
    mockGh(issueJson("Short issue text."));
    const out = await handler({ number: "1", compact: false });
    const parsed = IssueViewResultSchema.parse(out.structuredContent);

    expect(parsed.body).toBe("Short issue text.");
    expect(parsed.bodyTruncated).toBeUndefined();
  });

  it("returns the body verbatim with maxBodyLength: 0", async () => {
    mockGh(issueJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1067", maxBodyLength: 0, compact: false });
    const parsed = IssueViewResultSchema.parse(out.structuredContent);

    expect(parsed.body).toBe(DEPENDABOT_BODY);
    expect(parsed.bodyTruncated).toBeUndefined();
  });

  it("mentions truncation in the human-readable text", async () => {
    mockGh(issueJson(DEPENDABOT_BODY));
    const out = await handler({ number: "1067", compact: false });
    expect(out.content[0].text).toContain("body truncated");
  });
});
