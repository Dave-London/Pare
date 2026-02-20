import { describe, it, expect } from "vitest";
import {
  parseInitOutput,
  parsePlanOutput,
  parsePlanJsonOutput,
  parseValidateJsonOutput,
  parseFmtOutput,
  parseOutputJsonOutput,
  parseStateListOutput,
  parseWorkspaceListOutput,
  parseWorkspaceActionOutput,
  parseShowJsonOutput,
} from "../src/lib/parsers.js";

// ── terraform init ──────────────────────────────────────────────────

describe("parseInitOutput", () => {
  it("parses successful init with providers", () => {
    const stdout = `
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)

Terraform has been successfully initialized!
`;
    const result = parseInitOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.providers).toHaveLength(1);
    expect(result.providers![0].name).toBe("hashicorp/aws");
    expect(result.providers![0].version).toBe("5.31.0");
  });

  it("parses failed init", () => {
    const stderr = `Error: Failed to query available provider packages`;
    const result = parseInitOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to query available provider packages");
  });

  it("parses init with warnings", () => {
    const stdout = `
Initializing provider plugins...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)

Warning: Incomplete lock file information

Terraform has been successfully initialized!
`;
    const result = parseInitOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings![0]).toContain("Incomplete lock file information");
  });

  it("parses init with no providers", () => {
    const stdout = `
Initializing the backend...

Terraform has been successfully initialized!
`;
    const result = parseInitOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.providers).toBeUndefined();
  });

  it("deduplicates Installing/Installed lines for same provider", () => {
    const stdout = `
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)
- Installing hashicorp/random v3.6.0...
- Installed hashicorp/random v3.6.0 (signed by HashiCorp)
`;
    const result = parseInitOutput(stdout, "", 0);
    expect(result.providers).toHaveLength(2);
  });
});

// ── terraform plan ──────────────────────────────────────────────────

describe("parsePlanOutput", () => {
  it("parses plan with changes", () => {
    const stdout = `
Terraform will perform the following actions:

  # aws_instance.example will be created
  + resource "aws_instance" "example" {
      + ami           = "ami-12345678"
    }

  # aws_s3_bucket.logs will be destroyed
  - resource "aws_s3_bucket" "logs" {
    }

Plan: 1 to add, 0 to change, 1 to destroy.
`;
    const result = parsePlanOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.add).toBe(1);
    expect(result.change).toBe(0);
    expect(result.destroy).toBe(1);
    expect(result.resources).toHaveLength(2);
    expect(result.resources![0].address).toBe("aws_instance.example");
    expect(result.resources![0].action).toBe("create");
    expect(result.resources![1].address).toBe("aws_s3_bucket.logs");
    expect(result.resources![1].action).toBe("delete");
  });

  it("parses plan with no changes", () => {
    const stdout = `No changes. Your infrastructure matches the configuration.`;
    const result = parsePlanOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.add).toBe(0);
    expect(result.change).toBe(0);
    expect(result.destroy).toBe(0);
    expect(result.resources).toBeUndefined();
  });

  it("parses plan failure", () => {
    const stderr = `Error: Missing required argument`;
    const result = parsePlanOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing required argument");
  });

  it("parses plan with update in-place", () => {
    const stdout = `
  # aws_instance.web will be updated in-place
  ~ resource "aws_instance" "web" {
      ~ tags = {}
    }

Plan: 0 to add, 1 to change, 0 to destroy.
`;
    const result = parsePlanOutput(stdout, "", 2);
    expect(result.success).toBe(true);
    expect(result.change).toBe(1);
    expect(result.resources![0].action).toBe("update");
  });
});

describe("parsePlanJsonOutput", () => {
  it("parses JSON plan with change_summary", () => {
    const stdout = [
      JSON.stringify({
        type: "planned_change",
        change: { resource: { addr: "aws_instance.web" }, action: "create" },
      }),
      JSON.stringify({
        type: "change_summary",
        changes: { add: 1, change: 0, remove: 0 },
      }),
    ].join("\n");

    const result = parsePlanJsonOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.add).toBe(1);
    expect(result.change).toBe(0);
    expect(result.destroy).toBe(0);
    expect(result.resources).toHaveLength(1);
    expect(result.resources![0].address).toBe("aws_instance.web");
    expect(result.resources![0].action).toBe("create");
  });

  it("parses JSON plan with diagnostics", () => {
    const stdout = [
      JSON.stringify({
        type: "diagnostic",
        severity: "warning",
        summary: "Deprecated feature",
      }),
    ].join("\n");

    const result = parsePlanJsonOutput(stdout, "", 0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings![0]).toBe("Deprecated feature");
  });

  it("handles replace action (delete,create)", () => {
    const stdout = JSON.stringify({
      type: "planned_change",
      change: { resource: { addr: "aws_instance.old" }, action: "delete,create" },
    });
    const result = parsePlanJsonOutput(stdout, "", 0);
    expect(result.resources![0].action).toBe("replace");
  });

  it("skips invalid JSON lines gracefully", () => {
    const stdout =
      "not json\n" +
      JSON.stringify({ type: "change_summary", changes: { add: 0, change: 0, remove: 0 } });
    const result = parsePlanJsonOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.add).toBe(0);
  });
});

