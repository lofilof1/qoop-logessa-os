import { env } from "cloudflare:workers";
import { z } from "zod";
import { access, database, failure, result, jsonBody, HttpError } from "@/lib/server";
const input = z.object({ kind: z.enum(["keywords", "products", "usage"]), query: z.string().trim().max(250).default("") });
const pending = new Map<string, Promise<unknown>>();
export async function GET(req: Request) { try {
    const owner = await access(req), rows = await database().prepare("SELECT id,kind,query,body,fetched_at FROM research WHERE owner=? AND kind NOT LIKE 'cache:%' ORDER BY fetched_at DESC LIMIT 40").bind(owner).all();
    return result(rows.results.map(r => ({ id: r.id, kind: r.kind, query: r.query, ...JSON.parse(r.body as string), fetchedAt: r.fetched_at, cached: true })));
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) {
    try {
        const owner = await access(req, true), { kind, query } = input.parse(await jsonBody(req)), q = query.toLowerCase().trim();
        if (kind !== "usage" && q.length < 2)
            throw new HttpError(400, "En az 2 karakterlik bir arama yaz.");
        if (!env.ALURA_API_KEY)
            throw new HttpError(503, "Alura bağlantısı yapılandırılmamış. ALURA_API_KEY sunucu sırrını ekle.");
        const db = database(), last = await db.prepare("SELECT body,fetched_at FROM research WHERE owner=? AND kind=? AND query=? ORDER BY fetched_at DESC LIMIT 1").bind(owner, kind, q).first<{
            body: string;
            fetched_at: string;
        }>();
        if (last && Date.now() - Date.parse(last.fetched_at) < (kind === "usage" ? 60000 : 86400000))
            return result({ ...JSON.parse(last.body), fetchedAt: last.fetched_at, cached: true });
        const key = `${owner}:${kind}:${q}`;
        if (pending.has(key))
            return result(await pending.get(key));
        const task = (async () => {
            const window = new Date().toISOString().slice(0, 16);
            const count = await db.prepare("INSERT INTO rate_limits (owner,window,count) VALUES (?,?,1) ON CONFLICT(owner,window) DO UPDATE SET count=count+1 WHERE count<6 RETURNING count").bind(owner, window).first();
            if (!count)
                throw new HttpError(429, "Bir dakikada en fazla 6 yeni sorgu. Biraz sonra tekrar dene.");
            await db.prepare("DELETE FROM rate_limits WHERE owner=? AND window<?").bind(owner, new Date(Date.now() - 86400000).toISOString().slice(0, 16)).run();
            const url = new URL(`https://api.alura.io/v1/${kind === "usage" ? "usage" : `research/${kind}`}`);
            if (kind === "keywords") {
                url.searchParams.set("q", q);
                url.searchParams.set("language", "en");
            }
            if (kind === "products") {
                url.searchParams.set("q", q);
                url.searchParams.set("limit", "25");
                url.searchParams.set("sort", "est_monthly_sales");
                url.searchParams.set("fields", "id,title,price.usd,sales.est_monthly_avg,shop.name,as_of");
            }
            let response: Response;
            try {
                response = await fetch(url, { headers: { Authorization: `Bearer ${env.ALURA_API_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
            }
            catch {
                throw new HttpError(504, "Alura zamanında yanıt vermedi. Otomatik tekrar yapılmadı; yeniden aramadan önce geçmişi kontrol et.");
            }
            if (!response.ok) {
                const messages: Record<number, string> = { 400: "Alura aramayı kabul etmedi; sorguyu kontrol et.", 401: "Alura anahtarı geçersiz veya süresi dolmuş.", 403: "Anahtarın bu işlem için yetkisi veya plan erişimi yok.", 429: "Alura kredi veya hız sınırına ulaşıldı. Bekleyip kullanımını kontrol et." };
                throw new HttpError(response.status === 429 ? 429 : 502, messages[response.status] || "Alura şu anda yanıt veremiyor. Otomatik tekrar yapılmadı.");
            }
            const raw = await response.json() as Record<string, unknown>;
            const data = kind === "usage" ? { plan: raw.plan, credits: raw.credits, daily: raw.daily, period: raw.period } : raw.data;
            if (kind !== "usage" && !Array.isArray(data))
                throw new HttpError(502, "Alura yanıt biçimi beklenenden farklı.");
            const payload = { kind, query: q, data, pending: raw.pending || [], unfetched: raw.unfetched || [], hasMore: !!raw.has_more, cost: response.headers.get("Alura-Credits-Cost"), remaining: response.headers.get("Alura-Credits-Remaining") };
            const fetchedAt = new Date().toISOString();
            // Pending keyword results should be retried explicitly, not cached for a full day.
            if (kind === "usage" || (Array.isArray(data) && data.length))
                await db.prepare("INSERT INTO research (id,owner,kind,query,body,fetched_at) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), owner, kind, q, JSON.stringify(payload), fetchedAt).run();
            return { ...payload, fetchedAt, cached: false };
        })();
        pending.set(key, task);
        try {
            return result(await task);
        }
        finally {
            pending.delete(key);
        }
    }
    catch (e) {
        return failure(e);
    }
}
