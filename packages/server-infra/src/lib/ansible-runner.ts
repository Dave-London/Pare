import { run, type RunResult } from "@paretools/shared";

/** Runs an `ansible-playbook` command with the given arguments. */
export async function ansiblePlaybookCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ansible-playbook", args, { cwd, timeout: 600_000 });
}

/** Runs an `ansible-inventory` command with the given arguments. */
export async function ansibleInventoryCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ansible-inventory", args, { cwd, timeout: 300_000 });
}

/** Runs an `ansible-galaxy` command with the given arguments. */
export async function ansibleGalaxyCmd(args: string[], cwd?: string): Promise<RunResult> {
  return run("ansible-galaxy", args, { cwd, timeout: 600_000 });
}
