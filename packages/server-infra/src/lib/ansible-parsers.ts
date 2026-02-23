import type {
  AnsiblePlaybookResult,
  AnsibleHostRecap,
  AnsiblePlay,
  AnsibleInventoryResult,
  AnsibleInventoryGroup,
  AnsibleInventoryHost,
  AnsibleGalaxyResult,
  AnsibleGalaxyItem,
} from "../schemas/ansible.js";

// ── ansible-playbook ──────────────────────────────────────────────

/**
 * Parse the PLAY RECAP section of ansible-playbook output.
 *
 * Example line:
 *   host1 : ok=2 changed=1 unreachable=0 failed=0 skipped=1 rescued=0 ignored=0
 */
function parseRecap(text: string): AnsibleHostRecap[] {
  const recaps: AnsibleHostRecap[] = [];
  const recapMatch = text.indexOf("PLAY RECAP");
  if (recapMatch === -1) return recaps;

  const recapSection = text.slice(recapMatch);
  const lines = recapSection.split("\n").slice(1); // skip the "PLAY RECAP ***" line

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: hostname : ok=N changed=N unreachable=N failed=N skipped=N rescued=N ignored=N
    const m = trimmed.match(
      /^(\S+)\s*:\s*ok=(\d+)\s+changed=(\d+)\s+unreachable=(\d+)\s+failed=(\d+)\s+skipped=(\d+)\s+rescued=(\d+)\s+ignored=(\d+)/,
    );
    if (m) {
      recaps.push({
        host: m[1],
        ok: parseInt(m[2], 10),
        changed: parseInt(m[3], 10),
        unreachable: parseInt(m[4], 10),
        failed: parseInt(m[5], 10),
        skipped: parseInt(m[6], 10),
        rescued: parseInt(m[7], 10),
        ignored: parseInt(m[8], 10),
      });
    }
  }

  return recaps;
}

/** Parse PLAY headers from ansible-playbook output. */
function parsePlays(text: string): AnsiblePlay[] {
  const plays: AnsiblePlay[] = [];
  // Match: PLAY [play name] ***
  const playRegex = /^PLAY \[([^\]]*)\]/gm;
  let match;
  while ((match = playRegex.exec(text)) !== null) {
    plays.push({ name: match[1] });
  }
  return plays;
}

/** Parse duration from ansible-playbook output footer. */
function parseDuration(text: string): string | undefined {
  // Ansible outputs a "Playbook run took X days, H hours, M minutes, S seconds" line
  // or just the time in the recap area
  const m = text.match(/Playbook run took (.+)/);
  return m ? m[1].trim() : undefined;
}

/** Parse --list-tasks output. */
function parseTaskList(text: string): string[] {
  const tasks: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Task lines are indented and follow the play header
    // Format: "taskname\tTAGS: [tag1, tag2]" or just "taskname"
    if (trimmed && !trimmed.startsWith("play #") && !trimmed.startsWith("PLAY") && trimmed !== "") {
      // Remove TAGS suffix if present
      const taskMatch = trimmed.match(/^(.+?)(?:\s+TAGS:\s*\[.*\])?$/);
      if (taskMatch && taskMatch[1]) {
        const taskName = taskMatch[1].trim();
        if (taskName && !taskName.startsWith("pattern:") && !taskName.startsWith("tasks:")) {
          tasks.push(taskName);
        }
      }
    }
  }
  return tasks;
}

/** Parse --list-tags output. */
function parseTagList(text: string): string[] {
  const tags = new Set<string>();
  // Look for "TASK TAGS: [tag1, tag2, ...]" lines
  const tagRegex = /TASK TAGS:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const tagStr = match[1];
    for (const tag of tagStr.split(",")) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return Array.from(tags);
}

export function parseAnsiblePlaybookOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  options?: { syntaxCheck?: boolean; listTasks?: boolean; listTags?: boolean },
): AnsiblePlaybookResult {
  const combined = stdout + "\n" + stderr;
  const success = exitCode === 0;

  // Syntax check mode
  if (options?.syntaxCheck) {
    return {
      success,
      exitCode,
      syntaxOk: success,
      error: !success ? combined.trim() || undefined : undefined,
    };
  }

  // List tasks mode
  if (options?.listTasks) {
    const taskList = parseTaskList(combined);
    return {
      success,
      exitCode,
      taskList: taskList.length > 0 ? taskList : undefined,
      error: !success ? combined.trim() || undefined : undefined,
    };
  }

  // List tags mode
  if (options?.listTags) {
    const tagList = parseTagList(combined);
    return {
      success,
      exitCode,
      tagList: tagList.length > 0 ? tagList : undefined,
      error: !success ? combined.trim() || undefined : undefined,
    };
  }

  // Normal playbook run or check (dry-run)
  const recap = parseRecap(combined);
  const plays = parsePlays(combined);
  const duration = parseDuration(combined);

  return {
    success,
    exitCode,
    plays: plays.length > 0 ? plays : undefined,
    recap: recap.length > 0 ? recap : undefined,
    duration,
    error: !success && recap.length === 0 ? combined.trim() || undefined : undefined,
  };
}

// ── ansible-inventory ─────────────────────────────────────────────

