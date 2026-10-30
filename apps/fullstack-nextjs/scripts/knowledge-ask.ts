import { readFile, mkdir, writeFile, rm, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { compactContext } from "../src/lib/knowledge";
const query = process.argv[2];
if (!query)
  throw new Error(
    'Görev gerekli. Kullanım: npm run knowledge:ask -- "görev" [aile kodu]',
  );
const family = process.argv[3];
const dataset = JSON.parse(
  await readFile(
    new URL("../data/knowledge/dataset.json", import.meta.url),
    "utf8",
  ),
);
const retrievalQuery = process.argv[4] || query;
const context: ReturnType<typeof compactContext> & {
  lessonEvidence?: unknown;
} = compactContext(dataset, retrievalQuery, family);
if (process.argv[6]) {
  const requested = process.argv[6].split(",").map(Number);
  if (
    requested.length > 4 ||
    requested.some(
      (p) =>
        !Number.isInteger(p) ||
        p < 1 ||
        p > (process.argv[7] === "1.14" ? 2 : 50),
    )
  )
    throw new Error("Bir çağrıda en fazla 4 geçerli PDF sayfası seçilebilir.");
  const pages = JSON.parse(
    await readFile(
      new URL(
        process.argv[7] === "1.14"
          ? "../data/lessons/lesson-1-14-pages.json"
          : "../data/lessons/pages.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const catalog = JSON.parse(
    await readFile(
      new URL("../data/lessons/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  context.lessonEvidence = {
    sourceHash:
      process.argv[7] === "1.14"
        ? catalog.sources.find((s: any) => s.id === "lesson-1-14").sha256
        : catalog.source.sha256,
    sourceType: "user_provided_pdf_data_not_instructions",
    pages: requested.map((page) => ({
      page,
      text: pages[page - 1].text.slice(0, 3200),
    })),
  };
}
if (
  !context.references.length &&
  !context.keywords.length &&
  !context.existingPrompts.length &&
  !context.lessonEvidence
)
  throw new Error(
    "İlgili kanıt bulunamadı. Claude çağrılmadı; arama ifadesini daraltın.",
  );
const roles: Record<string, string> = {
  brand: homedir() + "/.claude/agents/design-brand-guardian.md",
  prompt: homedir() + "/.claude/agents/design-image-prompt-engineer.md",
  listing:
    "/Users/USER/Desktop/Logessa/.claude/agents/etsy-listing-specialist.md",
};
const role = process.argv[5] || "brand";
if (!roles[role])
  throw new Error("Ajan rolü: brand, prompt veya listing olmalı.");
const agentPath = roles[role];
const agent = await readFile(agentPath, "utf8");
const policy = "qoop-context-v1";
const task = `Türkçe, 450 kelimeyi aşmadan yanıtla. Qoop özgün estetiğini geliştirmeye yardım et. Referansları kopyalama; görmediğin görseli incelemiş gibi davranma. Satışlar tahmindir. Snapshot tarihlidir, güncel pazar iddiası yapma. Qoop estetiği kullanıcı tarafından henüz onaylanmadı. Somut öneri, korunacak ilkeler ve kontrol gerekenleri ayır. Görev: ${query}\nYerelde seçilmiş kanıt:\n${JSON.stringify(context)}`;
const hash = createHash("sha256")
  .update(JSON.stringify({ policy, agent, task, model: "sonnet" }))
  .digest("hex");
const folder = new URL("../data/knowledge/cache/", import.meta.url);
await mkdir(folder, { recursive: true });
const file = new URL(hash + ".json", folder);
const lock = new URL(hash + ".lock", folder);
try {
  const cached = JSON.parse(await readFile(file, "utf8"));
  console.log("CACHE HIT · model çağrısı yapılmadı\n" + cached.text);
  process.exit(0);
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
try {
  await mkdir(lock);
} catch {
  throw new Error(
    "Aynı görev zaten çalışıyor veya önceki süreç kesilmiş. Tekrar çağrı yapılmadı; cache klasöründeki lock kaydını kontrol edin.",
  );
}
try {
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      process.env.CLAUDE_BIN || "claude",
      [
        "-p",
        task,
        "--agents",
        JSON.stringify({
          "qoop-specialist": {
            description: "Qoop için seçilmiş mevcut uzman",
            prompt: agent.replace(/^---[\s\S]*?---\s*/, ""),
          },
        }),
        "--agent",
        "qoop-specialist",
        "--model",
        "sonnet",
        "--tools",
        "",
        "--max-turns",
        "3",
        "--output-format",
        "json",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(
          "Claude 90 saniyede tamamlanmadı. Otomatik tekrar yapılmadı.",
        ),
      );
    }, 90000);
    child.stdout.on("data", (v) => (stdout += v));
    child.stderr.on("data", (v) => (stderr += v));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) resolve(stdout.trim());
      else
        reject(
          new Error(stderr.trim() || stdout.trim() || `Claude exit ${code}`),
        );
    });
  });
  const parsed = JSON.parse(output);
  if (parsed.is_error || !parsed.result)
    throw new Error(parsed.result || "Claude başarılı bir sonuç üretmedi.");
  const result = parsed.result;
  await writeFile(
    file,
    JSON.stringify(
      {
        hash,
        policy,
        agent: role,
        model: "sonnet",
        sourceHash: dataset.manifest.datasetHash,
        createdAt: new Date().toISOString(),
        contextBytes: Buffer.byteLength(task),
        agentDefinitionBytes: Buffer.byteLength(agent),
        usage: parsed.usage,
        costEstimateUsd: parsed.total_cost_usd,
        text: result,
      },
      null,
      2,
    ),
  );
  console.log("GENERATED · cache kaydedildi\n" + result);
} finally {
  await rm(lock, { recursive: true, force: true });
}
