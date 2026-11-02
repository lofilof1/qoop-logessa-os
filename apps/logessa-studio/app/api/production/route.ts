import {env} from "cloudflare:workers";
import {access,database,jsonBody,result,failure,HttpError} from "@/lib/server";
import {productionInput} from "@/lib/production-schema";
import {readJob} from "@/lib/production-service";
export async function GET(req:Request){try{const owner=await access(req),rows=await database().prepare("SELECT id FROM production_jobs WHERE owner=? ORDER BY created_at DESC LIMIT 15").bind(owner).all<{id:string}>();return result(await Promise.all(rows.results.map(r=>readJob(owner,r.id))));}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 const owner=await access(req,true),input=productionInput.parse(await jsonBody(req));
 const existing=await database().prepare("SELECT id FROM production_jobs WHERE owner=? AND request_id=?").bind(owner,input.requestId).first<{id:string}>();if(existing)return result(await readJob(owner,existing.id));
 if(input.mode==="ai"&&!env.OPENAI_API_KEY)return result({error:"Bu Alura anahtarı pazar araştırmasına erişiyor. Özgün AI metni ve görseli üretmek için ayrıca AI bağlantısı gerekir. Alura ile pazar taslağı modunu kullanabilirsin.",code:"ai_not_configured"},503);
 if(input.mode==="market"&&input.withImage)throw new HttpError(400,"Alura pazar taslağı modunda özgün görsel üretimi bulunmuyor.");
 if(!env.ALURA_API_KEY)throw new HttpError(503,"Alura bağlantısı eksik.");
 const active=await database().prepare("SELECT id FROM production_jobs WHERE owner=? AND status IN ('queued','idle','running') LIMIT 1").bind(owner).first();if(active)throw new HttpError(409,"Devam eden üretimin var. Önce onu aç veya tamamla.");
 const id=crypto.randomUUID(),now=new Date().toISOString();
 await database().prepare("INSERT INTO production_jobs (id,owner,request_id,input,output,status,step,lease_until,created_at,updated_at) VALUES (?,?,?,?,'{}','queued','plan',0,?,?)").bind(id,owner,input.requestId,JSON.stringify(input),now,now).run();return result(await readJob(owner,id),201);
 }catch(e){return failure(e);}}
