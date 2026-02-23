import type {
  AnsiblePlaybookResult,
  AnsibleInventoryResult,
  AnsibleGalaxyResult,
} from "../schemas/ansible.js";

// ── ansible-playbook: full formatter ──────────────────────────────

export function formatAnsiblePlaybook(data: AnsiblePlaybookResult): string {
  const lines: string[] = [];

  if (data.syntaxOk !== undefined) {
    lines.push(
      data.syntaxOk
        ? "ansible-playbook --syntax-check: OK"
        : "ansible-playbook --syntax-check: FAILED",
    );
    if (data.error) lines.push(`error: ${data.error}`);
    return lines.join("\n");
  }

  if (data.taskList) {
    lines.push("ansible-playbook --list-tasks:");
    for (const task of data.taskList) {
      lines.push(`  ${task}`);
    }
    return lines.join("\n");
  }

  if (data.tagList) {
    lines.push("ansible-playbook --list-tags:");
    for (const tag of data.tagList) {
      lines.push(`  ${tag}`);
    }
    return lines.join("\n");
  }

  lines.push(data.success ? "ansible-playbook: success" : "ansible-playbook: failed");

  if (data.plays) {
    for (const play of data.plays) {
      lines.push(`  PLAY: ${play.name}`);
    }
  }

  if (data.recap) {
    lines.push("  PLAY RECAP:");
    for (const r of data.recap) {
      lines.push(
        `    ${r.host}: ok=${r.ok} changed=${r.changed} unreachable=${r.unreachable} failed=${r.failed} skipped=${r.skipped} rescued=${r.rescued} ignored=${r.ignored}`,
      );
    }
  }

  if (data.duration) lines.push(`  duration: ${data.duration}`);
  if (data.error) lines.push(`error: ${data.error}`);

  return lines.join("\n");
}

// ── ansible-playbook: compact ─────────────────────────────────────

export interface AnsiblePlaybookCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  hostCount: number;
  totalChanged: number;
  totalFailed: number;
}

export function compactAnsiblePlaybookMap(data: AnsiblePlaybookResult): AnsiblePlaybookCompact {
  let hostCount = 0;
  let totalChanged = 0;
  let totalFailed = 0;

  if (data.recap) {
    hostCount = data.recap.length;
    for (const r of data.recap) {
      totalChanged += r.changed;
      totalFailed += r.failed;
    }
  }

  return {
    success: data.success,
    exitCode: data.exitCode,
    hostCount,
    totalChanged,
    totalFailed,
  };
}

export function formatAnsiblePlaybookCompact(data: AnsiblePlaybookCompact): string {
  if (!data.success) return "ansible-playbook: failed";
  return `ansible-playbook: ${data.hostCount} host(s), ${data.totalChanged} changed, ${data.totalFailed} failed`;
}

// ── ansible-inventory: full formatter ─────────────────────────────

export function formatAnsibleInventory(data: AnsibleInventoryResult): string {
  const lines: string[] = [];

  if (data.graph) {
    lines.push("ansible-inventory --graph:");
    lines.push(data.graph);
    return lines.join("\n");
  }

  if (data.hostDetail) {
    lines.push(`ansible-inventory --host ${data.hostDetail.name}:`);
    if (data.hostDetail.vars) {
      for (const [key, value] of Object.entries(data.hostDetail.vars)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }
    return lines.join("\n");
  }

  lines.push(data.success ? "ansible-inventory: success" : "ansible-inventory: failed");

  if (data.groups) {
    for (const group of data.groups) {
      const hostStr = group.hosts.length > 0 ? ` (${group.hosts.length} hosts)` : "";
      lines.push(`  ${group.name}${hostStr}`);
      for (const h of group.hosts) {
        lines.push(`    ${h}`);
      }
      if (group.children) {
        lines.push(`    children: ${group.children.join(", ")}`);
      }
    }
  }

  if (data.error) lines.push(`error: ${data.error}`);

  return lines.join("\n");
}

// ── ansible-inventory: compact ────────────────────────────────────

export interface AnsibleInventoryCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  groupCount: number;
}

export function compactAnsibleInventoryMap(data: AnsibleInventoryResult): AnsibleInventoryCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    groupCount: data.groups?.length ?? 0,
  };
}

export function formatAnsibleInventoryCompact(data: AnsibleInventoryCompact): string {
  if (!data.success) return "ansible-inventory: failed";
  return `ansible-inventory: ${data.groupCount} group(s)`;
}

// ── ansible-galaxy: full formatter ────────────────────────────────

export function formatAnsibleGalaxy(data: AnsibleGalaxyResult): string {
  const lines: string[] = [];

  lines.push(
    data.success
      ? `ansible-galaxy ${data.action}: success`
      : `ansible-galaxy ${data.action}: failed`,
  );

  if (data.installed) {
    for (const item of data.installed) {
      lines.push(`  installed: ${item.name}${item.version ? ` (${item.version})` : ""}`);
    }
  }

  if (data.items) {
    for (const item of data.items) {
      lines.push(`  ${item.name}${item.version ? ` ${item.version}` : ""}`);
    }
  }

  if (data.duration) lines.push(`  duration: ${data.duration}`);
  if (data.error) lines.push(`error: ${data.error}`);

  return lines.join("\n");
}

// ── ansible-galaxy: compact ───────────────────────────────────────

export interface AnsibleGalaxyCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  action: string;
  itemCount: number;
}

export function compactAnsibleGalaxyMap(data: AnsibleGalaxyResult): AnsibleGalaxyCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    action: data.action,
    itemCount: (data.installed?.length ?? 0) + (data.items?.length ?? 0),
  };
}

export function formatAnsibleGalaxyCompact(data: AnsibleGalaxyCompact): string {
  if (!data.success) return `ansible-galaxy ${data.action}: failed`;
  return `ansible-galaxy ${data.action}: ${data.itemCount} item(s)`;
}
