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

// ── Full formatters ──────────────────────────────────────────────────

export function formatInit(data: TerraformInitResult): string {
  const lines: string[] = [];
  lines.push(data.success ? "terraform init: success" : "terraform init: failed");
  if (data.backendType) lines.push(`backend: ${data.backendType}`);
  if (data.providers) {
    for (const p of data.providers) {
      lines.push(`  provider: ${p.name}${p.version ? ` v${p.version}` : ""}`);
    }
  }
  if (data.warnings) {
    for (const w of data.warnings) lines.push(`warning: ${w}`);
  }
  if (data.error) lines.push(`error: ${data.error}`);
  return lines.join("\n");
}

export function formatPlan(data: TerraformPlanResult): string {
  const lines: string[] = [];
  if (!data.success) {
    lines.push("terraform plan: failed");
    if (data.error) lines.push(`error: ${data.error}`);
    return lines.join("\n");
  }
  lines.push(`terraform plan: +${data.add} ~${data.change} -${data.destroy}`);
  if (data.resources) {
    for (const r of data.resources) {
      const symbol =
        r.action === "create"
          ? "+"
          : r.action === "delete"
            ? "-"
            : r.action === "update"
              ? "~"
              : r.action === "replace"
                ? "-/+"
                : r.action === "read"
                  ? "<="
                  : " ";
      lines.push(`  ${symbol} ${r.address}`);
    }
  }
  if (data.warnings) {
    for (const w of data.warnings) lines.push(`warning: ${w}`);
  }
  return lines.join("\n");
}

export function formatValidate(data: TerraformValidateResult): string {
  const lines: string[] = [];
  lines.push(
    data.valid
      ? "terraform validate: valid"
      : `terraform validate: invalid (${data.errorCount} errors, ${data.warningCount} warnings)`,
  );
  if (data.diagnostics) {
    for (const d of data.diagnostics) {
      const loc = d.file ? ` (${d.file}${d.line ? `:${d.line}` : ""})` : "";
      lines.push(`  ${d.severity}: ${d.summary}${loc}`);
      if (d.detail) lines.push(`    ${d.detail}`);
    }
  }
  return lines.join("\n");
}

export function formatFmt(data: TerraformFmtResult): string {
  if (data.success) return "terraform fmt: all files formatted correctly";
  const lines: string[] = ["terraform fmt: files need formatting"];
  if (data.files) {
    for (const f of data.files) lines.push(`  ${f}`);
  }
  if (data.diff) lines.push(data.diff);
  return lines.join("\n");
}

export function formatOutput(data: TerraformOutputResult): string {
  if (!data.success) return `terraform output: failed\n${data.error ?? ""}`.trim();
  if (!data.outputs || data.outputs.length === 0) return "terraform output: no outputs";
  const lines: string[] = [`terraform output: ${data.outputs.length} outputs`];
  for (const o of data.outputs) {
    const sens = o.sensitive ? " [sensitive]" : "";
    const val = typeof o.value === "string" ? o.value : JSON.stringify(o.value);
    lines.push(`  ${o.name} = ${val}${sens}`);
  }
  return lines.join("\n");
}

export function formatStateList(data: TerraformStateListResult): string {
  if (!data.success) return `terraform state list: failed\n${data.error ?? ""}`.trim();
  if (data.total === 0) return "terraform state list: no resources";
  const lines: string[] = [`terraform state list: ${data.total} resources`];
  if (data.resources) {
    for (const r of data.resources) lines.push(`  ${r}`);
  }
  return lines.join("\n");
}

export function formatWorkspace(data: TerraformWorkspaceResult): string {
  if (!data.success)
    return `terraform workspace ${data.action}: failed\n${data.error ?? ""}`.trim();
  if (data.action === "list") {
    const lines: string[] = [`terraform workspace list:`];
    for (const w of data.workspaces ?? []) {
      lines.push(w === data.current ? `  * ${w}` : `    ${w}`);
    }
    return lines.join("\n");
  }
  return `terraform workspace ${data.action}: success${data.current ? ` (now on: ${data.current})` : ""}`;
}

