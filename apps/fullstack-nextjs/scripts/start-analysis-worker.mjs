import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, open, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("..", import.meta.url)),
  folder = new URL("../.runtime/", import.meta.url),
  pidFile = new URL("analysis-worker.pid", folder);
await mkdir(folder, { recursive: true, mode: 0o700 });
try {
  const pid = Number(await readFile(pidFile, "utf8"));
  if (pid > 0) {
    try {
      process.kill(pid, 0);
      console.log("Analiz servisi zaten açık.");
      process.exit(0);
    } catch {}
  }
} catch {}
const log = await open(new URL("analysis-worker.log", folder), "a", 0o600);
const child = spawn(
  process.execPath,
  ["--env-file=.env", "--import", "tsx", "scripts/analysis-worker.ts"],
  {
    cwd,
    detached: true,
    stdio: ["ignore", log.fd, log.fd],
    env: { ...process.env, QOOP_WORKER_PROVIDER: "claude" },
  },
);
await writeFile(pidFile, String(child.pid), { mode: 0o600 });
child.unref();
await log.close();
console.log("Yerel analiz servisi başlatıldı.");
