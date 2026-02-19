import type {
  TerraformInitResult,
  TerraformPlanResult,
  TerraformValidateResult,
  TerraformFmtResult,
  TerraformOutputResult,
  TerraformStateListResult,
  TerraformWorkspaceResult,
  TerraformShowResult,
} from "../schemas/index.js";

// ── terraform init ──────────────────────────────────────────────────

/**
 * Parses `terraform init` output into structured data.
 *
 * Example stdout includes lines like:
 * - Initializing provider plugins...
 * - Installing hashicorp/aws v5.0.0...
 * - Installed hashicorp/aws v5.0.0 (signed by HashiCorp)
 * - Terraform has been successfully initialized!
 */
export function parseInitOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformInitResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  // Extract installed providers: "- Installing hashicorp/aws v5.0.0..."
  // or "- Installed hashicorp/aws v5.0.0 (signed by ...)"
  const providers: { name: string; version?: string }[] = [];
  const providerRe = /- Install(?:ing|ed)\s+(\S+)\s+v([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = providerRe.exec(text)) !== null) {
    const name = match[1];
    // Deduplicate (Installing + Installed lines for same provider)
    if (!providers.some((p) => p.name === name)) {
      providers.push({ name, version: match[2] });
    }
  }

  // Extract backend type: "Initializing the backend..." / "backend type: s3"
  const backendMatch = text.match(
    /Successfully configured the backend "(\w+)"|Initializing the backend\.\.\.\s*\n.*?"(\w+)"/,
  );
  const backendType = backendMatch?.[1] ?? backendMatch?.[2];

  // Extract warnings
  const warnings = extractWarnings(text);

  return {
    success,
    providers: providers.length > 0 ? providers : undefined,
    backendType: backendType || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    error: !success ? extractError(stderr || stdout) : undefined,
  };
}

// ── terraform plan ──────────────────────────────────────────────────

/** Action mapping from terraform JSON plan output. */
const ACTION_MAP: Record<string, "create" | "update" | "delete" | "replace" | "read" | "no-op"> = {
  create: "create",
  update: "update",
  delete: "delete",
  "delete,create": "replace",
  "create,delete": "replace",
  read: "read",
  "no-op": "no-op",
};

/**
 * Parses `terraform plan` text output into structured data.
 *
 * The text output includes a summary line like:
 * "Plan: 2 to add, 1 to change, 0 to destroy."
 */
export function parsePlanOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformPlanResult {
  // exitCode 0 = no changes, 2 = changes present (with -detailed-exitcode), non-0/2 = error
  const success = exitCode === 0 || exitCode === 2;
  const text = stdout + "\n" + stderr;

  let add = 0;
  let change = 0;
  let destroy = 0;

  // Parse summary: "Plan: X to add, Y to change, Z to destroy."
  const summaryMatch = text.match(
    /Plan:\s*(\d+)\s*to add,\s*(\d+)\s*to change,\s*(\d+)\s*to destroy/,
  );
  if (summaryMatch) {
    add = parseInt(summaryMatch[1], 10);
    change = parseInt(summaryMatch[2], 10);
    destroy = parseInt(summaryMatch[3], 10);
  }

  // Parse resource changes from text output lines:
  // "  # aws_instance.example will be created"
  // "  # aws_s3_bucket.logs will be updated in-place"
  // "  # aws_instance.old will be destroyed"
  const resources: {
    address: string;
    action: TerraformPlanResult["resources"] extends (infer U)[] | undefined
      ? U extends { action: infer A }
        ? A
        : never
      : never;
  }[] = [];
  const resourceRe =
    /^\s*#\s+(\S+)\s+will be\s+(created|updated in-place|destroyed|replaced|read during apply)/gm;
  let rMatch: RegExpExecArray | null;
  while ((rMatch = resourceRe.exec(text)) !== null) {
    const actionText = rMatch[2];
    let action: "create" | "update" | "delete" | "replace" | "read" | "no-op" = "no-op";
    if (actionText === "created") action = "create";
    else if (actionText === "updated in-place") action = "update";
    else if (actionText === "destroyed") action = "delete";
    else if (actionText === "replaced") action = "replace";
    else if (actionText === "read during apply") action = "read";

    resources.push({ address: rMatch[1], action });
  }

  const warnings = extractWarnings(text);

  return {
    success,
    add,
    change,
    destroy,
    resources: resources.length > 0 ? resources : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    error: !success ? extractError(stderr || stdout) : undefined,
  };
}

/**
 * Parses `terraform plan -json` line-delimited JSON output.
 *
 * Each line is a JSON object with a `type` field. We care about:
 * - `planned_change` messages with `change.resource.addr` and `change.action`
 * - `change_summary` with `changes.add`, `.change`, `.remove`
 * - `diagnostic` for warnings/errors
 */
