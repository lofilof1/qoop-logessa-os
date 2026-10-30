import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export const imageModel = "gpt-image-2";
const configPath = () =>
  path.join(
    process.env.QOOP_RUNTIME_DIR || path.join(process.cwd(), ".runtime"),
    "openai.json",
  );
export async function imageKey() {
  try {
    const config = JSON.parse(await readFile(configPath(), "utf8"));
    if (typeof config.apiKey === "string") return config.apiKey;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT")
      throw new Error("Bağlantı ayarı okunamadı.");
  }
  return process.env.OPENAI_API_KEY || "";
}
export async function saveImageKey(apiKey: string) {
  const p = configPath();
  await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
  await writeFile(p, JSON.stringify({ apiKey }), { mode: 0o600 });
}
export function localMutation(r: Request) {
  const origin = r.headers.get("origin");
  const host = r.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host)
    throw new Error("Bu işlem yalnızca LOGESSA ekranından yapılabilir.");
}
export function providerMessage(status: number) {
  if (status === 401)
    return "OpenAI anahtarı geçersiz. Bağlantı alanından yenile.";
  if (status === 402 || status === 429)
    return "OpenAI kota/bakiye veya hız sınırı. API hesabını kontrol et; otomatik tekrar yapılmadı.";
  if (status === 403)
    return "OpenAI model erişimi/organizasyon doğrulaması gerekli olabilir.";
  if (status === 400)
    return "OpenAI üretim isteğini kabul etmedi. İçeriği ve model erişimini kontrol et.";
  return "OpenAI isteği tamamlanamadı. Otomatik tekrar yapılmadı.";
}