/** Parse JSON output from `ansible-inventory --list`. */
export function parseAnsibleInventoryListOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): AnsibleInventoryResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      exitCode,
      error: (stderr || stdout).trim() || undefined,
    };
  }

  try {
    const data = JSON.parse(stdout) as Record<string, unknown>;
    const groups: AnsibleInventoryGroup[] = [];

    // Ansible --list output has group names as keys, each with hosts/children/vars
    // Plus a special "_meta" key with hostvars
    for (const [groupName, groupData] of Object.entries(data)) {
      if (groupName === "_meta") continue;

      if (typeof groupData === "object" && groupData !== null) {
        const gd = groupData as Record<string, unknown>;
        const hosts = Array.isArray(gd.hosts) ? (gd.hosts as string[]) : [];
        const children = Array.isArray(gd.children) ? (gd.children as string[]) : undefined;
        const vars =
          typeof gd.vars === "object" && gd.vars !== null
            ? (gd.vars as Record<string, unknown>)
            : undefined;

        groups.push({
          name: groupName,
          hosts,
          children: children && children.length > 0 ? children : undefined,
          vars: vars && Object.keys(vars).length > 0 ? vars : undefined,
        });
      }
    }

    return {
      success,
      exitCode,
      groups: groups.length > 0 ? groups : undefined,
    };
  } catch {
    return {
      success: false,
      exitCode,
      error: `Failed to parse inventory JSON: ${stdout.slice(0, 200)}`,
    };
  }
}

/** Parse `--graph` output from ansible-inventory. */
export function parseAnsibleInventoryGraphOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): AnsibleInventoryResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      exitCode,
      error: (stderr || stdout).trim() || undefined,
    };
  }

  return {
    success,
    exitCode,
    graph: stdout.trim() || undefined,
  };
}

/** Parse `--host` output from ansible-inventory. */
export function parseAnsibleInventoryHostOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  hostName: string,
): AnsibleInventoryResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      exitCode,
      error: (stderr || stdout).trim() || undefined,
    };
  }

  try {
    const vars = JSON.parse(stdout) as Record<string, unknown>;
    const hostDetail: AnsibleInventoryHost = {
      name: hostName,
      vars: Object.keys(vars).length > 0 ? vars : undefined,
    };

    return {
      success,
      exitCode,
      hostDetail,
    };
  } catch {
    return {
      success: false,
      exitCode,
      error: `Failed to parse host vars JSON: ${stdout.slice(0, 200)}`,
    };
  }
}

// ── ansible-galaxy ────────────────────────────────────────────────

/** Parse `ansible-galaxy collection install` or `role install` output. */
export function parseAnsibleGalaxyInstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action: "collection-install" | "role-install",
): AnsibleGalaxyResult {
  const combined = stdout + "\n" + stderr;
  const success = exitCode === 0;
  const installed: AnsibleGalaxyItem[] = [];

  if (action === "collection-install") {
    // Lines like: "namespace.collection (1.2.3) was installed successfully"
    // or: "Installing 'namespace.collection:1.2.3' to ..."
    const installRegex = /Installing '([^':]+)(?::([^']+))?'/g;
    let match;
    while ((match = installRegex.exec(combined)) !== null) {
      installed.push({
        name: match[1],
        version: match[2] || undefined,
      });
    }

    // Also check for "was installed successfully" pattern
    const successRegex = /(\S+)\s+\(([^)]+)\)\s+was installed successfully/g;
    while ((match = successRegex.exec(combined)) !== null) {
      // Avoid duplicates
      if (!installed.some((i) => i.name === match![1])) {
        installed.push({
          name: match[1],
          version: match[2] || undefined,
        });
      }
    }
  } else {
    // role install: "- extracting rolename to /path..."
    // or "- rolename (version) was installed successfully"
    const roleRegex = /-\s+(\S+)\s+\(([^)]+)\)\s+was installed successfully/g;
    let match;
    while ((match = roleRegex.exec(combined)) !== null) {
      installed.push({
        name: match[1],
        version: match[2] || undefined,
      });
    }

    // Also: "- extracting rolename to ..."
    const extractRegex = /-\s+extracting\s+(\S+)\s+to/g;
    while ((match = extractRegex.exec(combined)) !== null) {
      if (!installed.some((i) => i.name === match![1])) {
        installed.push({ name: match[1] });
      }
    }
  }

  return {
    success,
    exitCode,
    action,
    installed: installed.length > 0 ? installed : undefined,
    error: !success ? combined.trim() || undefined : undefined,
  };
}

/** Parse `ansible-galaxy collection list` or `role list` output. */
export function parseAnsibleGalaxyListOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action: "collection-list" | "role-list",
): AnsibleGalaxyResult {
  const combined = stdout + "\n" + stderr;
  const success = exitCode === 0;
  const items: AnsibleGalaxyItem[] = [];

  if (action === "collection-list") {
    // Lines like: "namespace.collection 1.2.3"
    // Skip header lines starting with # or Collection
    const lines = stdout.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("Collection")) continue;
      if (trimmed.startsWith("---")) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts[0].includes(".")) {
        items.push({
          name: parts[0],
          version: parts[1],
        });
      }
    }
  } else {
    // role list: "- rolename, version"
    const lines = stdout.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(/^-\s+(\S+),\s*(.+)/);
      if (m) {
        items.push({
          name: m[1],
          version: m[2].trim(),
        });
      }
    }
  }

  return {
    success,
    exitCode,
    action,
    items: items.length > 0 ? items : undefined,
    error: !success ? combined.trim() || undefined : undefined,
  };
}
