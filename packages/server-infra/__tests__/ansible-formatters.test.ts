import { describe, it, expect } from "vitest";
import {
  formatAnsiblePlaybook,
  compactAnsiblePlaybookMap,
  formatAnsiblePlaybookCompact,
  formatAnsibleInventory,
  compactAnsibleInventoryMap,
  formatAnsibleInventoryCompact,
  formatAnsibleGalaxy,
  compactAnsibleGalaxyMap,
  formatAnsibleGalaxyCompact,
} from "../src/lib/ansible-formatters.js";
import type {
  AnsiblePlaybookResult,
  AnsibleInventoryResult,
  AnsibleGalaxyResult,
} from "../src/schemas/ansible.js";

// ── ansible-playbook formatters ───────────────────────────────────

describe("formatAnsiblePlaybook", () => {
  it("formats successful playbook run", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      plays: [{ name: "webservers" }],
      recap: [
        {
          host: "web1",
          ok: 2,
          changed: 1,
          unreachable: 0,
          failed: 0,
          skipped: 0,
          rescued: 0,
          ignored: 0,
        },
      ],
      duration: "12 seconds",
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("ansible-playbook: success");
    expect(result).toContain("PLAY: webservers");
    expect(result).toContain("web1: ok=2 changed=1");
    expect(result).toContain("duration: 12 seconds");
  });

  it("formats failed playbook run", () => {
    const data: AnsiblePlaybookResult = {
      success: false,
      exitCode: 2,
      error: "ERROR! the playbook: missing.yml could not be found",
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("ansible-playbook: failed");
    expect(result).toContain("ERROR!");
  });

  it("formats syntax check success", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      syntaxOk: true,
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("--syntax-check: OK");
  });

  it("formats syntax check failure", () => {
    const data: AnsiblePlaybookResult = {
      success: false,
      exitCode: 4,
      syntaxOk: false,
      error: "Syntax Error",
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("--syntax-check: FAILED");
    expect(result).toContain("Syntax Error");
  });

  it("formats --list-tasks output", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      taskList: ["Install nginx", "Configure nginx", "Start nginx"],
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("--list-tasks:");
    expect(result).toContain("Install nginx");
    expect(result).toContain("Configure nginx");
  });

  it("formats --list-tags output", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      tagList: ["web", "config", "deploy"],
    };
    const result = formatAnsiblePlaybook(data);
    expect(result).toContain("--list-tags:");
    expect(result).toContain("web");
    expect(result).toContain("config");
  });
});

describe("compact ansible-playbook", () => {
  it("maps and formats compact playbook result", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      plays: [{ name: "webservers" }],
      recap: [
        {
          host: "web1",
          ok: 2,
          changed: 1,
          unreachable: 0,
          failed: 0,
          skipped: 0,
          rescued: 0,
          ignored: 0,
        },
        {
          host: "web2",
          ok: 2,
          changed: 1,
          unreachable: 0,
          failed: 0,
          skipped: 0,
          rescued: 0,
          ignored: 0,
        },
      ],
    };

    const compact = compactAnsiblePlaybookMap(data);
    expect(compact.success).toBe(true);
    expect(compact.hostCount).toBe(2);
    expect(compact.totalChanged).toBe(2);
    expect(compact.totalFailed).toBe(0);

    const text = formatAnsiblePlaybookCompact(compact);
    expect(text).toBe("ansible-playbook: 2 host(s), 2 changed, 0 failed");
  });

  it("formats compact failed run", () => {
    const compact = { success: false, exitCode: 1, hostCount: 0, totalChanged: 0, totalFailed: 0 };
    expect(formatAnsiblePlaybookCompact(compact)).toBe("ansible-playbook: failed");
  });

  it("handles no recap data", () => {
    const data: AnsiblePlaybookResult = {
      success: true,
      exitCode: 0,
      syntaxOk: true,
    };

    const compact = compactAnsiblePlaybookMap(data);
    expect(compact.hostCount).toBe(0);
    expect(compact.totalChanged).toBe(0);
  });
});

// ── ansible-inventory formatters ──────────────────────────────────

