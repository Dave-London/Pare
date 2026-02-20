import { describe, it, expect } from "vitest";
import {
  parseVagrantStatusOutput,
  parseVagrantGlobalStatusOutput,
  parseVagrantUpOutput,
  parseVagrantLifecycleOutput,
} from "../src/lib/vagrant-parsers.js";

describe("parseVagrantStatusOutput", () => {
  it("parses single machine status", () => {
    const stdout = [
      "1234567890,default,metadata,provider,virtualbox",
      "1234567890,default,provider-name,virtualbox",
      "1234567890,default,state,running",
      "1234567890,default,state-human-short,running",
      "1234567890,default,state-human-long,The VM is running.",
    ].join("\n");

    const result = parseVagrantStatusOutput(stdout, "", 0);

    expect(result.action).toBe("status");
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.machines).toEqual([
      { name: "default", state: "running", provider: "virtualbox" },
    ]);
    expect(result.exitCode).toBe(0);
  });

  it("parses multi-machine status", () => {
    const stdout = [
      "1234567890,web,provider-name,virtualbox",
      "1234567890,web,state,running",
      "1234567890,db,provider-name,virtualbox",
      "1234567890,db,state,poweroff",
    ].join("\n");

    const result = parseVagrantStatusOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.machines).toEqual([
      { name: "web", state: "running", provider: "virtualbox" },
      { name: "db", state: "poweroff", provider: "virtualbox" },
    ]);
  });

  it("handles empty output on error", () => {
    const result = parseVagrantStatusOutput("", "Error occurred", 1);

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.machines).toEqual([]);
    expect(result.exitCode).toBe(1);
  });
});

describe("parseVagrantGlobalStatusOutput", () => {
  it("parses global status with multiple VMs", () => {
    const stdout = [
      "1234567890,,machine-id,abc123",
      "1234567890,,provider-name,virtualbox",
      "1234567890,,machine-home,/home/user/project",
      "1234567890,,state,running",
      "1234567890,,machine-id,def456",
      "1234567890,,provider-name,virtualbox",
      "1234567890,,machine-home,/home/user/other",
      "1234567890,,state,poweroff",
    ].join("\n");

    const result = parseVagrantGlobalStatusOutput(stdout, "", 0);

    expect(result.action).toBe("global-status");
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.machines).toEqual([
      {
        id: "abc123",
        name: "",
        provider: "virtualbox",
        state: "running",
        directory: "/home/user/project",
      },
      {
        id: "def456",
        name: "",
        provider: "virtualbox",
        state: "poweroff",
        directory: "/home/user/other",
      },
    ]);
  });

  it("handles empty output on error", () => {
    const result = parseVagrantGlobalStatusOutput("", "Error", 1);

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.machines).toEqual([]);
  });
});

describe("parseVagrantUpOutput", () => {
  it("parses up output with warnings", () => {
    const stdout = [
      "1234567890,default,ui,info,Bringing machine 'default' up with 'virtualbox' provider...",
      "1234567890,default,provider-name,virtualbox",
      "1234567890,default,state,running",
      "1234567890,,ui,warn,Some warning message",
    ].join("\n");

    const result = parseVagrantUpOutput(stdout, "", 0);

    expect(result.action).toBe("up");
    expect(result.success).toBe(true);
    expect(result.machines).toEqual([
      { name: "default", state: "running", provider: "virtualbox" },
    ]);
    expect(result.warnings).toEqual(["Some warning message"]);
    expect(result.exitCode).toBe(0);
  });

  it("parses up output without warnings", () => {
    const stdout = [
      "1234567890,default,provider-name,virtualbox",
      "1234567890,default,state,running",
    ].join("\n");

    const result = parseVagrantUpOutput(stdout, "", 0);

    expect(result.warnings).toBeUndefined();
  });

  it("handles failed up", () => {
    const result = parseVagrantUpOutput("", "Error starting VM", 1);

    expect(result.success).toBe(false);
    expect(result.machines).toEqual([]);
    expect(result.exitCode).toBe(1);
  });
});

describe("parseVagrantLifecycleOutput", () => {
  it("parses halt output", () => {
    const stdout = [
      "1234567890,default,ui,info,Attempting graceful shutdown of VM...",
      "1234567890,default,state,poweroff",
    ].join("\n");

    const result = parseVagrantLifecycleOutput(stdout, "", 0, "halt");

    expect(result.action).toBe("halt");
    expect(result.success).toBe(true);
    expect(result.machines).toEqual([{ name: "default", newState: "poweroff" }]);
    expect(result.exitCode).toBe(0);
  });

  it("parses destroy output", () => {
    const stdout = [
      "1234567890,default,ui,info,Destroying VM and associated drives...",
      "1234567890,default,state,not_created",
    ].join("\n");

    const result = parseVagrantLifecycleOutput(stdout, "", 0, "destroy");

    expect(result.action).toBe("destroy");
    expect(result.success).toBe(true);
    expect(result.machines).toEqual([{ name: "default", newState: "not_created" }]);
  });

  it("handles error output", () => {
    const result = parseVagrantLifecycleOutput("", "Error", 1, "halt");

    expect(result.success).toBe(false);
    expect(result.machines).toEqual([]);
    expect(result.exitCode).toBe(1);
  });
});