export function formatShow(data: TerraformShowResult): string {
  if (!data.success) return `terraform show: failed\n${data.error ?? ""}`.trim();
  const lines: string[] = [
    `terraform show: ${data.resourceCount} resources${data.terraformVersion ? ` (v${data.terraformVersion})` : ""}`,
  ];
  if (data.resources) {
    for (const r of data.resources) {
      lines.push(`  ${r.address} (${r.type})`);
    }
  }
  if (data.outputs && data.outputs.length > 0) {
    lines.push(`outputs: ${data.outputs.length}`);
    for (const o of data.outputs) {
      const val = typeof o.value === "string" ? o.value : JSON.stringify(o.value);
      lines.push(`  ${o.name} = ${val}${o.sensitive ? " [sensitive]" : ""}`);
    }
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

export interface TerraformInitCompact {
  [key: string]: unknown;
  success: boolean;
  providerCount: number;
  backendType?: string;
}

export function compactInitMap(data: TerraformInitResult): TerraformInitCompact {
  return {
    success: data.success,
    providerCount: data.providers?.length ?? 0,
    backendType: data.backendType,
  };
}

export function formatInitCompact(data: TerraformInitCompact): string {
  return `terraform init: ${data.success ? "success" : "failed"} (${data.providerCount} providers${data.backendType ? `, backend: ${data.backendType}` : ""})`;
}

export interface TerraformPlanCompact {
  [key: string]: unknown;
  success: boolean;
  add: number;
  change: number;
  destroy: number;
}

export function compactPlanMap(data: TerraformPlanResult): TerraformPlanCompact {
  return {
    success: data.success,
    add: data.add,
    change: data.change,
    destroy: data.destroy,
  };
}

export function formatPlanCompact(data: TerraformPlanCompact): string {
  if (!data.success) return "terraform plan: failed";
  return `terraform plan: +${data.add} ~${data.change} -${data.destroy}`;
}

export interface TerraformValidateCompact {
  [key: string]: unknown;
  valid: boolean;
  errorCount: number;
  warningCount: number;
}

export function compactValidateMap(data: TerraformValidateResult): TerraformValidateCompact {
  return {
    valid: data.valid,
    errorCount: data.errorCount,
    warningCount: data.warningCount,
  };
}

export function formatValidateCompact(data: TerraformValidateCompact): string {
  if (data.valid) return "terraform validate: valid";
  return `terraform validate: invalid (${data.errorCount} errors, ${data.warningCount} warnings)`;
}

export interface TerraformFmtCompact {
  [key: string]: unknown;
  success: boolean;
  fileCount: number;
}

export function compactFmtMap(data: TerraformFmtResult): TerraformFmtCompact {
  return {
    success: data.success,
    fileCount: data.files?.length ?? 0,
  };
}

export function formatFmtCompact(data: TerraformFmtCompact): string {
  if (data.success) return "terraform fmt: all files formatted correctly";
  return `terraform fmt: ${data.fileCount} files need formatting`;
}

export interface TerraformOutputCompact {
  [key: string]: unknown;
  success: boolean;
  outputCount: number;
}

export function compactOutputMap(data: TerraformOutputResult): TerraformOutputCompact {
  return {
    success: data.success,
    outputCount: data.outputs?.length ?? 0,
  };
}

export function formatOutputCompact(data: TerraformOutputCompact): string {
  if (!data.success) return "terraform output: failed";
  return `terraform output: ${data.outputCount} outputs`;
}

export interface TerraformStateListCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactStateListMap(data: TerraformStateListResult): TerraformStateListCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatStateListCompact(data: TerraformStateListCompact): string {
  if (!data.success) return "terraform state list: failed";
  return `terraform state list: ${data.total} resources`;
}

export interface TerraformWorkspaceCompact {
  [key: string]: unknown;
  success: boolean;
  action: string;
  current?: string;
  workspaceCount: number;
}

export function compactWorkspaceMap(data: TerraformWorkspaceResult): TerraformWorkspaceCompact {
  return {
    success: data.success,
    action: data.action,
    current: data.current,
    workspaceCount: data.workspaces?.length ?? 0,
  };
}

export function formatWorkspaceCompact(data: TerraformWorkspaceCompact): string {
  if (!data.success) return `terraform workspace ${data.action}: failed`;
  if (data.action === "list")
    return `terraform workspace list: ${data.workspaceCount} workspaces (current: ${data.current ?? "unknown"})`;
  return `terraform workspace ${data.action}: success${data.current ? ` (now on: ${data.current})` : ""}`;
}

export interface TerraformShowCompact {
  [key: string]: unknown;
  success: boolean;
  resourceCount: number;
  outputCount: number;
}

export function compactShowMap(data: TerraformShowResult): TerraformShowCompact {
  return {
    success: data.success,
    resourceCount: data.resourceCount,
    outputCount: data.outputs?.length ?? 0,
  };
}

export function formatShowCompact(data: TerraformShowCompact): string {
  if (!data.success) return "terraform show: failed";
  return `terraform show: ${data.resourceCount} resources, ${data.outputCount} outputs`;
}
