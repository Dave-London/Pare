import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

export type Framework = "pytest" | "jest" | "vitest" | "mocha";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(cwd: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(join(cwd, "package.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown>, name: string): boolean {
  const deps = pkg.devDependencies as Record<string, string> | undefined;
  const prodDeps = pkg.dependencies as Record<string, string> | undefined;
  return !!(deps?.[name] || prodDeps?.[name]);
}

/**
 * Auto-detects the test framework in use at the given directory.
 * Priority: vitest > jest > mocha > pytest (check most specific first).
 */
export async function detectFramework(cwd: string): Promise<Framework> {
  const pkg = await readPackageJson(cwd);

  // Vitest: config file or dependency
  if (
    (await exists(join(cwd, "vitest.config.ts"))) ||
    (await exists(join(cwd, "vitest.config.js"))) ||
    (await exists(join(cwd, "vitest.config.mts"))) ||
    (pkg && hasDep(pkg, "vitest"))
  ) {
    return "vitest";
  }

  // Jest: config file or dependency
  if (
    (await exists(join(cwd, "jest.config.js"))) ||
    (await exists(join(cwd, "jest.config.ts"))) ||
    (await exists(join(cwd, "jest.config.mjs"))) ||
    (pkg && hasDep(pkg, "jest"))
  ) {
    return "jest";
  }

  // Mocha: config file or dependency
  if (
    (await exists(join(cwd, ".mocharc.yml"))) ||
    (await exists(join(cwd, ".mocharc.yaml"))) ||
    (await exists(join(cwd, ".mocharc.json"))) ||
    (await exists(join(cwd, ".mocharc.js"))) ||
    (await exists(join(cwd, ".mocharc.cjs"))) ||
    (pkg && hasDep(pkg, "mocha"))
  ) {
    return "mocha";
  }

  // Pytest: Python project markers
  if (
    (await exists(join(cwd, "pytest.ini"))) ||
    (await exists(join(cwd, "setup.cfg"))) ||
    (await exists(join(cwd, "pyproject.toml"))) ||
    (await exists(join(cwd, "conftest.py")))
  ) {
    return "pytest";
  }

  throw new Error(
    "No supported test framework detected. Supported: vitest, jest, mocha, pytest. " +
      "Ensure the project has the framework installed or a config file present.",
  );
}
