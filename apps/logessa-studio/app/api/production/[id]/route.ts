import {access,database,jsonBody,result,failure} from "@/lib/server";
import {readJob,advanceProduction} from "@/lib/production-service";
import {z} from "zod";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{const owner=await access(req),{id}=await params;return result(await readJob(owner,id));}catch(e){return failure(e);}}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{const owner=await access(req,true),{id}=await params,{action}=z.object({action:z.enum(["advance","retry","cancel"])}).parse(await jsonBody(req));
 if(action==="retry"){await database().prepare("UPDATE production_jobs SET status='idle',error=NULL,started_step=NULL,lease_until=0,lease_token=NULL WHERE id=? AND owner=? AND status IN ('failed','uncertain')").bind(id,owner).run();return result(await readJob(owner,id));}
 if(action==="cancel"){await database().prepare("UPDATE production_jobs SET status='failed',error='Üretim kullanıcı tarafından durduruldu.' WHERE id=? AND owner=? AND status IN ('idle','queued')").bind(id,owner).run();return result(await readJob(owner,id));}
 return result(await advanceProduction(owner,id));}catch(e){return failure(e);}}
