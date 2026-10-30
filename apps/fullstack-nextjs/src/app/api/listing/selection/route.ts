import { db } from '@/lib/db';
import { localMutation } from '@/lib/image-connection';
import { z } from 'zod';
const selection = z.object({ids:z.array(z.string().min(1)).min(1).max(100),restore:z.boolean().default(false)});
export async function POST(r:Request) {
  try {
    localMutation(r);
    const {ids,restore}=selection.parse(await r.json());
    const result=await db.listingDraft.updateMany({where:{id:{in:ids}},data:{deletedAt:restore?null:new Date()}});
    return Response.json({count:result.count});
  } catch {return Response.json({error:'Seçim kaydedilemedi. Sayfayı yenileyip tekrar dene.'},{status:400});}
}
