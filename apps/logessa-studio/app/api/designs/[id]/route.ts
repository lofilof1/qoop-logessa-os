import { access, database, failure, result, jsonBody, HttpError } from "@/lib/server";
import { designInput, readiness } from "@/lib/domain";
import {bodySchema} from "@/lib/domain";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{const owner=await access(req),{id}=await params,row=await database().prepare("SELECT * FROM designs WHERE id=? AND owner=?").bind(id,owner).first<any>();if(!row)throw new HttpError(404,"Tasarım bulunamadı.");return result({id:row.id,name:row.name,kind:row.kind,stage:row.stage,body:bodySchema.parse(JSON.parse(row.body)),version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,archived:!!row.archived});}catch(e){return failure(e);}}
export async function PATCH(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const owner = await access(req, true), { id } = await params, d = designInput.parse(await jsonBody(req));
        if (!d.version)
            throw new HttpError(400, "Kayıt sürümü eksik.");
        if (d.body.imageId) {
            const a = await database().prepare("SELECT width,height FROM assets WHERE id=? AND owner=? AND design_id=?").bind(d.body.imageId, owner, id).first<{
                width: number;
                height: number;
            }>();
            if (!a)
                throw new HttpError(422, "Master dosyası bu tasarıma ait değil.");
            d.body.widthPx = a.width;
            d.body.heightPx = a.height;
        }
        if (d.stage === "ready" && readiness(d).length)
            throw new HttpError(422, "İlana hazır durumuna geçmeden önce baskı ve ilan kontrollerini tamamla.");
        const now = new Date().toISOString(), r = await database().prepare("UPDATE designs SET name=?,kind=?,stage=?,body=?,archived=?,version=version+1,updated_at=? WHERE id=? AND owner=? AND version=?").bind(d.name, d.kind, d.stage, JSON.stringify(d.body), d.archived ? 1 : 0, now, id, owner, d.version).run();
        if (!r.meta.changes)
            throw new HttpError(409, "Kayıt başka bir sekmede değişti veya bulunamadı. Listeyi yenileyip tekrar aç.");
        return result({ ...d, id, version: d.version + 1, updatedAt: now });
    }
    catch (e) {
        return failure(e);
    }
}
