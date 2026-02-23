import { describe, it, expect } from "vitest";
import {
  parseAnsiblePlaybookOutput,
  parseAnsibleInventoryListOutput,
  parseAnsibleInventoryGraphOutput,
  parseAnsibleInventoryHostOutput,
  parseAnsibleGalaxyInstallOutput,
  parseAnsibleGalaxyListOutput,
} from "../src/lib/ansible-parsers.js";

// ── ansible-playbook parsing ──────────────────────────────────────

describe("parseAnsiblePlaybookOutput", () => {
  it("parses successful playbook run with recap", () => {
    const stdout = `
PLAY [webservers] *************************************************************

TASK [Gathering Facts] ********************************************************
ok: [web1]
ok: [web2]

TASK [Install nginx] **********************************************************
changed: [web1]
changed: [web2]

PLAY RECAP *********************************************************************
web1                       : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
web2                       : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0

Playbook run took 0 days, 0 hours, 0 minutes, 12 seconds
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.plays).toEqual([{ name: "webservers" }]);
    expect(result.recap).toHaveLength(2);
    expect(result.recap![0]).toEqual({
      host: "web1",
      ok: 2,
      changed: 1,
      unreachable: 0,
      failed: 0,
      skipped: 0,
      rescued: 0,
      ignored: 0,
    });
    expect(result.recap![1]).toEqual({
      host: "web2",
      ok: 2,
      changed: 1,
      unreachable: 0,
      failed: 0,
      skipped: 0,
      rescued: 0,
      ignored: 0,
    });
    expect(result.duration).toBe("0 days, 0 hours, 0 minutes, 12 seconds");
  });

  it("parses failed playbook run", () => {
    const stdout = `
PLAY [all] *********************************************************************

TASK [Gathering Facts] ********************************************************
unreachable: [host1]

PLAY RECAP *********************************************************************
host1                      : ok=0    changed=0    unreachable=1    failed=0    skipped=0    rescued=0    ignored=0
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 4);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(4);
    expect(result.recap).toHaveLength(1);
    expect(result.recap![0].unreachable).toBe(1);
  });

  it("parses multiple plays", () => {
    const stdout = `
PLAY [webservers] *************************************************************

TASK [Install nginx] **********************************************************
ok: [web1]

PLAY [dbservers] **************************************************************

TASK [Install postgres] *******************************************************
changed: [db1]

PLAY RECAP *********************************************************************
web1                       : ok=1    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
db1                        : ok=1    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0);

    expect(result.plays).toHaveLength(2);
    expect(result.plays![0].name).toBe("webservers");
    expect(result.plays![1].name).toBe("dbservers");
  });

  it("handles empty output on error", () => {
    const result = parseAnsiblePlaybookOutput(
      "",
      "ERROR! the playbook: missing.yml could not be found",
      1,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("ERROR!");
  });

  it("parses syntax check success", () => {
    const stdout = `
playbook: site.yml
`;
    const result = parseAnsiblePlaybookOutput(stdout, "", 0, { syntaxCheck: true });

    expect(result.success).toBe(true);
    expect(result.syntaxOk).toBe(true);
  });

  it("parses syntax check failure", () => {
    const stderr = `ERROR! Syntax Error while loading YAML.`;
    const result = parseAnsiblePlaybookOutput("", stderr, 4, { syntaxCheck: true });

    expect(result.success).toBe(false);
    expect(result.syntaxOk).toBe(false);
    expect(result.error).toContain("Syntax Error");
  });

  it("parses --list-tasks output", () => {
    const stdout = `
playbook: site.yml

  play #1 (webservers): webservers	TAGS: []
    tasks:
      Install nginx	TAGS: [web]
      Configure nginx	TAGS: [web, config]
      Start nginx	TAGS: [web]
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0, { listTasks: true });

    expect(result.success).toBe(true);
    expect(result.taskList).toBeDefined();
    expect(result.taskList!.length).toBeGreaterThan(0);
    expect(result.taskList!.some((t) => t.includes("Install nginx"))).toBe(true);
  });

  it("parses --list-tags output", () => {
    const stdout = `
playbook: site.yml

  play #1 (webservers): webservers	TAGS: []
      TASK TAGS: [config, web]
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0, { listTags: true });

    expect(result.success).toBe(true);
    expect(result.tagList).toBeDefined();
    expect(result.tagList).toContain("config");
    expect(result.tagList).toContain("web");
  });

  it("handles recap with all zeros", () => {
    const stdout = `
PLAY RECAP *********************************************************************
localhost                  : ok=0    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0);

    expect(result.recap).toHaveLength(1);
    expect(result.recap![0].host).toBe("localhost");
    expect(result.recap![0].ok).toBe(0);
  });

  it("handles no duration in output", () => {
    const stdout = `
PLAY RECAP *********************************************************************
host1                      : ok=1    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
`;

    const result = parseAnsiblePlaybookOutput(stdout, "", 0);

    expect(result.duration).toBeUndefined();
  });
});

