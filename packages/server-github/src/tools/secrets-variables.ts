import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import {
  SecretListResultSchema,
  SecretMutationResultSchema,
  VariableListResultSchema,
  VariableMutationResultSchema,
  type SecretListResult,
  type SecretMutationResult,
  type VariableListResult,
  type VariableMutationResult,
} from "../schemas/index.js";
import {
  formatSecretList,
  formatSecretMutation,
  formatVariableList,
  formatVariableMutation,
} from "../lib/formatters.js";

const SECRET_LIST_FIELDS = "name,updatedAt,visibility,numSelectedRepos,selectedReposURL";
const VARIABLE_LIST_FIELDS =
  "name,value,createdAt,updatedAt,visibility,numSelectedRepos,selectedReposURL";

const visibilityInput = z
  .enum(["all", "private", "selected"])
  .optional()
  .describe("Organization visibility: all, private, or selected");
const appInput = z
  .enum(["actions", "codespaces", "dependabot"])
  .optional()
  .describe("GitHub app scope for secrets: actions, codespaces, or dependabot");
const reposInput = z
  .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
  .max(INPUT_LIMITS.ARRAY_MAX)
  .optional()
  .describe(
    "Repositories that can access an organization secret/variable when visibility=selected",
  );

type ConfigScope = "repo" | "org" | "environment";
type ConfigError = "not-found" | "permission-denied" | "validation" | "unknown";

function classifyConfigError(text: string): ConfigError {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|unknown repository|unknown environment/.test(lower)) {
    return "not-found";
  }
  if (/forbidden|permission|403|must have admin rights|requires.*scope|oauth/.test(lower)) {
    return "permission-denied";
  }
  if (/validation|invalid|required|unprocessable|visibility|repository/.test(lower)) {
    return "validation";
  }
  return "unknown";
}

function scopeFor(org?: string, env?: string): ConfigScope {
  if (org) return "org";
  if (env) return "environment";
  return "repo";
}

function assertScopeInputs(name: string, repo?: string, org?: string, env?: string) {
  assertNoFlagInjection(name, "name");
  if (repo) assertNoFlagInjection(repo, "repo");
  if (org) assertNoFlagInjection(org, "org");
  if (env) assertNoFlagInjection(env, "env");
  if (org && env) {
    throw new Error("Use either org or env scope, not both.");
  }
}

function addScopeArgs(args: string[], repo?: string, org?: string, env?: string) {
  if (repo) args.push("--repo", repo);
  if (org) args.push("--org", org);
  if (env) args.push("--env", env);
}

function addOrgVisibilityArgs(
  args: string[],
  org: string | undefined,
  visibility: "all" | "private" | "selected" | undefined,
  repos: string[] | undefined,
) {
  if (!org) return;
  if (visibility) args.push("--visibility", visibility);
  if (repos && repos.length > 0) {
    for (const repo of repos) assertNoFlagInjection(repo, "repos");
    args.push("--repos", repos.join(","));
  }
}

function mutationError<T extends SecretMutationResult | VariableMutationResult>(
  base: T,
  result: { stdout: string; stderr: string },
): T {
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  return {
    ...base,
    errorType: classifyConfigError(combined),
    errorMessage: combined || "gh command failed",
  };
}

function listError<T extends SecretListResult | VariableListResult>(
  base: T,
  result: { stdout: string; stderr: string },
): T {
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  return {
    ...base,
    errorType: classifyConfigError(combined),
    errorMessage: combined || "gh command failed",
  };
}

