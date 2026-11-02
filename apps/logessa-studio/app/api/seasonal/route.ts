import {z} from 'zod';
import {access,database,jsonBody,result,failure,HttpError} from '@/lib/server';
import {aluraRead} from '@/lib/alura-provider';
import {keywordMetric} from '@/lib/market-analysis';
const schema=z.object({keywords:z.array(z.string().trim().min(2).max(100)).min(1).max(3)});
const pending=new Map<string,Promise<unknown>>();
export async function POST(req:Request){try{
 const owner=await access(req,true),input=schema.parse(await jsonBody(req));
 const terms=[...new Set(input.keywords.map(k=>k.toLowerCase()))].sort(),key=JSON.stringify([owner,terms]);
 if(pending.has(key))return result(await pending.get(key));
 const task=(async()=>{
  const db=database(),window=`seasonal:${new Date().toISOString().slice(0,16)}`;
  const count=await db.prepare("INSERT INTO rate_limits (owner,window,count) VALUES (?,?,1) ON CONFLICT(owner,window) DO UPDATE SET count=count+1 WHERE count<3 RETURNING count").bind(owner,window).first();
  if(!count)throw new HttpError(429,'Bir dakikada en fazla üç sezon ölçümü. Biraz sonra tekrar dene.');
  const query=new URLSearchParams({language:'en'});terms.forEach(k=>query.append('q',k));
  const source=await aluraRead(owner,'research/keywords',query),data=(source.raw.data||[]).map(keywordMetric);
  const payload={data,pending:source.raw.pending||[],unfetched:source.raw.unfetched||[],cost:source.cost,remaining:source.remaining,cached:source.cached,fetchedAt:source.fetchedAt};
  if(data.length)await db.prepare("INSERT INTO research (id,owner,kind,query,body,fetched_at) VALUES (?,?,'seasonal',?,?,?)").bind(crypto.randomUUID(),owner,terms.join(' | '),JSON.stringify(payload),source.fetchedAt).run();
  return payload;
 })();pending.set(key,task);try{return result(await task);}finally{pending.delete(key);}
 }catch(e){return failure(e);}}