export function parsePlanJsonOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformPlanResult {
  const success = exitCode === 0 || exitCode === 2;
  const resources: {
    address: string;
    action: "create" | "update" | "delete" | "replace" | "read" | "no-op";
  }[] = [];
  let add = 0;
  let change = 0;
  let destroy = 0;
  const warnings: string[] = [];
  let errorMsg: string | undefined;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (msg.type === "planned_change" && msg.change) {
      const ch = msg.change as Record<string, unknown>;
      const resource = ch.resource as Record<string, unknown> | undefined;
      const addr = resource?.addr as string | undefined;
      const action = ch.action as string | undefined;
      if (addr && action) {
        const actions = Array.isArray(action) ? action.join(",") : action;
        resources.push({
          address: addr,
          action: ACTION_MAP[actions] ?? "no-op",
        });
      }
    }

    if (msg.type === "change_summary" && msg.changes) {
      const changes = msg.changes as Record<string, number>;
      add = changes.add ?? 0;
      change = changes.change ?? 0;
      destroy = changes.remove ?? 0;
    }

    if (msg.type === "diagnostic") {
      const severity = msg.severity as string;
      const summary = msg.summary as string;
      if (severity === "warning" && summary) {
        warnings.push(summary);
      } else if (severity === "error" && summary) {
        errorMsg = summary;
      }
    }
  }

  return {
    success,
    add,
    change,
    destroy,
    resources: resources.length > 0 ? resources : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    error: !success ? (errorMsg ?? extractError(stderr)) : undefined,
  };
}

// ── terraform validate ──────────────────────────────────────────────

/**
 * Parses `terraform validate -json` output.
 *
 * JSON format:
 * ```json
 * {
 *   "valid": true|false,
 *   "error_count": 0,
 *   "warning_count": 0,
 *   "diagnostics": [{ "severity": "error", "summary": "...", "detail": "...", "range": {...} }]
 * }
 * ```
 */
export function parseValidateJsonOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
): TerraformValidateResult {
  try {
    const json = JSON.parse(stdout) as Record<string, unknown>;
    const valid = (json.valid as boolean) ?? exitCode === 0;
    const errorCount = (json.error_count as number) ?? 0;
    const warningCount = (json.warning_count as number) ?? 0;

    const rawDiags = (json.diagnostics as Record<string, unknown>[]) ?? [];
    const diagnostics = rawDiags.map((d) => {
      const range = d.range as Record<string, unknown> | undefined;
      const filename = range?.filename as string | undefined;
      const start = range?.start as Record<string, number> | undefined;
      return {
        severity: (d.severity as "error" | "warning") ?? "error",
        summary: (d.summary as string) ?? "",
        detail: (d.detail as string) || undefined,
        file: filename || undefined,
        line: start?.line ?? undefined,
      };
    });

    return {
      valid,
      errorCount,
      warningCount,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch {
    return {
      valid: exitCode === 0,
      errorCount: exitCode === 0 ? 0 : 1,
      warningCount: 0,
    };
  }
}

// ── terraform fmt ───────────────────────────────────────────────────

/**
 * Parses `terraform fmt -check` output.
 *
 * `terraform fmt -check` lists files that need formatting (one per line).
 * Exit code 0 = all formatted, 3 = files need formatting.
 *
 * `terraform fmt -check -diff` additionally includes unified diff output.
 */
export function parseFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  showDiff: boolean,
): TerraformFmtResult {
  // exitCode 0 = all formatted, 3 = files need formatting
  const success = exitCode === 0;

  if (!showDiff) {
    // -check mode: stdout lists filenames, one per line
    const files = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return {
      success,
      files: files.length > 0 ? files : undefined,
    };
  }

  // -check -diff mode: stdout contains diffs, filenames from stderr or diff headers
  const files: string[] = [];
  const fileRe = /^---\s+(\S+)/gm;
  const text = stdout + "\n" + stderr;
  let fMatch: RegExpExecArray | null;
  while ((fMatch = fileRe.exec(text)) !== null) {
    const file = fMatch[1].replace(/^a\//, "");
    if (!files.includes(file)) {
      files.push(file);
    }
  }

  // Also capture files listed on their own lines (terraform fmt -check output)
  for (const line of stderr.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && trimmed.endsWith(".tf") && !files.includes(trimmed)) {
      files.push(trimmed);
    }
  }

  return {
    success,
    files: files.length > 0 ? files : undefined,
    diff: stdout.trim() || undefined,
  };
}

// ── terraform output ────────────────────────────────────────────────

/**
 * Parses `terraform output -json` output.
 *
 * JSON format:
 * ```json
 * {
 *   "output_name": { "value": ..., "type": "string", "sensitive": false }
 * }
 * ```
 */
export function parseOutputJsonOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformOutputResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      error: extractError(stderr || stdout),
    };
  }

  try {
    const json = JSON.parse(stdout) as Record<string, Record<string, unknown>>;
    const outputs = Object.entries(json).map(([name, entry]) => ({
      name,
      value: entry.sensitive ? "<sensitive>" : entry.value,
      type: typeof entry.type === "string" ? entry.type : JSON.stringify(entry.type),
      sensitive: (entry.sensitive as boolean) || undefined,
    }));

    return {
      success,
      outputs: outputs.length > 0 ? outputs : undefined,
    };
  } catch {
    return {
      success,
      error: "Failed to parse terraform output JSON",
    };
  }
}

