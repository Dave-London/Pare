import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { detectProjectType } from "../src/lib/detect.js";

/**
 * Helper: create a mock `existsSync` that returns true for a given set of
 * file basenames when joined with the project directory.
 */
function mockExists(projectDir: string, files: string[]) {
  const fullPaths = new Set(files.map((f) => join(projectDir, f)));
  return (p: string) => fullPaths.has(p);
}

const DIR = "/fake/project";

describe("detectProjectType", () => {
  describe("single ecosystem detection", () => {
    it("detects Python from pyproject.toml", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["pyproject.toml"]));
      expect(result.ecosystems).toContain("python");
      expect(result.suggestedPreset).toBe("python");
    });

    it("detects Python from requirements.txt", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["requirements.txt"]));
      expect(result.ecosystems).toContain("python");
      expect(result.suggestedPreset).toBe("python");
    });

    it("detects Python from Pipfile", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Pipfile"]));
      expect(result.ecosystems).toContain("python");
    });

    it("detects Python from uv.lock", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["uv.lock"]));
      expect(result.ecosystems).toContain("python");
    });

    it("detects Rust from Cargo.toml", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Cargo.toml"]));
      expect(result.ecosystems).toContain("rust");
      expect(result.suggestedPreset).toBe("rust");
    });

    it("detects Go from go.mod", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["go.mod"]));
      expect(result.ecosystems).toContain("go");
      expect(result.suggestedPreset).toBe("go");
    });

    it("detects Web from package.json", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["package.json"]));
      expect(result.ecosystems).toContain("web");
      expect(result.suggestedPreset).toBe("web");
    });

    it("detects Web from tsconfig.json", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["tsconfig.json"]));
      expect(result.ecosystems).toContain("web");
      expect(result.suggestedPreset).toBe("web");
    });

    it("detects Web from vite.config.ts", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["vite.config.ts"]));
      expect(result.ecosystems).toContain("web");
    });

    it("detects DevOps from Dockerfile", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Dockerfile"]));
      expect(result.ecosystems).toContain("devops");
      expect(result.suggestedPreset).toBe("devops");
    });

    it("detects DevOps from docker-compose.yml", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["docker-compose.yml"]));
      expect(result.ecosystems).toContain("devops");
    });

    it("detects DevOps from k8s directory", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["k8s"]));
      expect(result.ecosystems).toContain("devops");
    });

    it("detects Make from Makefile", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Makefile"]));
      expect(result.ecosystems).toContain("make");
      expect(result.suggestedPreset).toBe("web");
    });

    it("detects Make from justfile", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["justfile"]));
      expect(result.ecosystems).toContain("make");
    });

    it("detects JVM from build.gradle", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["build.gradle"]));
      expect(result.ecosystems).toContain("jvm");
      expect(result.suggestedPreset).toBe("jvm");
    });

    it("detects JVM from pom.xml", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["pom.xml"]));
      expect(result.ecosystems).toContain("jvm");
    });

    it("detects Ruby from Gemfile", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Gemfile"]));
      expect(result.ecosystems).toContain("ruby");
      expect(result.suggestedPreset).toBe("ruby");
    });

    it("detects Swift from Package.swift", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Package.swift"]));
      expect(result.ecosystems).toContain("swift");
      expect(result.suggestedPreset).toBe("swift");
    });
  });

  describe("mixed project detection", () => {
    it("suggests primary preset when combined with devops", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["package.json", "Dockerfile"]));
      expect(result.ecosystems).toContain("web");
      expect(result.ecosystems).toContain("devops");
      expect(result.suggestedPreset).toBe("web");
    });

    it("suggests primary preset when combined with make", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["go.mod", "Makefile"]));
      expect(result.ecosystems).toContain("go");
      expect(result.ecosystems).toContain("make");
      expect(result.suggestedPreset).toBe("go");
    });

    it("suggests full for two primary ecosystems", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["package.json", "pyproject.toml"]));
      expect(result.ecosystems).toContain("web");
      expect(result.ecosystems).toContain("python");
      expect(result.suggestedPreset).toBe("full");
    });

    it("suggests full for three ecosystems", () => {
      const result = detectProjectType(
        DIR,
        mockExists(DIR, ["Cargo.toml", "go.mod", "package.json"]),
      );
      expect(result.suggestedPreset).toBe("full");
    });

    it("suggests primary preset when combined with devops and make", () => {
      const result = detectProjectType(
        DIR,
        mockExists(DIR, ["pyproject.toml", "Dockerfile", "Makefile"]),
      );
      expect(result.ecosystems).toContain("python");
      expect(result.ecosystems).toContain("devops");
      expect(result.ecosystems).toContain("make");
      expect(result.suggestedPreset).toBe("python");
    });
  });

  describe("empty directory", () => {
    it("returns no ecosystems and no suggested preset", () => {
      const result = detectProjectType(DIR, () => false);
      expect(result.ecosystems).toEqual([]);
      expect(result.suggestedPreset).toBeUndefined();
    });
  });

  describe("only auxiliary ecosystems", () => {
    it("devops-only suggests devops", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Dockerfile"]));
      expect(result.ecosystems).toEqual(["devops"]);
      expect(result.suggestedPreset).toBe("devops");
    });

    it("make-only suggests web (fallback)", () => {
      const result = detectProjectType(DIR, mockExists(DIR, ["Makefile"]));
      expect(result.ecosystems).toEqual(["make"]);
      expect(result.suggestedPreset).toBe("web");
    });
  });
});