describe("formatAnsibleInventory", () => {
  it("formats inventory list", () => {
    const data: AnsibleInventoryResult = {
      success: true,
      exitCode: 0,
      groups: [
        { name: "webservers", hosts: ["host1", "host2"] },
        { name: "dbservers", hosts: ["db1"], children: ["replica-servers"] },
      ],
    };
    const result = formatAnsibleInventory(data);
    expect(result).toContain("ansible-inventory: success");
    expect(result).toContain("webservers (2 hosts)");
    expect(result).toContain("host1");
    expect(result).toContain("host2");
    expect(result).toContain("children: replica-servers");
  });

  it("formats graph output", () => {
    const data: AnsibleInventoryResult = {
      success: true,
      exitCode: 0,
      graph: "@all:\n  |--@webservers:\n  |  |--host1",
    };
    const result = formatAnsibleInventory(data);
    expect(result).toContain("ansible-inventory --graph:");
    expect(result).toContain("@all:");
  });

  it("formats host detail", () => {
    const data: AnsibleInventoryResult = {
      success: true,
      exitCode: 0,
      hostDetail: {
        name: "web1",
        vars: { ansible_host: "192.168.1.1", http_port: 80 },
      },
    };
    const result = formatAnsibleInventory(data);
    expect(result).toContain("ansible-inventory --host web1:");
    expect(result).toContain('ansible_host: "192.168.1.1"');
    expect(result).toContain("http_port: 80");
  });

  it("formats error", () => {
    const data: AnsibleInventoryResult = {
      success: false,
      exitCode: 1,
      error: "Unable to parse inventory",
    };
    const result = formatAnsibleInventory(data);
    expect(result).toContain("ansible-inventory: failed");
    expect(result).toContain("Unable to parse");
  });
});

describe("compact ansible-inventory", () => {
  it("maps and formats compact inventory", () => {
    const data: AnsibleInventoryResult = {
      success: true,
      exitCode: 0,
      groups: [
        { name: "webservers", hosts: ["host1", "host2"] },
        { name: "dbservers", hosts: ["db1"] },
      ],
    };

    const compact = compactAnsibleInventoryMap(data);
    expect(compact.success).toBe(true);
    expect(compact.groupCount).toBe(2);

    const text = formatAnsibleInventoryCompact(compact);
    expect(text).toBe("ansible-inventory: 2 group(s)");
  });

  it("formats compact failed inventory", () => {
    const compact = { success: false, exitCode: 1, groupCount: 0 };
    expect(formatAnsibleInventoryCompact(compact)).toBe("ansible-inventory: failed");
  });
});

// ── ansible-galaxy formatters ─────────────────────────────────────

describe("formatAnsibleGalaxy", () => {
  it("formats collection install", () => {
    const data: AnsibleGalaxyResult = {
      success: true,
      exitCode: 0,
      action: "collection-install",
      installed: [{ name: "community.general", version: "5.0.0" }],
    };
    const result = formatAnsibleGalaxy(data);
    expect(result).toContain("ansible-galaxy collection-install: success");
    expect(result).toContain("installed: community.general (5.0.0)");
  });

  it("formats collection list", () => {
    const data: AnsibleGalaxyResult = {
      success: true,
      exitCode: 0,
      action: "collection-list",
      items: [
        { name: "community.general", version: "6.6.0" },
        { name: "amazon.aws", version: "5.4.0" },
      ],
    };
    const result = formatAnsibleGalaxy(data);
    expect(result).toContain("ansible-galaxy collection-list: success");
    expect(result).toContain("community.general 6.6.0");
    expect(result).toContain("amazon.aws 5.4.0");
  });

  it("formats failed galaxy action", () => {
    const data: AnsibleGalaxyResult = {
      success: false,
      exitCode: 1,
      action: "role-install",
      error: "ERROR! Failed to resolve role",
    };
    const result = formatAnsibleGalaxy(data);
    expect(result).toContain("ansible-galaxy role-install: failed");
    expect(result).toContain("ERROR!");
  });

  it("formats install without version", () => {
    const data: AnsibleGalaxyResult = {
      success: true,
      exitCode: 0,
      action: "role-install",
      installed: [{ name: "geerlingguy.nginx" }],
    };
    const result = formatAnsibleGalaxy(data);
    expect(result).toContain("installed: geerlingguy.nginx");
    expect(result).not.toContain("(undefined)");
  });
});

describe("compact ansible-galaxy", () => {
  it("maps and formats compact galaxy install", () => {
    const data: AnsibleGalaxyResult = {
      success: true,
      exitCode: 0,
      action: "collection-install",
      installed: [
        { name: "community.general", version: "5.0.0" },
        { name: "amazon.aws", version: "5.4.0" },
      ],
    };

    const compact = compactAnsibleGalaxyMap(data);
    expect(compact.success).toBe(true);
    expect(compact.action).toBe("collection-install");
    expect(compact.itemCount).toBe(2);

    const text = formatAnsibleGalaxyCompact(compact);
    expect(text).toBe("ansible-galaxy collection-install: 2 item(s)");
  });

  it("maps and formats compact galaxy list", () => {
    const data: AnsibleGalaxyResult = {
      success: true,
      exitCode: 0,
      action: "role-list",
      items: [{ name: "geerlingguy.nginx", version: "3.1.0" }],
    };

    const compact = compactAnsibleGalaxyMap(data);
    expect(compact.itemCount).toBe(1);
  });

  it("formats compact failed galaxy", () => {
    const compact = { success: false, exitCode: 1, action: "collection-install", itemCount: 0 };
    expect(formatAnsibleGalaxyCompact(compact)).toBe("ansible-galaxy collection-install: failed");
  });
});