// ── ansible-inventory parsing ─────────────────────────────────────

describe("parseAnsibleInventoryListOutput", () => {
  it("parses JSON inventory list", () => {
    const stdout = JSON.stringify({
      _meta: {
        hostvars: {
          host1: { ansible_host: "192.168.1.1" },
          host2: { ansible_host: "192.168.1.2" },
        },
      },
      all: {
        children: ["ungrouped", "webservers"],
      },
      webservers: {
        hosts: ["host1", "host2"],
      },
      ungrouped: {
        hosts: [],
      },
    });

    const result = parseAnsibleInventoryListOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.groups).toBeDefined();
    expect(result.groups!.length).toBe(3);

    const webservers = result.groups!.find((g) => g.name === "webservers");
    expect(webservers).toBeDefined();
    expect(webservers!.hosts).toEqual(["host1", "host2"]);

    const all = result.groups!.find((g) => g.name === "all");
    expect(all).toBeDefined();
    expect(all!.children).toEqual(["ungrouped", "webservers"]);
  });

  it("handles empty inventory", () => {
    const stdout = JSON.stringify({
      _meta: { hostvars: {} },
      all: { children: ["ungrouped"] },
      ungrouped: { hosts: [] },
    });

    const result = parseAnsibleInventoryListOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.groups).toBeDefined();
  });

  it("handles error output", () => {
    const result = parseAnsibleInventoryListOutput("", "ERROR! Unable to parse inventory", 1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("ERROR!");
  });

  it("handles invalid JSON", () => {
    const result = parseAnsibleInventoryListOutput("not json", "", 0);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse inventory JSON");
  });

  it("parses groups with vars", () => {
    const stdout = JSON.stringify({
      _meta: { hostvars: {} },
      webservers: {
        hosts: ["web1"],
        vars: { http_port: 80 },
      },
    });

    const result = parseAnsibleInventoryListOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    const webservers = result.groups!.find((g) => g.name === "webservers");
    expect(webservers!.vars).toEqual({ http_port: 80 });
  });
});

describe("parseAnsibleInventoryGraphOutput", () => {
  it("parses graph output", () => {
    const stdout = `@all:
  |--@ungrouped:
  |--@webservers:
  |  |--host1
  |  |--host2
  |--@dbservers:
  |  |--db1`;

    const result = parseAnsibleInventoryGraphOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.graph).toContain("@all:");
    expect(result.graph).toContain("host1");
  });

  it("handles error", () => {
    const result = parseAnsibleInventoryGraphOutput("", "ERROR!", 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("ERROR!");
  });
});

describe("parseAnsibleInventoryHostOutput", () => {
  it("parses host vars", () => {
    const stdout = JSON.stringify({
      ansible_host: "192.168.1.1",
      ansible_user: "admin",
      http_port: 8080,
    });

    const result = parseAnsibleInventoryHostOutput(stdout, "", 0, "web1");

    expect(result.success).toBe(true);
    expect(result.hostDetail).toBeDefined();
    expect(result.hostDetail!.name).toBe("web1");
    expect(result.hostDetail!.vars).toEqual({
      ansible_host: "192.168.1.1",
      ansible_user: "admin",
      http_port: 8080,
    });
  });

  it("handles host with no vars", () => {
    const stdout = "{}";

    const result = parseAnsibleInventoryHostOutput(stdout, "", 0, "host1");

    expect(result.success).toBe(true);
    expect(result.hostDetail!.name).toBe("host1");
    expect(result.hostDetail!.vars).toBeUndefined();
  });

  it("handles error", () => {
    const result = parseAnsibleInventoryHostOutput("", "ERROR! host not found", 1, "missing");

    expect(result.success).toBe(false);
    expect(result.error).toContain("host not found");
  });

  it("handles invalid JSON", () => {
    const result = parseAnsibleInventoryHostOutput("not json", "", 0, "host1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse host vars JSON");
  });
});