export function registerSecretSetTool(server: McpServer) {
  server.registerTool(
    "secret-set",
    {
      title: "Secret Set",
      description:
        "Sets a repository, organization, or environment GitHub Actions secret. Secret values are sent via stdin and never returned.",
      annotations: { openWorldHint: true },
      inputSchema: {
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Secret name"),
        value: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Secret value"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        visibility: visibilityInput,
        repos: reposInput,
        app: appInput,
        path: repoPathInput,
      },
      outputSchema: SecretMutationResultSchema,
    },
    async ({ name, value, repo, org, env, visibility, repos, app, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs(name, repo, org, env);
      if (app) assertNoFlagInjection(app, "app");

      const scope = scopeFor(org, env);
      const args = ["secret", "set", name];
      addScopeArgs(args, repo, org, env);
      addOrgVisibilityArgs(args, org, visibility, repos);
      if (app) args.push("--app", app);

      const base: SecretMutationResult = { name, action: "set", scope, secretValueMasked: true };
      const result = await ghCmd(args, { cwd, stdin: value });
      if (result.exitCode !== 0) {
        return dualOutput(mutationError(base, result), formatSecretMutation);
      }
      return dualOutput(base, formatSecretMutation);
    },
  );
}

export function registerSecretListTool(server: McpServer) {
  server.registerTool(
    "secret-list",
    {
      title: "Secret List",
      description:
        "Lists repository, organization, or environment secret names and metadata. Secret values are not exposed by GitHub.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        app: appInput,
        path: repoPathInput,
      },
      outputSchema: SecretListResultSchema,
    },
    async ({ repo, org, env, app, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs("secret-list", repo, org, env);
      if (app) assertNoFlagInjection(app, "app");

      const scope = scopeFor(org, env);
      const args = ["secret", "list", "--json", SECRET_LIST_FIELDS];
      addScopeArgs(args, repo, org, env);
      if (app) args.push("--app", app);

      const result = await ghCmd(args, cwd);
      const base: SecretListResult = { secrets: [], scope };
      if (result.exitCode !== 0) {
        return dualOutput(listError(base, result), formatSecretList);
      }
      return dualOutput(
        { secrets: JSON.parse(result.stdout) as SecretListResult["secrets"], scope },
        formatSecretList,
      );
    },
  );
}

export function registerSecretDeleteTool(server: McpServer) {
  server.registerTool(
    "secret-delete",
    {
      title: "Secret Delete",
      description: "Deletes a repository, organization, or environment GitHub Actions secret.",
      annotations: { openWorldHint: true },
      inputSchema: {
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Secret name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        app: appInput,
        path: repoPathInput,
      },
      outputSchema: SecretMutationResultSchema,
    },
    async ({ name, repo, org, env, app, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs(name, repo, org, env);
      if (app) assertNoFlagInjection(app, "app");

      const scope = scopeFor(org, env);
      const args = ["secret", "delete", name];
      addScopeArgs(args, repo, org, env);
      if (app) args.push("--app", app);

      const base: SecretMutationResult = {
        name,
        action: "delete",
        scope,
        secretValueMasked: true,
      };
      const result = await ghCmd(args, cwd);
      if (result.exitCode !== 0) {
        return dualOutput(mutationError(base, result), formatSecretMutation);
      }
      return dualOutput(base, formatSecretMutation);
    },
  );
}

export function registerVariableSetTool(server: McpServer) {
  server.registerTool(
    "variable-set",
    {
      title: "Variable Set",
      description:
        "Sets a repository, organization, or environment GitHub Actions variable. Variables are not secret and may be visible in logs.",
      annotations: { openWorldHint: true },
      inputSchema: {
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Variable name"),
        value: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Variable value"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        visibility: visibilityInput,
        repos: reposInput,
        path: repoPathInput,
      },
      outputSchema: VariableMutationResultSchema,
    },
    async ({ name, value, repo, org, env, visibility, repos, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs(name, repo, org, env);

      const scope = scopeFor(org, env);
      const args = ["variable", "set", name];
      addScopeArgs(args, repo, org, env);
      addOrgVisibilityArgs(args, org, visibility, repos);

      const base: VariableMutationResult = { name, action: "set", scope };
      const result = await ghCmd(args, { cwd, stdin: value });
      if (result.exitCode !== 0) {
        return dualOutput(mutationError(base, result), formatVariableMutation);
      }
      return dualOutput(base, formatVariableMutation);
    },
  );
}

export function registerVariableListTool(server: McpServer) {
  server.registerTool(
    "variable-list",
    {
      title: "Variable List",
      description:
        "Lists repository, organization, or environment GitHub Actions variables with values and metadata.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        path: repoPathInput,
      },
      outputSchema: VariableListResultSchema,
    },
    async ({ repo, org, env, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs("variable-list", repo, org, env);

      const scope = scopeFor(org, env);
      const args = ["variable", "list", "--json", VARIABLE_LIST_FIELDS];
      addScopeArgs(args, repo, org, env);

      const result = await ghCmd(args, cwd);
      const base: VariableListResult = { variables: [], scope };
      if (result.exitCode !== 0) {
        return dualOutput(listError(base, result), formatVariableList);
      }
      return dualOutput(
        { variables: JSON.parse(result.stdout) as VariableListResult["variables"], scope },
        formatVariableList,
      );
    },
  );
}

export function registerVariableDeleteTool(server: McpServer) {
  server.registerTool(
    "variable-delete",
    {
      title: "Variable Delete",
      description: "Deletes a repository, organization, or environment GitHub Actions variable.",
      annotations: { openWorldHint: true },
      inputSchema: {
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Variable name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        org: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Organization"),
        env: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Deployment environment name"),
        path: repoPathInput,
      },
      outputSchema: VariableMutationResultSchema,
    },
    async ({ name, repo, org, env, path }) => {
      const cwd = path || process.cwd();
      assertScopeInputs(name, repo, org, env);

      const scope = scopeFor(org, env);
      const args = ["variable", "delete", name];
      addScopeArgs(args, repo, org, env);

      const base: VariableMutationResult = { name, action: "delete", scope };
      const result = await ghCmd(args, cwd);
      if (result.exitCode !== 0) {
        return dualOutput(mutationError(base, result), formatVariableMutation);
      }
      return dualOutput(base, formatVariableMutation);
    },
  );
}
