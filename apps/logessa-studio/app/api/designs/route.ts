import { access, database, failure, result, jsonBody, HttpError } from "@/lib/server";
import { bodySchema, designInput, readiness } from "@/lib/domain";
const decode = (r: Record<string, unknown>) => ({ ...r, body: bodySchema.parse(JSON.parse(r.body as string)), createdAt: r.created_at, updatedAt: r.updated_at, archived: !!r.archived, owner: undefined });
export async function GET(req: Request) { try {
    const owner = await access(req);
    const rows = await database().prepare("SELECT * FROM designs WHERE owner=? ORDER BY updated_at DESC LIMIT 1000").bind(owner).all();
    return result(rows.results.map(decode));
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) { try {
    const owner = await access(req, true), d = designInput.parse(await jsonBody(req));
    if (d.body.imageId) throw new HttpError(422,"Önce tasarımı oluştur, ardından kendi master görselini yükle.");
    if (d.stage === "ready" && readiness(d).length)
        throw new HttpError(422, "Baskı ve ilan kontrollerini tamamlamadan ilana hazır olarak kaydedemezsin.");
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await database().prepare("INSERT INTO designs (id,owner,name,kind,stage,body,version,created_at,updated_at,archived) VALUES (?,?,?,?,?,?,1,?,?,0)").bind(id, owner, d.name, d.kind, d.stage, JSON.stringify(d.body), now, now).run();
    return result({ ...d, id, version: 1, createdAt: now, updatedAt: now, archived: false }, 201);
}
catch (e) {
    return failure(e);
} }
