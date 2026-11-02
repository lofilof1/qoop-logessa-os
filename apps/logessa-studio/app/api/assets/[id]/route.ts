import { env } from "cloudflare:workers";
import { access, database, failure, HttpError } from "@/lib/server";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    const owner = await access(req), { id } = await params, asset = await database().prepare("SELECT * FROM assets WHERE id=? AND owner=?").bind(id, owner).first<{
        object_key: string;
        mime: string;
        name: string;
    }>();
    if (!asset)
        throw new HttpError(404, "Dosya bulunamadı.");
    const object = await env.BUCKET?.get(asset.object_key);
    if (!object)
        throw new HttpError(404, "Dosya depoda bulunamadı.");
    const headers: Record<string, string> = { "Content-Type": asset.mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" };
    if (new URL(req.url).searchParams.has("download"))
        headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`;
    return new Response(object.body, { headers });
}
catch (e) {
    return failure(e);
} }