// ── terraform validate ──────────────────────────────────────────────

describe("parseValidateJsonOutput", () => {
  it("parses valid configuration", () => {
    const stdout = JSON.stringify({
      valid: true,
      error_count: 0,
      warning_count: 0,
      diagnostics: [],
    });
    const result = parseValidateJsonOutput(stdout, "", 0);
    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.diagnostics).toBeUndefined();
  });

  it("parses invalid configuration with diagnostics", () => {
    const stdout = JSON.stringify({
      valid: false,
      error_count: 1,
      warning_count: 1,
      diagnostics: [
        {
          severity: "error",
          summary: "Missing required provider",
          detail: "Provider hashicorp/aws is required",
          range: { filename: "main.tf", start: { line: 5, column: 1 } },
        },
        {
          severity: "warning",
          summary: "Deprecated attribute",
          range: { filename: "vars.tf", start: { line: 10, column: 3 } },
        },
      ],
    });
    const result = parseValidateJsonOutput(stdout, "", 1);
    expect(result.valid).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics![0].severity).toBe("error");
    expect(result.diagnostics![0].summary).toBe("Missing required provider");
    expect(result.diagnostics![0].file).toBe("main.tf");
    expect(result.diagnostics![0].line).toBe(5);
    expect(result.diagnostics![1].severity).toBe("warning");
  });

  it("handles unparseable JSON gracefully", () => {
    const result = parseValidateJsonOutput("not json", "", 1);
    expect(result.valid).toBe(false);
    expect(result.errorCount).toBe(1);
  });
});

// ── terraform fmt ───────────────────────────────────────────────────

describe("parseFmtOutput", () => {
  it("parses all files formatted (exit 0)", () => {
    const result = parseFmtOutput("", "", 0, false);
    expect(result.success).toBe(true);
    expect(result.files).toBeUndefined();
  });

  it("parses files needing formatting", () => {
    const stdout = "main.tf\nvariables.tf\n";
    const result = parseFmtOutput(stdout, "", 3, false);
    expect(result.success).toBe(false);
    expect(result.files).toEqual(["main.tf", "variables.tf"]);
  });

  it("parses fmt with diff output", () => {
    const stdout = `--- a/main.tf
+++ b/main.tf
@@ -1,3 +1,3 @@
-resource "aws_instance" "example" {
+resource "aws_instance"  "example"  {
   ami = "ami-12345"
 }
`;
    const result = parseFmtOutput(stdout, "", 3, true);
    expect(result.success).toBe(false);
    expect(result.files).toContain("main.tf");
    expect(result.diff).toContain("--- a/main.tf");
  });
});

// ── terraform output ────────────────────────────────────────────────

describe("parseOutputJsonOutput", () => {
  it("parses outputs", () => {
    const stdout = JSON.stringify({
      instance_ip: { value: "10.0.0.1", type: "string", sensitive: false },
      db_password: { value: "secret123", type: "string", sensitive: true },
    });
    const result = parseOutputJsonOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs![0].name).toBe("instance_ip");
    expect(result.outputs![0].value).toBe("10.0.0.1");
    expect(result.outputs![0].sensitive).toBeUndefined();
    expect(result.outputs![1].name).toBe("db_password");
    expect(result.outputs![1].value).toBe("<sensitive>");
    expect(result.outputs![1].sensitive).toBe(true);
  });

  it("parses empty outputs", () => {
    const result = parseOutputJsonOutput("{}", "", 0);
    expect(result.success).toBe(true);
    expect(result.outputs).toBeUndefined();
  });

  it("handles failure", () => {
    const result = parseOutputJsonOutput("", "Error: No state file", 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No state file");
  });
});

// ── terraform state list ────────────────────────────────────────────

