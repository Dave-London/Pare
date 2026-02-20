import type {
  VagrantStatusResult,
  VagrantGlobalStatusResult,
  VagrantUpResult,
  VagrantLifecycleResult,
} from "../schemas/vagrant.js";

// ── Full formatters ────────────────────────────────────────────────

export function formatVagrantStatus(data: VagrantStatusResult): string {
  const lines: string[] = [`vagrant status: ${data.count} machine(s)`];
  for (const m of data.machines) {
    lines.push(`  ${m.name}: ${m.state} (${m.provider})`);
  }
  return lines.join("\n");
}

export function formatVagrantGlobalStatus(data: VagrantGlobalStatusResult): string {
  const lines: string[] = [`vagrant global-status: ${data.count} machine(s)`];
  for (const m of data.machines) {
    lines.push(`  ${m.id} ${m.name}: ${m.state} (${m.provider}) ${m.directory}`);
  }
  return lines.join("\n");
}

export function formatVagrantUp(data: VagrantUpResult): string {
  const lines: string[] = [data.success ? "vagrant up: success" : "vagrant up: failed"];
  for (const m of data.machines) {
    lines.push(`  ${m.name}: ${m.state} (${m.provider})`);
  }
  if (data.warnings) {
    for (const w of data.warnings) lines.push(`warning: ${w}`);
  }
  return lines.join("\n");
}

export function formatVagrantLifecycle(data: VagrantLifecycleResult): string {
  const lines: string[] = [
    data.success ? `vagrant ${data.action}: success` : `vagrant ${data.action}: failed`,
  ];
  for (const m of data.machines) {
    lines.push(`  ${m.name}: ${m.newState}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ─────────────────────────

export interface VagrantStatusCompact {
  [key: string]: unknown;
  success: boolean;
  count: number;
}

export function compactVagrantStatusMap(data: VagrantStatusResult): VagrantStatusCompact {
  return { success: data.success, count: data.count };
}

export function formatVagrantStatusCompact(data: VagrantStatusCompact): string {
  return `vagrant status: ${data.count} machine(s)`;
}

export interface VagrantGlobalStatusCompact {
  [key: string]: unknown;
  success: boolean;
  count: number;
}

export function compactVagrantGlobalStatusMap(
  data: VagrantGlobalStatusResult,
): VagrantGlobalStatusCompact {
  return { success: data.success, count: data.count };
}

export function formatVagrantGlobalStatusCompact(data: VagrantGlobalStatusCompact): string {
  return `vagrant global-status: ${data.count} machine(s)`;
}

export interface VagrantUpCompact {
  [key: string]: unknown;
  success: boolean;
  machineCount: number;
  warningCount: number;
}

export function compactVagrantUpMap(data: VagrantUpResult): VagrantUpCompact {
  return {
    success: data.success,
    machineCount: data.machines.length,
    warningCount: data.warnings?.length ?? 0,
  };
}

export function formatVagrantUpCompact(data: VagrantUpCompact): string {
  if (!data.success) return "vagrant up: failed";
  return `vagrant up: ${data.machineCount} machine(s) started${data.warningCount > 0 ? ` (${data.warningCount} warnings)` : ""}`;
}

export interface VagrantLifecycleCompact {
  [key: string]: unknown;
  success: boolean;
  action: string;
  machineCount: number;
}

export function compactVagrantLifecycleMap(data: VagrantLifecycleResult): VagrantLifecycleCompact {
  return {
    success: data.success,
    action: data.action,
    machineCount: data.machines.length,
  };
}

export function formatVagrantLifecycleCompact(data: VagrantLifecycleCompact): string {
  if (!data.success) return `vagrant ${data.action}: failed`;
  return `vagrant ${data.action}: ${data.machineCount} machine(s)`;
}
