import { describe, it, expect } from "vitest";
import {
  formatVagrantStatus,
  formatVagrantGlobalStatus,
  formatVagrantUp,
  formatVagrantLifecycle,
  compactVagrantStatusMap,
  formatVagrantStatusCompact,
  compactVagrantGlobalStatusMap,
  formatVagrantGlobalStatusCompact,
  compactVagrantUpMap,
  formatVagrantUpCompact,
  compactVagrantLifecycleMap,
  formatVagrantLifecycleCompact,
} from "../src/lib/vagrant-formatters.js";
import type {
  VagrantStatusResult,
  VagrantGlobalStatusResult,
  VagrantUpResult,
  VagrantLifecycleResult,
} from "../src/schemas/vagrant.js";

// ── Full formatters ────────────────────────────────────────────────

describe("formatVagrantStatus", () => {
  it("formats single machine status", () => {
    const data: VagrantStatusResult = {
      action: "status",
      success: true,
      machines: [{ name: "default", state: "running", provider: "virtualbox" }],
      count: 1,
      exitCode: 0,
    };
    const result = formatVagrantStatus(data);
    expect(result).toContain("vagrant status: 1 machine(s)");
    expect(result).toContain("default: running (virtualbox)");
  });

  it("formats multi-machine status", () => {
    const data: VagrantStatusResult = {
      action: "status",
      success: true,
      machines: [
        { name: "web", state: "running", provider: "virtualbox" },
        { name: "db", state: "poweroff", provider: "virtualbox" },
      ],
      count: 2,
      exitCode: 0,
    };
    const result = formatVagrantStatus(data);
    expect(result).toContain("2 machine(s)");
    expect(result).toContain("web: running");
    expect(result).toContain("db: poweroff");
  });
});

describe("formatVagrantGlobalStatus", () => {
  it("formats global status", () => {
    const data: VagrantGlobalStatusResult = {
      action: "global-status",
      success: true,
      machines: [
        {
          id: "abc123",
          name: "default",
          provider: "virtualbox",
          state: "running",
          directory: "/home/user/project",
        },
      ],
      count: 1,
      exitCode: 0,
    };
    const result = formatVagrantGlobalStatus(data);
    expect(result).toContain("vagrant global-status: 1 machine(s)");
    expect(result).toContain("abc123");
    expect(result).toContain("/home/user/project");
  });
});

describe("formatVagrantUp", () => {
  it("formats successful up", () => {
    const data: VagrantUpResult = {
      action: "up",
      success: true,
      machines: [{ name: "default", state: "running", provider: "virtualbox" }],
      exitCode: 0,
    };
    const result = formatVagrantUp(data);
    expect(result).toContain("vagrant up: success");
    expect(result).toContain("default: running");
  });

  it("formats up with warnings", () => {
    const data: VagrantUpResult = {
      action: "up",
      success: true,
      machines: [{ name: "default", state: "running", provider: "virtualbox" }],
      warnings: ["Some warning"],
      exitCode: 0,
    };
    const result = formatVagrantUp(data);
    expect(result).toContain("warning: Some warning");
  });

  it("formats failed up", () => {
    const data: VagrantUpResult = {
      action: "up",
      success: false,
      machines: [],
      exitCode: 1,
    };
    const result = formatVagrantUp(data);
    expect(result).toContain("vagrant up: failed");
  });
});

describe("formatVagrantLifecycle", () => {
  it("formats halt", () => {
    const data: VagrantLifecycleResult = {
      action: "halt",
      success: true,
      machines: [{ name: "default", newState: "poweroff" }],
      exitCode: 0,
    };
    const result = formatVagrantLifecycle(data);
    expect(result).toContain("vagrant halt: success");
    expect(result).toContain("default: poweroff");
  });

  it("formats destroy", () => {
    const data: VagrantLifecycleResult = {
      action: "destroy",
      success: true,
      machines: [{ name: "default", newState: "not_created" }],
      exitCode: 0,
    };
    const result = formatVagrantLifecycle(data);
    expect(result).toContain("vagrant destroy: success");
    expect(result).toContain("default: not_created");
  });
});

// ── Compact formatters ─────────────────────────────────────────────

describe("compact vagrant status", () => {
  it("maps and formats compact status", () => {
    const data: VagrantStatusResult = {
      action: "status",
      success: true,
      machines: [{ name: "default", state: "running", provider: "virtualbox" }],
      count: 1,
      exitCode: 0,
    };
    const compact = compactVagrantStatusMap(data);
    expect(compact.success).toBe(true);
    expect(compact.count).toBe(1);

    const text = formatVagrantStatusCompact(compact);
    expect(text).toBe("vagrant status: 1 machine(s)");
  });
});

describe("compact vagrant global-status", () => {
  it("maps and formats compact global-status", () => {
    const data: VagrantGlobalStatusResult = {
      action: "global-status",
      success: true,
      machines: [
        {
          id: "abc",
          name: "",
          provider: "virtualbox",
          state: "running",
          directory: "/tmp",
        },
      ],
      count: 1,
      exitCode: 0,
    };
    const compact = compactVagrantGlobalStatusMap(data);
    expect(compact.count).toBe(1);

    const text = formatVagrantGlobalStatusCompact(compact);
    expect(text).toBe("vagrant global-status: 1 machine(s)");
  });
});

describe("compact vagrant up", () => {
  it("maps and formats compact up", () => {
    const data: VagrantUpResult = {
      action: "up",
      success: true,
      machines: [{ name: "default", state: "running", provider: "virtualbox" }],
      warnings: ["warn1"],
      exitCode: 0,
    };
    const compact = compactVagrantUpMap(data);
    expect(compact.machineCount).toBe(1);
    expect(compact.warningCount).toBe(1);

    const text = formatVagrantUpCompact(compact);
    expect(text).toBe("vagrant up: 1 machine(s) started (1 warnings)");
  });

  it("formats compact failed up", () => {
    const compact = { success: false, machineCount: 0, warningCount: 0 };
    expect(formatVagrantUpCompact(compact)).toBe("vagrant up: failed");
  });
});

describe("compact vagrant lifecycle", () => {
  it("maps and formats compact halt", () => {
    const data: VagrantLifecycleResult = {
      action: "halt",
      success: true,
      machines: [{ name: "default", newState: "poweroff" }],
      exitCode: 0,
    };
    const compact = compactVagrantLifecycleMap(data);
    expect(compact.action).toBe("halt");
    expect(compact.machineCount).toBe(1);

    const text = formatVagrantLifecycleCompact(compact);
    expect(text).toBe("vagrant halt: 1 machine(s)");
  });

  it("formats compact failed destroy", () => {
    const compact = { success: false, action: "destroy", machineCount: 0 };
    expect(formatVagrantLifecycleCompact(compact)).toBe("vagrant destroy: failed");
  });
});