// ── terraform state list ────────────────────────────────────────────

/**
 * Parses `terraform state list` output.
 *
 * Output is one resource address per line:
 * ```
 * aws_instance.example
 * aws_s3_bucket.logs
 * ```
 */
export function parseStateListOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformStateListResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      total: 0,
      error: extractError(stderr || stdout),
    };
  }

  const resources = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    success,
    resources: resources.length > 0 ? resources : undefined,
    total: resources.length,
  };
}

// ── terraform workspace ─────────────────────────────────────────────

/**
 * Parses `terraform workspace list` output.
 *
 * Output format:
 * ```
 *   default
 * * staging
 *   production
 * ```
 */
export function parseWorkspaceListOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformWorkspaceResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      action: "list",
      error: extractError(stderr || stdout),
    };
  }

  const workspaces: string[] = [];
  let current: string | undefined;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("* ")) {
      const name = trimmed.slice(2).trim();
      current = name;
      workspaces.push(name);
    } else {
      workspaces.push(trimmed);
    }
  }

  return {
    success,
    workspaces: workspaces.length > 0 ? workspaces : undefined,
    current,
    action: "list",
  };
}

/**
 * Parses the result of `terraform workspace select/new/delete`.
 */
export function parseWorkspaceActionOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action: "select" | "new" | "delete",
  workspaceName: string,
): TerraformWorkspaceResult {
  const success = exitCode === 0;

  return {
    success,
    current: success && action !== "delete" ? workspaceName : undefined,
    action,
    error: !success ? extractError(stderr || stdout) : undefined,
  };
}

// ── terraform show ──────────────────────────────────────────────────

/**
 * Parses `terraform show -json` output.
 *
 * JSON format (state):
 * ```json
 * {
 *   "format_version": "1.0",
 *   "terraform_version": "1.5.0",
 *   "values": {
 *     "root_module": {
 *       "resources": [{ "address": "...", "type": "...", "name": "...", "provider_name": "..." }]
 *     },
 *     "outputs": { "name": { "value": ..., "sensitive": false } }
 *   }
 * }
 * ```
 */
export function parseShowJsonOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TerraformShowResult {
  const success = exitCode === 0;

  if (!success) {
    return {
      success,
      resourceCount: 0,
      error: extractError(stderr || stdout),
    };
  }

  try {
    const json = JSON.parse(stdout) as Record<string, unknown>;
    const terraformVersion = json.terraform_version as string | undefined;
    const values = json.values as Record<string, unknown> | undefined;

    const resources: { address: string; type: string; name: string; provider?: string }[] = [];

    if (values?.root_module) {
      const rootModule = values.root_module as Record<string, unknown>;
      collectResources(rootModule, resources);
    }

    // Parse outputs
    const rawOutputs = values?.outputs as Record<string, Record<string, unknown>> | undefined;
    const outputs = rawOutputs
      ? Object.entries(rawOutputs).map(([name, entry]) => ({
          name,
          value: entry.sensitive ? "<sensitive>" : entry.value,
          sensitive: (entry.sensitive as boolean) || undefined,
        }))
      : undefined;

    return {
      success,
      terraformVersion,
      resourceCount: resources.length,
      resources: resources.length > 0 ? resources : undefined,
      outputs: outputs && outputs.length > 0 ? outputs : undefined,
    };
  } catch {
    // Empty state returns empty JSON or "{}"
    if (stdout.trim() === "{}" || stdout.trim() === "") {
      return {
        success,
        resourceCount: 0,
      };
    }
    return {
      success,
      resourceCount: 0,
      error: "Failed to parse terraform show JSON",
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Recursively collects resources from a terraform JSON module structure. */
function collectResources(
  module: Record<string, unknown>,
  out: { address: string; type: string; name: string; provider?: string }[],
): void {
  const resources = module.resources as Record<string, unknown>[] | undefined;
  if (resources) {
    for (const r of resources) {
      out.push({
        address: (r.address as string) ?? "",
        type: (r.type as string) ?? "",
        name: (r.name as string) ?? "",
        provider: (r.provider_name as string) || undefined,
      });
    }
  }

  // Recurse into child modules
  const childModules = module.child_modules as Record<string, unknown>[] | undefined;
  if (childModules) {
    for (const child of childModules) {
      collectResources(child, out);
    }
  }
}

/** Extracts warning lines from terraform output. */
function extractWarnings(text: string): string[] {
  const warnings: string[] = [];
  const warnRe = /Warning:\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = warnRe.exec(text)) !== null) {
    warnings.push(match[1].trim());
  }
  return warnings;
}

/** Extracts the first meaningful error message from terraform output. */
function extractError(text: string): string {
  // Look for "Error: ..." lines
  const errorMatch = text.match(/Error:\s*(.+)/);
  if (errorMatch) return errorMatch[1].trim();

  // Fall back to first non-empty line
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return firstLine || "Unknown error";
}
