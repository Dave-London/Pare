import type {
  VagrantStatusResult,
  VagrantGlobalStatusResult,
  VagrantUpResult,
  VagrantLifecycleResult,
} from "../schemas/vagrant.js";

// ── CSV line parser ────────────────────────────────────────────────

interface MachineReadableLine {
  timestamp: string;
  target: string;
  type: string;
  data: string;
}

function parseMachineReadableLines(stdout: string): MachineReadableLine[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Vagrant CSV: timestamp,target,type,data (data may contain commas)
      const parts = line.split(",");
      if (parts.length < 4) return null;
      return {
        timestamp: parts[0],
        target: parts[1],
        type: parts[2],
        data: parts.slice(3).join(","),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ── vagrant status ─────────────────────────────────────────────────

export function parseVagrantStatusOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
): VagrantStatusResult {
  const success = exitCode === 0;
  const lines = parseMachineReadableLines(stdout);

  // Collect machines: group by target name, pick up state and provider-name
  const machineMap = new Map<string, { state: string; provider: string }>();

  for (const line of lines) {
    if (!line.target) continue;

    if (line.type === "state") {
      const entry = machineMap.get(line.target) ?? { state: "", provider: "" };
      entry.state = line.data;
      machineMap.set(line.target, entry);
    } else if (line.type === "provider-name") {
      const entry = machineMap.get(line.target) ?? { state: "", provider: "" };
      entry.provider = line.data;
      machineMap.set(line.target, entry);
    }
  }

  const machines = Array.from(machineMap.entries()).map(([name, info]) => ({
    name,
    state: info.state,
    provider: info.provider,
  }));

  return {
    action: "status",
    success,
    machines,
    count: machines.length,
    exitCode,
  };
}

// ── vagrant global-status ──────────────────────────────────────────

export function parseVagrantGlobalStatusOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
): VagrantGlobalStatusResult {
  const success = exitCode === 0;
  const lines = parseMachineReadableLines(stdout);

  // Global status emits sequential groups of: machine-id, provider-name, machine-home, state
  const machines: VagrantGlobalStatusResult["machines"] = [];
  let current: { id: string; name: string; provider: string; state: string; directory: string } = {
    id: "",
    name: "",
    provider: "",
    state: "",
    directory: "",
  };

  for (const line of lines) {
    switch (line.type) {
      case "machine-id":
        // Start of a new machine entry
        if (current.id) {
          machines.push({ ...current });
        }
        current = { id: line.data, name: "", provider: "", state: "", directory: "" };
        break;
      case "provider-name":
        current.provider = line.data;
        break;
      case "machine-home":
        current.directory = line.data;
        break;
      case "state":
        current.state = line.data;
        break;
      case "machine-name":
        current.name = line.data;
        break;
    }
  }

  // Push the last machine if it has an id
  if (current.id) {
    machines.push({ ...current });
  }

  return {
    action: "global-status",
    success,
    machines,
    count: machines.length,
    exitCode,
  };
}

// ── vagrant up ─────────────────────────────────────────────────────

export function parseVagrantUpOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
): VagrantUpResult {
  const success = exitCode === 0;
  const lines = parseMachineReadableLines(stdout);

  const machineMap = new Map<string, { state: string; provider: string }>();
  const warnings: string[] = [];

  for (const line of lines) {
    if (line.type === "state" && line.target) {
      const entry = machineMap.get(line.target) ?? { state: "", provider: "" };
      entry.state = line.data;
      machineMap.set(line.target, entry);
    } else if (line.type === "provider-name" && line.target) {
      const entry = machineMap.get(line.target) ?? { state: "", provider: "" };
      entry.provider = line.data;
      machineMap.set(line.target, entry);
    } else if (line.type === "ui" && line.data.startsWith("warn,")) {
      warnings.push(line.data.slice(5));
    }
  }

  const machines = Array.from(machineMap.entries()).map(([name, info]) => ({
    name,
    state: info.state,
    provider: info.provider,
  }));

  return {
    action: "up",
    success,
    machines,
    warnings: warnings.length > 0 ? warnings : undefined,
    exitCode,
  };
}

// ── vagrant halt / destroy ─────────────────────────────────────────

export function parseVagrantLifecycleOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
  action: "halt" | "destroy",
): VagrantLifecycleResult {
  const success = exitCode === 0;
  const lines = parseMachineReadableLines(stdout);

  const machineMap = new Map<string, string>();

  for (const line of lines) {
    if (line.type === "state" && line.target) {
      machineMap.set(line.target, line.data);
    }
  }

  const machines = Array.from(machineMap.entries()).map(([name, newState]) => ({
    name,
    newState,
  }));

  return {
    action,
    success,
    machines,
    exitCode,
  };
}
