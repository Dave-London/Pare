import { parseArgs } from "node:util";

export interface InitArgs {
  client?: string;
  preset?: string;
  all: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
}

export interface DoctorArgs {
  client?: string;
  help: boolean;
  version: boolean;
}

export function parseInitArgs(argv: string[]): InitArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      client: { type: "string", short: "c" },
      preset: { type: "string", short: "p" },
      all: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  return {
    client: values.client,
    preset: values.all ? "full" : values.preset,
    all: values.all ?? false,
    dryRun: values["dry-run"] ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

export function parseDoctorArgs(argv: string[]): DoctorArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      client: { type: "string", short: "c" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  return {
    client: values.client,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

export const INIT_HELP = `
Usage: pare-init [options]

Setup Pare MCP servers in your AI coding client.

Options:
  -c, --client <id>   Target client (skip detection prompt)
  -p, --preset <id>   Server preset: web, python, rust, go, devops, full
  --all               Shorthand for --preset full
  --dry-run           Print what would be written without writing
  -h, --help          Show this help message
  -v, --version       Show version
`.trim();

export const DOCTOR_HELP = `
Usage: pare-doctor [options]

Check the health of configured Pare MCP servers.

Options:
  -c, --client <id>   Target client (skip detection prompt)
  -h, --help          Show this help message
  -v, --version       Show version
`.trim();
