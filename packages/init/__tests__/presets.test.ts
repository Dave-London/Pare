import { describe, it, expect } from "vitest";
import { PRESETS, PRESET_MAP } from "../src/lib/presets.js";
import { SERVER_MAP } from "../src/lib/servers.js";

describe("presets", () => {
  it("has all expected presets", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(ids).toEqual(["web", "python", "rust", "go", "devops", "full"]);
  });

  it("every preset references valid server IDs", () => {
    for (const preset of PRESETS) {
      for (const id of preset.serverIds) {
        expect(SERVER_MAP.has(id)).toBe(true);
      }
    }
  });

  it("full preset includes all servers", () => {
    const full = PRESET_MAP.get("full")!;
    expect(full.serverIds.length).toBe(SERVER_MAP.size);
  });

  it("web preset includes git, npm, build, lint, test", () => {
    const web = PRESET_MAP.get("web")!;
    expect(web.serverIds).toContain("pare-git");
    expect(web.serverIds).toContain("pare-npm");
    expect(web.serverIds).toContain("pare-build");
    expect(web.serverIds).toContain("pare-lint");
    expect(web.serverIds).toContain("pare-test");
  });

  it("each preset has a label and description", () => {
    for (const preset of PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
    }
  });
});
