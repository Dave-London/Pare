import { describe, it, expect } from "vitest";
import { parseInitArgs, parseDoctorArgs } from "../src/lib/args.js";

describe("parseInitArgs", () => {
  it("parses empty args with defaults", () => {
    const args = parseInitArgs([]);
    expect(args).toEqual({
      client: undefined,
      preset: undefined,
      all: false,
      dryRun: false,
      help: false,
      version: false,
    });
  });

  it("parses --client and --preset", () => {
    const args = parseInitArgs(["--client", "claude-code", "--preset", "web"]);
    expect(args.client).toBe("claude-code");
    expect(args.preset).toBe("web");
  });

  it("parses short flags -c and -p", () => {
    const args = parseInitArgs(["-c", "cursor", "-p", "python"]);
    expect(args.client).toBe("cursor");
    expect(args.preset).toBe("python");
  });

  it("parses --all as preset full", () => {
    const args = parseInitArgs(["--all"]);
    expect(args.all).toBe(true);
    expect(args.preset).toBe("full");
  });

  it("--all overrides --preset", () => {
    const args = parseInitArgs(["--all", "--preset", "web"]);
    expect(args.preset).toBe("full");
  });

  it("parses --dry-run", () => {
    const args = parseInitArgs(["--dry-run"]);
    expect(args.dryRun).toBe(true);
  });

  it("parses --help", () => {
    const args = parseInitArgs(["--help"]);
    expect(args.help).toBe(true);
  });

  it("parses --version", () => {
    const args = parseInitArgs(["--version"]);
    expect(args.version).toBe(true);
  });

  it("parses -h short flag", () => {
    const args = parseInitArgs(["-h"]);
    expect(args.help).toBe(true);
  });

  it("throws on unknown flags", () => {
    expect(() => parseInitArgs(["--unknown"])).toThrow();
  });
});

describe("parseDoctorArgs", () => {
  it("parses empty args with defaults", () => {
    const args = parseDoctorArgs([]);
    expect(args).toEqual({
      client: undefined,
      help: false,
      version: false,
    });
  });

  it("parses --client", () => {
    const args = parseDoctorArgs(["--client", "cursor"]);
    expect(args.client).toBe("cursor");
  });

  it("parses --help", () => {
    const args = parseDoctorArgs(["--help"]);
    expect(args.help).toBe(true);
  });

  it("throws on unknown flags", () => {
    expect(() => parseDoctorArgs(["--preset", "web"])).toThrow();
  });
});