describe("parseStateListOutput", () => {
  it("parses resource list", () => {
    const stdout = "aws_instance.web\naws_s3_bucket.logs\naws_iam_role.app\n";
    const result = parseStateListOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.resources).toEqual([
      "aws_instance.web",
      "aws_s3_bucket.logs",
      "aws_iam_role.app",
    ]);
    expect(result.total).toBe(3);
  });

  it("parses empty state", () => {
    const result = parseStateListOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.resources).toBeUndefined();
    expect(result.total).toBe(0);
  });

  it("handles failure", () => {
    const result = parseStateListOutput("", "Error: No state file found", 1);
    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.error).toContain("No state file found");
  });
});

// ── terraform workspace ─────────────────────────────────────────────

describe("parseWorkspaceListOutput", () => {
  it("parses workspace list with current marked", () => {
    const stdout = `  default
* staging
  production
`;
    const result = parseWorkspaceListOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.workspaces).toEqual(["default", "staging", "production"]);
    expect(result.current).toBe("staging");
    expect(result.action).toBe("list");
  });

  it("parses single default workspace", () => {
    const stdout = `* default\n`;
    const result = parseWorkspaceListOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.workspaces).toEqual(["default"]);
    expect(result.current).toBe("default");
  });

  it("handles failure", () => {
    const result = parseWorkspaceListOutput("", "Error: not initialized", 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not initialized");
  });
});

describe("parseWorkspaceActionOutput", () => {
  it("parses successful select", () => {
    const result = parseWorkspaceActionOutput(
      'Switched to workspace "staging".',
      "",
      0,
      "select",
      "staging",
    );
    expect(result.success).toBe(true);
    expect(result.current).toBe("staging");
    expect(result.action).toBe("select");
  });

  it("parses successful new", () => {
    const result = parseWorkspaceActionOutput(
      'Created and switched to workspace "dev".',
      "",
      0,
      "new",
      "dev",
    );
    expect(result.success).toBe(true);
    expect(result.current).toBe("dev");
    expect(result.action).toBe("new");
  });

  it("parses successful delete", () => {
    const result = parseWorkspaceActionOutput('Deleted workspace "old".', "", 0, "delete", "old");
    expect(result.success).toBe(true);
    expect(result.current).toBeUndefined();
    expect(result.action).toBe("delete");
  });

  it("parses failed action", () => {
    const result = parseWorkspaceActionOutput(
      "",
      "Error: workspace does not exist",
      1,
      "select",
      "nope",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("workspace does not exist");
  });
});

// ── terraform show ──────────────────────────────────────────────────

describe("parseShowJsonOutput", () => {
  it("parses state with resources and outputs", () => {
    const stdout = JSON.stringify({
      terraform_version: "1.7.0",
      values: {
        root_module: {
          resources: [
            {
              address: "aws_instance.web",
              type: "aws_instance",
              name: "web",
              provider_name: "registry.terraform.io/hashicorp/aws",
            },
            {
              address: "aws_s3_bucket.data",
              type: "aws_s3_bucket",
              name: "data",
              provider_name: "registry.terraform.io/hashicorp/aws",
            },
          ],
        },
        outputs: {
          ip: { value: "10.0.0.1", sensitive: false },
          secret: { value: "hidden", sensitive: true },
        },
      },
    });
    const result = parseShowJsonOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.terraformVersion).toBe("1.7.0");
    expect(result.resourceCount).toBe(2);
    expect(result.resources![0].address).toBe("aws_instance.web");
    expect(result.resources![0].type).toBe("aws_instance");
    expect(result.resources![0].provider).toBe("registry.terraform.io/hashicorp/aws");
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs![0].name).toBe("ip");
    expect(result.outputs![0].value).toBe("10.0.0.1");
    expect(result.outputs![1].value).toBe("<sensitive>");
  });

  it("parses empty state", () => {
    const result = parseShowJsonOutput("{}", "", 0);
    expect(result.success).toBe(true);
    expect(result.resourceCount).toBe(0);
    expect(result.resources).toBeUndefined();
  });

  it("handles child modules", () => {
    const stdout = JSON.stringify({
      terraform_version: "1.7.0",
      values: {
        root_module: {
          resources: [{ address: "aws_vpc.main", type: "aws_vpc", name: "main" }],
          child_modules: [
            {
              resources: [
                { address: "module.web.aws_instance.app", type: "aws_instance", name: "app" },
              ],
            },
          ],
        },
      },
    });
    const result = parseShowJsonOutput(stdout, "", 0);
    expect(result.resourceCount).toBe(2);
    expect(result.resources![1].address).toBe("module.web.aws_instance.app");
  });

  it("handles failure", () => {
    const result = parseShowJsonOutput("", "Error: No state file", 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No state file");
  });
});
