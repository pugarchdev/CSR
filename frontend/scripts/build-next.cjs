const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const nextDir = path.join(root, ".next");
try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch (err) {
  console.warn(`Could not clean .next directory: ${err.message}. Proceeding anyway...`);
}
try {
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }
} catch (err) {
  // ignore
}

const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
