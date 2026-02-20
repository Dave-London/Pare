import { describe, it, expect } from "vitest";
import {
  formatInit,
  formatPlan,
  formatValidate,
  formatFmt,
  formatOutput,
  formatStateList,
  formatWorkspace,
  formatShow,
  compactInitMap,
  formatInitCompact,
  compactPlanMap,
  formatPlanCompact,
  compactValidateMap,
  formatValidateCompact,
  compactFmtMap,
  formatFmtCompact,
  compactOutputMap,
  formatOutputCompact,
  compactStateListMap,
  formatStateListCompact,
  compactWorkspaceMap,
  formatWorkspaceCompact,
  compactShowMap,
  formatShowCompact,
} from "../src/lib/formatters.js";
import type {
  TerraformInitResult,
  TerraformPlanResult,
  TerraformValidateResult,
  TerraformFmtResult,
  TerraformOutputResult,
  TerraformStateListResult,
  TerraformWorkspaceResult,
  TerraformShowResult,
} from "../src/schemas/index.js";

// ── Init formatters ─────────────────────────────────────────────────

describe("formatInit", () => {
  it("formats successful init with providers", () => {
    const data: TerraformInitResult = {
      success: true,
      providers: [{ name: "hashicorp/aws", version: "5.31.0" }],
      backendType: "s3",
    };
    const output = formatInit(data);
    expect(output).toContain("terraform init: success");
    expect(output).toContain("backend: s3");
    expect(output).toContain("hashicorp/aws v5.31.0");
  });

  it("formats failed init", () => {
    const data: TerraformInitResult = {
      success: false,
      error: "Failed to query providers",
    };
    const output = formatInit(data);
    expect(output).toContain("terraform init: failed");
    expect(output).toContain("error: Failed to query providers");
  });
});

describe("compactInitMap + formatInitCompact", () => {
  it("produces compact init output", () => {
    const data: TerraformInitResult = {
      success: true,
      providers: [{ name: "hashicorp/aws" }, { name: "hashicorp/random" }],
      backendType: "local",
    };
    const compact = compactInitMap(data);
    expect(compact.providerCount).toBe(2);
    expect(compact.backendType).toBe("local");
    const text = formatInitCompact(compact);
    expect(text).toContain("2 providers");
    expect(text).toContain("backend: local");
  });
});

// ── Plan formatters ─────────────────────────────────────────────────

describe("formatPlan", () => {
  it("formats plan with changes", () => {
    const data: TerraformPlanResult = {
      success: true,
      add: 2,
      change: 1,
      destroy: 0,
      resources: [
        { address: "aws_instance.web", action: "create" },
        { address: "aws_instance.api", action: "create" },
        { address: "aws_s3_bucket.data", action: "update" },
      ],
    };
    const output = formatPlan(data);
    expect(output).toContain("+2 ~1 -0");
    expect(output).toContain("+ aws_instance.web");
    expect(output).toContain("~ aws_s3_bucket.data");
  });

  it("formats failed plan", () => {
    const data: TerraformPlanResult = {
      success: false,
      add: 0,
      change: 0,
      destroy: 0,
      error: "Configuration error",
    };
    const output = formatPlan(data);
    expect(output).toContain("terraform plan: failed");
    expect(output).toContain("error: Configuration error");
  });
});

describe("compactPlanMap + formatPlanCompact", () => {
  it("produces compact plan output", () => {
    const data: TerraformPlanResult = {
      success: true,
      add: 3,
      change: 1,
      destroy: 2,
    };
    const compact = compactPlanMap(data);
    const text = formatPlanCompact(compact);
    expect(text).toContain("+3 ~1 -2");
  });
});

// ── Validate formatters ─────────────────────────────────────────────

describe("formatValidate", () => {
  it("formats valid configuration", () => {
    const data: TerraformValidateResult = {
      valid: true,
      errorCount: 0,
      warningCount: 0,
    };
    expect(formatValidate(data)).toContain("terraform validate: valid");
  });

  it("formats invalid configuration", () => {
    const data: TerraformValidateResult = {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [{ severity: "error", summary: "Bad resource", file: "main.tf", line: 10 }],
    };
    const output = formatValidate(data);
    expect(output).toContain("invalid (1 errors");
    expect(output).toContain("error: Bad resource (main.tf:10)");
  });
});

describe("compactValidateMap + formatValidateCompact", () => {
  it("produces compact validate output", () => {
    const data: TerraformValidateResult = { valid: true, errorCount: 0, warningCount: 0 };
    const text = formatValidateCompact(compactValidateMap(data));
    expect(text).toBe("terraform validate: valid");
  });
});

// ── Fmt formatters ──────────────────────────────────────────────────

describe("formatFmt", () => {
  it("formats all formatted", () => {
    const data: TerraformFmtResult = { success: true };
    expect(formatFmt(data)).toContain("all files formatted correctly");
  });

  it("formats files needing formatting", () => {
    const data: TerraformFmtResult = { success: false, files: ["main.tf", "vars.tf"] };
    const output = formatFmt(data);
    expect(output).toContain("files need formatting");
    expect(output).toContain("main.tf");
  });
});

