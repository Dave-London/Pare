import { run, runPythonTool, type RunResult } from "@paretools/shared";

export async function pip(args: string[], cwd?: string, pythonPath?: string): Promise<RunResult> {
  return runPythonTool("pip", "pip", args, { cwd, pythonPath, timeout: 180_000 });
}

export async function mypy(args: string[], cwd?: string, pythonPath?: string): Promise<RunResult> {
  return runPythonTool("mypy", "mypy", args, { cwd, pythonPath, timeout: 180_000 });
}

export async function ruff(args: string[], cwd?: string, pythonPath?: string): Promise<RunResult> {
  return runPythonTool("ruff", "ruff", args, { cwd, pythonPath, timeout: 180_000 });
}

export async function pytest(
  args: string[],
  cwd?: string,
  pythonPath?: string,
): Promise<RunResult> {
  return runPythonTool("pytest", "pytest", args, { cwd, pythonPath, timeout: 300_000 });
}

export async function uv(args: string[], cwd?: string): Promise<RunResult> {
  return run("uv", args, { cwd, timeout: 180_000 });
}

export async function black(args: string[], cwd?: string, pythonPath?: string): Promise<RunResult> {
  return runPythonTool("black", "black", args, { cwd, pythonPath, timeout: 180_000 });
}

export async function conda(args: string[], cwd?: string): Promise<RunResult> {
  return run("conda", args, { cwd, timeout: 180_000 });
}

export async function pyenv(args: string[], cwd?: string): Promise<RunResult> {
  return run("pyenv", args, { cwd, timeout: 180_000 });
}
export async function poetry(args: string[], cwd?: string): Promise<RunResult> {
  return run("poetry", args, { cwd, timeout: 180_000 });
}

/** pip-audit is a standalone binary, NOT a pip subcommand. */
export async function pipAudit(
  args: string[],
  cwd?: string,
  pythonPath?: string,
): Promise<RunResult> {
  return runPythonTool("pip-audit", "pip_audit", args, { cwd, pythonPath, timeout: 180_000 });
}
