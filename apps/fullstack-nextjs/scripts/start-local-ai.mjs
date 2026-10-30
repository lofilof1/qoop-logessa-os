import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdir, open, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const installed = homedir() + "/Library/Application Support/Qoop/LocalAI";
const folder = existsSync(installed + "/ollama")
  ? installed
  : root + "/.runtime/local-llm";
await mkdir(folder + "/models", { recursive: true });
try {
  const r = await fetch("http://127.0.0.1:11434/api/version", {
    signal: AbortSignal.timeout(1500),
  });
  if (r.ok) {
    console.log("Yerel görsel servisi zaten açık.");
    process.exit(0);
  }
} catch {}
const log = await open(folder + "/server.log", "a", 0o600);
const child = spawn(folder + "/ollama", ["serve"], {
  cwd: folder,
  detached: true,
  stdio: ["ignore", log.fd, log.fd],
  env: {
    ...process.env,
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_AUTH_TOKEN: "",
    OLLAMA_HOST: "127.0.0.1:11434",
    OLLAMA_MODELS: folder + "/models",
    OLLAMA_NO_CLOUD: "1",
    OLLAMA_NUM_PARALLEL: "1",
    OLLAMA_MAX_LOADED_MODELS: "1",
    OLLAMA_CONTEXT_LENGTH: "8192",
  },
});
await writeFile(folder + "/server.pid", String(child.pid));
child.unref();
await log.close();
console.log("Yerel görsel servisi başlatıldı.");
