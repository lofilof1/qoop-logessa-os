import { getChatGPTUser } from "@/app/chatgpt-auth";
import { env } from "cloudflare:workers";
export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export async function access(req: Request, write = false) { const user = await getChatGPTUser(); if (!user)
    throw new HttpError(401, "Devam etmek için çalışma alanına giriş yap."); if (write) {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin)
        throw new HttpError(403, "İstek kaynağı doğrulanamadı.");
} return user.userId; }
export function database() { if (!env.DB)
    throw new HttpError(503, "Veritabanı henüz hazır değil."); return env.DB; }
export async function jsonBody(req: Request) { if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON bekleniyor."); const text = await req.text(); if (text.length > 70000)
    throw new HttpError(413, "Kayıt çok büyük."); try {
    return JSON.parse(text);
}
catch {
    throw new HttpError(400, "Geçersiz JSON.");
} }
export function result(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export function failure(e: unknown) { if (e instanceof HttpError)
    return result({ error: e.message }, e.status); if (e && typeof e === "object" && "issues" in e)
    return result({ error: "Alanları kontrol et; bazı değerler geçerli değil." }, 400); console.error("Request failed", e instanceof Error ? e.name : "unknown"); return result({ error: "İşlem tamamlanamadı. Tekrar denemeden önce bağlantını kontrol et." }, 500); }
