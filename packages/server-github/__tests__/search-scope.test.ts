import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({ ghCmd: vi.fn() }));

import { ghCmd } from "../src/lib/gh-runner.js";
import { scopeSearch, repoOfUrl, keepTargetRepo } from "../src/lib/search-scope.js";

// #1173: a bare OR in --search split the query, so gh's repo:OWNER/REPO
// qualifier bound to the first alternative only.
describe("scopeSearch", () => {
  it("groups a search that contains a bare OR", () => {
    expect(scopeSearch("beforeAll OR testNamePattern")).toBe("(beforeAll OR testNamePattern)");
    expect(scopeSearch('pare-test in:title,body beforeAll OR "suite"')).toBe(
      '(pare-test in:title,body beforeAll OR "suite")',
    );
  });

  it("leaves a search without OR untouched", () => {
    expect(scopeSearch("beforeAll in:title,body")).toBe("beforeAll in:title,body");
    // Lower-case "or" and OR inside a word are not the operator.
    expect(scopeSearch("error or warning")).toBe("error or warning");
    expect(scopeSearch("ORACLE label:bug")).toBe("ORACLE label:bug");
  });

  it("does not double-wrap a search that is already one group", () => {
    expect(scopeSearch("(a OR b)")).toBe("(a OR b)");
  });

  it("wraps groups joined by OR, which are not one group", () => {
    expect(scopeSearch("(a) OR (b)")).toBe("((a) OR (b))");
  });
});

describe("repoOfUrl", () => {
  it("reads OWNER/REPO from issue and PR URLs, lower-cased", () => {
    expect(repoOfUrl("https://github.com/Dave-London/Pare/issues/1173")).toBe("dave-london/pare");
    expect(repoOfUrl("https://github.com/vitest-dev/vitest/pull/10406")).toBe("vitest-dev/vitest");
    expect(repoOfUrl("not a url")).toBeUndefined();
  });
});

describe("keepTargetRepo", () => {
  const ours = { url: "https://github.com/Dave-London/Pare/issues/1173" };
  const theirs = { url: "https://github.com/vitest-dev/vitest/issues/10406" };

  beforeEach(() => vi.mocked(ghCmd).mockReset());

  it("drops other repositories' results when repo is given, with no extra call", async () => {
    const out = await keepTargetRepo([ours, theirs], "Dave-London/Pare", "/p");
    expect(out).toEqual({ items: [ours], excluded: 1 });
    expect(ghCmd).not.toHaveBeenCalled();
  });

  it("accepts HOST/OWNER/REPO for repo", async () => {
    const out = await keepTargetRepo([ours, theirs], "github.com/dave-london/pare", "/p");
    expect(out.excluded).toBe(1);
  });

  it("makes no call when every result is from one repository", async () => {
    const out = await keepTargetRepo([ours, ours], undefined, "/p");
    expect(out).toEqual({ items: [ours, ours], excluded: 0 });
    expect(ghCmd).not.toHaveBeenCalled();
  });

  it("looks up the current repository only when results are mixed", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "Dave-London/Pare\n",
      stderr: "",
      exitCode: 0,
    });
    const out = await keepTargetRepo([theirs, ours], undefined, "/p");

    expect(out).toEqual({ items: [ours], excluded: 1 });
    expect(vi.mocked(ghCmd).mock.calls[0][0]).toEqual([
      "repo",
      "view",
      "--json",
      "nameWithOwner",
      "--jq",
      ".nameWithOwner",
    ]);
  });

  it("keeps everything if the current repository cannot be resolved", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "no repo", exitCode: 1 });
    const out = await keepTargetRepo([theirs, ours], undefined, "/p");
    expect(out.excluded).toBe(0);
  });
});
