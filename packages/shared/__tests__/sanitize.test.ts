import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sanitizeErrorOutput } from "../src/sanitize.js";

describe("sanitizeErrorOutput", () => {
  it("replaces /home/<user>/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/home/dave/.gitconfig: Permission denied")).toBe(
      "~/.gitconfig: Permission denied",
    );
  });

  it("replaces /Users/<user>/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/Users/dave/projects/app/src/index.ts")).toBe(
      "~/projects/app/src/index.ts",
    );
  });

  it("replaces /root/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/root/.bashrc: No such file")).toBe("~/.bashrc: No such file");
  });

  it("replaces Windows C:\\Users\\<user>\\ paths with ~\\", () => {
    expect(sanitizeErrorOutput("C:\\Users\\dave\\Documents\\file.txt")).toBe(
      "~\\Documents\\file.txt",
    );
  });

  it("leaves relative paths unchanged", () => {
    expect(sanitizeErrorOutput("./src/index.ts")).toBe("./src/index.ts");
  });

  it("leaves normal error text unchanged", () => {
    expect(sanitizeErrorOutput("Error: command failed")).toBe("Error: command failed");
  });

  it("handles multiple paths in a single message", () => {
    const input = "error in /home/alice/project/a.ts and /Users/bob/project/b.ts";
    expect(sanitizeErrorOutput(input)).toBe("error in ~/project/a.ts and ~/project/b.ts");
  });

  it("handles empty string", () => {
    expect(sanitizeErrorOutput("")).toBe("");
  });

  it("handles path with no trailing content after username directory", () => {
    // The path must have content after the username directory for the regex to match
    expect(sanitizeErrorOutput("/home/dave/file.txt")).toBe("~/file.txt");
  });

  it("is case-insensitive for Windows drive letters", () => {
    expect(sanitizeErrorOutput("c:\\Users\\dave\\file.txt")).toBe("~\\file.txt");
    expect(sanitizeErrorOutput("D:\\Users\\dave\\file.txt")).toBe("~\\file.txt");
  });
});

describe("sanitizeErrorOutput – broad mode (PARE_SANITIZE_ALL_PATHS)", () => {
  let origEnv: string | undefined;

  beforeEach(() => {
    origEnv = process.env.PARE_SANITIZE_ALL_PATHS;
    process.env.PARE_SANITIZE_ALL_PATHS = "true";
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.PARE_SANITIZE_ALL_PATHS;
    } else {
      process.env.PARE_SANITIZE_ALL_PATHS = origEnv;
    }
  });

  it("redacts Unix system paths outside home directories", () => {
    expect(sanitizeErrorOutput("/etc/nginx/nginx.conf")).toBe("<redacted-path>/nginx.conf");
    expect(sanitizeErrorOutput("/var/log/syslog")).toBe("<redacted-path>/syslog");
    expect(sanitizeErrorOutput("/opt/homebrew/bin/node")).toBe("<redacted-path>/node");
    expect(sanitizeErrorOutput("/usr/local/bin/git")).toBe("<redacted-path>/git");
    expect(sanitizeErrorOutput("/tmp/build/output.js")).toBe("<redacted-path>/output.js");
  });

  it("redacts other Unix system path prefixes", () => {
    expect(sanitizeErrorOutput("/srv/www/index.html")).toBe("<redacted-path>/index.html");
    expect(sanitizeErrorOutput("/snap/core/current")).toBe("<redacted-path>/current");
    expect(sanitizeErrorOutput("/nix/store/abc123-pkg")).toBe("<redacted-path>/abc123-pkg");
  });

  it("redacts Windows non-user absolute paths", () => {
    expect(sanitizeErrorOutput("D:\\tools\\node\\node.exe")).toBe("<redacted-path>\\node.exe");
    expect(sanitizeErrorOutput("C:\\Windows\\System32\\cmd.exe")).toBe("<redacted-path>\\cmd.exe");
  });

  it("still replaces home paths with ~/", () => {
    expect(sanitizeErrorOutput("/home/dave/project/file.ts")).toBe("~/project/file.ts");
    expect(sanitizeErrorOutput("/Users/alice/code/app.js")).toBe("~/code/app.js");
  });

  it("handles mixed home and system paths in one message", () => {
    const input = "error: /home/dave/app.ts requires /etc/ssl/cert.pem";
    expect(sanitizeErrorOutput(input)).toBe("error: ~/app.ts requires <redacted-path>/cert.pem");
  });

  it("does not redact when env var is not 'true'", () => {
    process.env.PARE_SANITIZE_ALL_PATHS = "false";
    expect(sanitizeErrorOutput("/etc/nginx/nginx.conf")).toBe("/etc/nginx/nginx.conf");
    expect(sanitizeErrorOutput("C:\\Program Files\\app\\bin.exe")).toBe(
      "C:\\Program Files\\app\\bin.exe",
    );
  });
});