// ── ansible-galaxy parsing ────────────────────────────────────────

describe("parseAnsibleGalaxyInstallOutput", () => {
  it("parses collection install output", () => {
    const stdout = `Starting galaxy collection install process
Process install dependency map
Starting collection install process
Installing 'community.general:5.0.0' to '/home/user/.ansible/collections/ansible_collections/community/general'
community.general (5.0.0) was installed successfully
`;

    const result = parseAnsibleGalaxyInstallOutput(stdout, "", 0, "collection-install");

    expect(result.success).toBe(true);
    expect(result.action).toBe("collection-install");
    expect(result.installed).toBeDefined();
    expect(result.installed!.length).toBeGreaterThan(0);
    expect(result.installed![0].name).toBe("community.general");
    expect(result.installed![0].version).toBe("5.0.0");
  });

  it("parses role install output", () => {
    const stdout = `- downloading role 'nginx', owned by geerlingguy
- downloading role from https://github.com/geerlingguy/ansible-role-nginx/archive/3.1.0.tar.gz
- extracting geerlingguy.nginx to /home/user/.ansible/roles/geerlingguy.nginx
- geerlingguy.nginx (3.1.0) was installed successfully
`;

    const result = parseAnsibleGalaxyInstallOutput(stdout, "", 0, "role-install");

    expect(result.success).toBe(true);
    expect(result.action).toBe("role-install");
    expect(result.installed).toBeDefined();
    expect(result.installed!.some((i) => i.name === "geerlingguy.nginx")).toBe(true);
  });

  it("handles install error", () => {
    const stderr = `ERROR! Failed to resolve collection community.missing`;

    const result = parseAnsibleGalaxyInstallOutput("", stderr, 1, "collection-install");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to resolve");
  });

  it("handles empty successful install (already installed)", () => {
    const stdout = `Nothing to do. All requested collections are already installed.`;

    const result = parseAnsibleGalaxyInstallOutput(stdout, "", 0, "collection-install");

    expect(result.success).toBe(true);
    expect(result.installed).toBeUndefined();
  });
});

describe("parseAnsibleGalaxyListOutput", () => {
  it("parses collection list output", () => {
    const stdout = `
# /home/user/.ansible/collections/ansible_collections
Collection               Version
------------------------ -------
amazon.aws               5.4.0
community.general        6.6.0
ansible.posix            1.5.2
`;

    const result = parseAnsibleGalaxyListOutput(stdout, "", 0, "collection-list");

    expect(result.success).toBe(true);
    expect(result.action).toBe("collection-list");
    expect(result.items).toBeDefined();
    expect(result.items!.length).toBe(3);
    expect(result.items![0]).toEqual({ name: "amazon.aws", version: "5.4.0" });
    expect(result.items![1]).toEqual({ name: "community.general", version: "6.6.0" });
    expect(result.items![2]).toEqual({ name: "ansible.posix", version: "1.5.2" });
  });

  it("parses role list output", () => {
    const stdout = `
# roles found in /home/user/.ansible/roles
- geerlingguy.docker, 6.0.0
- geerlingguy.nginx, 3.1.0
`;

    const result = parseAnsibleGalaxyListOutput(stdout, "", 0, "role-list");

    expect(result.success).toBe(true);
    expect(result.action).toBe("role-list");
    expect(result.items).toBeDefined();
    expect(result.items!.length).toBe(2);
    expect(result.items![0]).toEqual({ name: "geerlingguy.docker", version: "6.0.0" });
    expect(result.items![1]).toEqual({ name: "geerlingguy.nginx", version: "3.1.0" });
  });

  it("handles empty list", () => {
    const stdout = `
# /home/user/.ansible/collections/ansible_collections
`;

    const result = parseAnsibleGalaxyListOutput(stdout, "", 0, "collection-list");

    expect(result.success).toBe(true);
    expect(result.items).toBeUndefined();
  });

  it("handles error", () => {
    const result = parseAnsibleGalaxyListOutput("", "ERROR!", 1, "collection-list");

    expect(result.success).toBe(false);
    expect(result.error).toContain("ERROR!");
  });
});