describe("compactFmtMap + formatFmtCompact", () => {
  it("produces compact fmt output", () => {
    const data: TerraformFmtResult = { success: false, files: ["a.tf", "b.tf"] };
    const text = formatFmtCompact(compactFmtMap(data));
    expect(text).toContain("2 files need formatting");
  });
});

// ── Output formatters ───────────────────────────────────────────────

describe("formatOutput", () => {
  it("formats outputs", () => {
    const data: TerraformOutputResult = {
      success: true,
      outputs: [
        { name: "ip", value: "10.0.0.1", type: "string" },
        { name: "secret", value: "<sensitive>", type: "string", sensitive: true },
      ],
    };
    const output = formatOutput(data);
    expect(output).toContain("2 outputs");
    expect(output).toContain("ip = 10.0.0.1");
    expect(output).toContain("secret = <sensitive> [sensitive]");
  });

  it("formats no outputs", () => {
    const data: TerraformOutputResult = { success: true };
    expect(formatOutput(data)).toContain("no outputs");
  });
});

// ── State list formatters ───────────────────────────────────────────

describe("formatStateList", () => {
  it("formats resource list", () => {
    const data: TerraformStateListResult = {
      success: true,
      resources: ["aws_instance.web", "aws_s3_bucket.data"],
      total: 2,
    };
    const output = formatStateList(data);
    expect(output).toContain("2 resources");
    expect(output).toContain("aws_instance.web");
  });

  it("formats empty state", () => {
    const data: TerraformStateListResult = { success: true, total: 0 };
    expect(formatStateList(data)).toContain("no resources");
  });
});

describe("compactOutputMap + formatOutputCompact", () => {
  it("produces compact output summary", () => {
    const data: TerraformOutputResult = {
      success: true,
      outputs: [
        { name: "ip", value: "10.0.0.1", type: "string" },
        { name: "secret", value: "<sensitive>", type: "string", sensitive: true },
      ],
    };
    const text = formatOutputCompact(compactOutputMap(data));
    expect(text).toContain("2 outputs");
  });
});

describe("compactStateListMap + formatStateListCompact", () => {
  it("produces compact state list summary", () => {
    const data: TerraformStateListResult = {
      success: true,
      resources: ["aws_instance.web", "aws_s3_bucket.data"],
      total: 2,
    };
    const text = formatStateListCompact(compactStateListMap(data));
    expect(text).toContain("2 resources");
  });
});

// ── Workspace formatters ────────────────────────────────────────────

describe("formatWorkspace", () => {
  it("formats workspace list", () => {
    const data: TerraformWorkspaceResult = {
      success: true,
      workspaces: ["default", "staging"],
      current: "staging",
      action: "list",
    };
    const output = formatWorkspace(data);
    expect(output).toContain("* staging");
    expect(output).toContain("default");
  });

  it("formats workspace select", () => {
    const data: TerraformWorkspaceResult = {
      success: true,
      current: "prod",
      action: "select",
    };
    expect(formatWorkspace(data)).toContain("success (now on: prod)");
  });
});

describe("compactWorkspaceMap + formatWorkspaceCompact", () => {
  it("produces compact workspace list output", () => {
    const data: TerraformWorkspaceResult = {
      success: true,
      workspaces: ["default", "staging", "prod"],
      current: "staging",
      action: "list",
    };
    const text = formatWorkspaceCompact(compactWorkspaceMap(data));
    expect(text).toContain("3 workspaces");
    expect(text).toContain("current: staging");
  });
});

// ── Show formatters ─────────────────────────────────────────────────

describe("formatShow", () => {
  it("formats show with resources and outputs", () => {
    const data: TerraformShowResult = {
      success: true,
      terraformVersion: "1.7.0",
      resourceCount: 2,
      resources: [
        { address: "aws_instance.web", type: "aws_instance", name: "web" },
        { address: "aws_s3_bucket.data", type: "aws_s3_bucket", name: "data" },
      ],
      outputs: [{ name: "ip", value: "10.0.0.1" }],
    };
    const output = formatShow(data);
    expect(output).toContain("2 resources (v1.7.0)");
    expect(output).toContain("aws_instance.web (aws_instance)");
    expect(output).toContain("ip = 10.0.0.1");
  });

  it("formats empty show", () => {
    const data: TerraformShowResult = { success: true, resourceCount: 0 };
    const output = formatShow(data);
    expect(output).toContain("0 resources");
  });
});

describe("compactShowMap + formatShowCompact", () => {
  it("produces compact show output", () => {
    const data: TerraformShowResult = {
      success: true,
      resourceCount: 5,
      outputs: [
        { name: "a", value: "1" },
        { name: "b", value: "2" },
      ],
    };
    const text = formatShowCompact(compactShowMap(data));
    expect(text).toContain("5 resources");
    expect(text).toContain("2 outputs");
  });
});
