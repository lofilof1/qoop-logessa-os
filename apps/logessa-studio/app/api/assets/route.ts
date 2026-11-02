import { env } from "cloudflare:workers";
import { access, database, failure, result, HttpError } from "@/lib/server";
import { imageMetadata } from "@/lib/image-metadata";
export async function POST(req: Request) {
    try {
        const owner = await access(req, true);
        if (!env.BUCKET)
            throw new HttpError(503, "Dosya deposu hazır değil.");
        const designId = new URL(req.url).searchParams.get("designId") || "";
        if (!await database().prepare("SELECT id FROM designs WHERE id=? AND owner=? AND archived=0").bind(designId, owner).first())
            throw new HttpError(404, "Tasarım bulunamadı.");
        if (Number(req.headers.get("content-length")) > 15 * 1024 * 1024)
            throw new HttpError(413, "En fazla 15 MB görsel yükleyebilirsin.");
        let name = "master";
        try {
            name = decodeURIComponent(req.headers.get("X-File-Name") || "master").slice(0, 200);
        }
        catch {
            throw new HttpError(400, "Dosya adı okunamadı.");
        }
        // Raw streamed upload avoids multipart/Server Action buffering and caps unknown-length requests too.
        const reader = req.body?.getReader();
        if (!reader)
            throw new HttpError(400, "Dosya bulunamadı.");
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > 15 * 1024 * 1024) {
                await reader.cancel();
                throw new HttpError(413, "En fazla 15 MB görsel yükleyebilirsin.");
            }
            chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        chunks.length = 0;
        const meta = imageMetadata(bytes.buffer);
        if (!meta)
            throw new HttpError(415, "Görsel başlığı okunamadı. Geçerli PNG, JPEG veya WebP yükle; en fazla 100 megapiksel.");
        const { mime, width, height } = meta, id = crypto.randomUUID(), key = `${owner}/${designId}/${id}`;
        await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
        try {
            await database().prepare("INSERT INTO assets (id,owner,design_id,object_key,name,mime,size,width,height,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, owner, designId, key, name, mime, size, width, height, new Date().toISOString()).run();
        }
        catch (e) {
            await env.BUCKET.delete(key);
            throw e;
        }
        return result({ id, name, size, mime, width, height }, 201);
    }
    catch (e) {
        return failure(e);
    }
}
