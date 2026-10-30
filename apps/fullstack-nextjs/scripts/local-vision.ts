import { request } from "node:http";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { localVisionModel } from "../src/lib/analysis-engine";
export const localEndpoint = () => {
  const value = process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434";
  const u = new URL(value);
  if (
    u.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "host.docker.internal"].includes(u.hostname) ||
    u.username ||
    u.password
  )
    throw Error(
      "Yerel model yalnız bu Mac üzerindeki adresten kullanılabilir.",
    );
  return value.replace(/\/$/, "");
};
export async function localModelReady() {
  try {
    const r = await fetch(localEndpoint() + "/api/tags", {
      signal: AbortSignal.timeout(2000),
    });
    const x = await r.json();
    return (
      r.ok &&
      x.models?.some((m: { name: string }) => m.name === localVisionModel)
    );
  } catch {
    return false;
  }
}
export async function runLocalVision<T>(
  image: Buffer | null,
  instruction: string,
  identity: string,
  schema: Record<string, unknown>,
  parse: (text: string) => T,
  limits: {outputTokens:number;contextTokens:number} = {outputTokens:3000,contextTokens:8192},
) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        engine: "local-v1",
        model: localVisionModel,
        identity,
        instruction,
        schema,
        limits,
      }),
    )
    .digest("hex");
  const folder = path.join(
    process.env.QOOP_RUNTIME_DIR || path.join(process.cwd(), ".runtime"),
    "local-response-cache",
  );
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const file = path.join(folder, hash + ".json");
  try {
    const stored = JSON.parse(await readFile(file, "utf8"));
    return { result: parse(stored.text), usage: {}, cached: true };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  // Node fetch has a separate five-minute response-header limit. Local vision
  // may legitimately exceed it; use one explicitly bounded native HTTP call.
  const payload = JSON.stringify({
      model: localVisionModel,
      stream: false,
      think: false,
      format: schema,
      keep_alive: "2m",
      options: { temperature: 0.1, num_ctx: limits.contextTokens, num_predict: limits.outputTokens },
      messages: [
        {
          role: "system",
          content:
            "Follow the requested schema. Only supplied images and data are evidence. Do not invent physical product properties, market claims, or actions. Return only JSON.",
        },
        {
          role: "user",
          content: instruction,
          ...(image ? { images: [image.toString("base64")] } : {}),
        },
      ],
    });
  const response = await new Promise<Response>((resolve,reject)=>{
    const req=request(new URL(localEndpoint()+"/api/chat"),{method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(payload)},signal:AbortSignal.timeout(600000)},res=>{
      const parts:Buffer[]=[];let length=0;
      res.on("data",part=>{length+=part.length;if(length>4*1024*1024){req.destroy(new Error("Yerel model yanıtı boyut sınırını aştı."));return;}parts.push(Buffer.from(part));});
      res.on("error",reject);
      res.on("end",()=>resolve(new Response(Buffer.concat(parts),{status:res.statusCode||500})));
    });
    req.on("error",reject);req.end(payload);
  });
  if (!response.ok)
    throw Error("Yerel görsel modeli yanıt vermedi. Claude’a geçilmedi.");
  const data = await response.json();
  if (
    typeof data.message?.content !== "string" ||
    !data.done ||
    data.done_reason === "length"
  )
    throw Error("Yerel model yanıtı tamamlanamadı; otomatik tekrar yapılmadı.");
  const stored = {
    text: data.message.content,
    model: localVisionModel,
    usage: {
      provider: "local",
      inputTokens: data.prompt_eval_count || 0,
      outputTokens: data.eval_count || 0,
    },
  };
  await writeFile(file + ".tmp", JSON.stringify(stored), { mode: 0o600 });
  await rename(file + ".tmp", file);
  return { result: parse(stored.text), usage: stored.usage, cached: false };
}
