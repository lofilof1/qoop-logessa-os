import {z} from "zod";
import {access,jsonBody,result,failure,database,HttpError} from "@/lib/server";
import {discoverMarket,resolveSeed} from "@/lib/alura-provider";
const input=z.object({idea:z.string().trim().min(1).max(150),kind:z.enum(["pattern","mural","art"]).default("pattern"),includeProducts:z.boolean().default(true)});
export async function POST(req:Request){try{const owner=await access(req,true),d=input.parse(await jsonBody(req)),window=`analytics:${new Date().toISOString().slice(0,16)}`;
 const count=await database().prepare("INSERT INTO rate_limits (owner,window,count) VALUES (?,?,1) ON CONFLICT(owner,window) DO UPDATE SET count=count+1 WHERE count<3 RETURNING count").bind(owner,window).first();if(!count)throw new HttpError(429,"Bir dakika içinde en fazla üç yeni keşif yapabilirsin.");
 return result(await discoverMarket(owner,[resolveSeed(d.idea,d.kind)],d.includeProducts));}catch(e){return failure(e);}}
