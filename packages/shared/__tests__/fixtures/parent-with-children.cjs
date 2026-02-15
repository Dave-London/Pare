// Test fixture: spawns a grandchild process that stays alive.
// Used to verify that timeout kills the entire process group,
// not just the direct child PID.
//
// Usage: node parent-with-children.js <pid-file-path>
// Writes the grandchild PID to the specified file, then stays alive.
const { spawn } = require("child_process");
const { writeFileSync } = require("fs");

const pidFile = process.argv[2];
if (!pidFile) {
  process.stderr.write("Usage: node parent-with-children.js <pid-file>\n");
  process.exit(1);
}

// Spawn a grandchild that sleeps forever
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 60000)"], {
  stdio: "ignore",
});

// Write grandchild PID to the file so the test can verify cleanup
writeFileSync(pidFile, String(child.pid));

// Parent also stays alive
setInterval(() => {}, 60000);
