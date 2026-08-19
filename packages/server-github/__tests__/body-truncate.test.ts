import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_BODY_LENGTH,
  applyBodyCap,
  collapseDetailsBlocks,
  truncateBody,
} from "../src/lib/body-truncate.js";

describe("collapseDetailsBlocks (#1067)", () => {
  it("leaves a body without <details> untouched", () => {
    const body = "Just a plain markdown body.\n\n- one\n- two";
    expect(collapseDetailsBlocks(body)).toBe(body);
  });

  it("collapses a block to its summary text plus a marker", () => {
    const body =
      "intro\n<details>\n<summary>Release notes</summary>\n\nlots of text\n</details>\nend";
    const out = collapseDetailsBlocks(body);
    expect(out).toContain("Release notes […]");
    expect(out).not.toContain("lots of text");
    expect(out).toContain("intro");
    expect(out).toContain("end");
  });

  it("handles a <details> tag with attributes", () => {
    const out = collapseDetailsBlocks(
      '<details open="true"><summary>Changelog</summary>x</details>',
    );
    expect(out).toBe("Changelog […]");
  });

  it("strips markup inside the summary label", () => {
    const out = collapseDetailsBlocks(
      "<details><summary><b>Commits</b> from <em>dep</em></summary>body</details>",
    );
    expect(out).toBe("Commits from dep […]");
  });

  it("emits a bare marker when there is no <summary>", () => {
    expect(collapseDetailsBlocks("<details>hidden</details>")).toBe("[…]");
  });

  it("collapses nested blocks innermost-first", () => {
    const body =
      "<details><summary>Outer</summary>a<details><summary>Inner</summary>b</details>c</details>";
    expect(collapseDetailsBlocks(body)).toBe("Outer […]");
  });

  it("collapses several sibling blocks", () => {
    const body =
      "<details><summary>One</summary>x</details>\n<details><summary>Two</summary>y</details>";
    expect(collapseDetailsBlocks(body)).toBe("One […]\nTwo […]");
  });

  it("shrinks a Dependabot-shaped body dramatically", () => {
    const body = `Bumps foo from 1.0.0 to 2.0.0.
<details>
<summary>Release notes</summary>
${"release note line\n".repeat(600)}
</details>
<details>
<summary>Commits</summary>
${"- abc1234 some commit\n".repeat(600)}
</details>
`;
    const out = collapseDetailsBlocks(body);
    expect(out.length).toBeLessThan(body.length * 0.05);
    expect(out).toContain("Bumps foo from 1.0.0 to 2.0.0.");
    expect(out).toContain("Release notes […]");
    expect(out).toContain("Commits […]");
  });
});

describe("truncateBody (#1067)", () => {
  it("returns a short body unchanged and unflagged", () => {
    const out = truncateBody("short body");
    expect(out.body).toBe("short body");
    expect(out.bodyTruncated).toBe(false);
    expect(out.bodyLength).toBe("short body".length);
  });

  it("caps at the default length and flags truncation", () => {
    const body = "x".repeat(DEFAULT_MAX_BODY_LENGTH + 500);
    const out = truncateBody(body);
    expect(out.body).toHaveLength(DEFAULT_MAX_BODY_LENGTH);
    expect(out.bodyTruncated).toBe(true);
    expect(out.bodyLength).toBe(DEFAULT_MAX_BODY_LENGTH + 500);
  });

  it("honours an explicit cap", () => {
    const out = truncateBody("abcdefghij", 4);
    expect(out.body).toBe("abcd");
    expect(out.bodyTruncated).toBe(true);
    expect(out.bodyLength).toBe(10);
  });

  it("disables cap and <details> collapse when maxBodyLength is 0", () => {
    const body = `<details><summary>S</summary>${"y".repeat(50_000)}</details>`;
    const out = truncateBody(body, 0);
    expect(out.body).toBe(body);
    expect(out.bodyTruncated).toBe(false);
    expect(out.bodyLength).toBe(body.length);
  });

  it("flags truncation from the <details> collapse alone, without hitting the cap", () => {
    const body = `head\n<details><summary>S</summary>${"y".repeat(200)}</details>`;
    const out = truncateBody(body, DEFAULT_MAX_BODY_LENGTH);
    expect(out.body).toBe("head\nS […]");
    expect(out.bodyTruncated).toBe(true);
    expect(out.bodyLength).toBe(body.length);
  });

  it("treats null/undefined as an empty body", () => {
    expect(truncateBody(null)).toEqual({ body: "", bodyTruncated: false, bodyLength: 0 });
    expect(truncateBody(undefined)).toEqual({ body: "", bodyTruncated: false, bodyLength: 0 });
  });
});

describe("applyBodyCap (#1067)", () => {
  it("caps in place and sets the flags", () => {
    const data = { number: 1, body: "z".repeat(9000) };
    const out = applyBodyCap(data, 100);
    expect(out.body).toHaveLength(100);
    expect(out.bodyTruncated).toBe(true);
    expect(out.bodyLength).toBe(9000);
  });

  it("adds no flags when nothing was removed", () => {
    const out = applyBodyCap({ body: "fine" });
    expect(out.body).toBe("fine");
    expect(out.bodyTruncated).toBeUndefined();
    expect(out.bodyLength).toBeUndefined();
  });

  it("leaves a null body alone (absent stays distinguishable from empty)", () => {
    const out = applyBodyCap({ body: null as string | null });
    expect(out.body).toBeNull();
    expect(out.bodyTruncated).toBeUndefined();
  });

  it("leaves an absent body alone", () => {
    const out = applyBodyCap({ number: 7 } as { number: number; body?: string | null });
    expect(out.body).toBeUndefined();
    expect(out.bodyTruncated).toBeUndefined();
  });

  it("returns the body verbatim with maxBodyLength 0", () => {
    const body = "q".repeat(20_000);
    const out = applyBodyCap({ body }, 0);
    expect(out.body).toBe(body);
    expect(out.bodyTruncated).toBeUndefined();
  });
});
