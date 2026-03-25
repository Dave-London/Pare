import { describe, it, expect } from "vitest";
import { resolveServers, SERVERS, SERVER_MAP } from "../src/lib/servers.js";

describe("resolveServers", () => {
  it("resolves valid server IDs to entries", () => {
    const result = resolveServers(["pare-git", "pare-npm"]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("pare-git");
    expect(result[1].id).toBe("pare-npm");
  });

  it("returns empty array for empty input", () => {
    const result = resolveServers([]);
    expect(result).toEqual([]);
  });

  it("throws on unknown server ID", () => {
    expect(() => resolveServers(["pare-git", "pare-nonexistent"])).toThrow(
      "Unknown server: pare-nonexistent",
    );
  });

  it("returns entries matching SERVER_MAP", () => {
    const ids = ["pare-git", "pare-test", "pare-search"];
    const result = resolveServers(ids);
    for (const entry of result) {
      expect(entry).toBe(SERVER_MAP.get(entry.id));
    }
  });
});

describe("SERVER_MAP", () => {
  it("has an entry for every server in SERVERS array", () => {
    expect(SERVER_MAP.size).toBe(SERVERS.length);
    for (const s of SERVERS) {
      expect(SERVER_MAP.get(s.id)).toBe(s);
    }
  });
});
