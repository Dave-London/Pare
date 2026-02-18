import { spawnSync } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const rawArgs = process.argv.slice(2);
const forwardedArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
const hasCoverage = forwardedArgs.includes("--coverage");

function run(args) {
  const result = spawnSync(pnpmCommand, args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.signal) {
    process.exit(1);
  }
}

if (hasCoverage) {
  run(["exec", "vitest", "run", ...forwardedArgs]);
  process.exit(0);
}

run(["run", "test:unit", ...forwardedArgs]);
run(["run", "test:integration", ...forwardedArgs]);
run(["run", "test:fidelity", ...forwardedArgs]);
