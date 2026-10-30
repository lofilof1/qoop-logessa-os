import {db} from "@/lib/db";
import {profileSchema,blankProfile,profileWarnings} from "@/lib/product-profile";
import {localMutation} from "@/lib/image-connection";
import {hash} from "@/lib/csv-research";
export async function GET(){const record=await db.qoopProductProfile.findFirst({orderBy:[{createdAt:"desc"},{id:"desc"}]});const data=record?profileSchema.parse(record.data):blankProfile();return Response.json({id:record?.id||null,data,warnings:profileWarnings(data)},{headers:{"Cache-Control":"no-store"}});}
export async function POST(r:Request){try{localMutation(r);const text=await r.text();if(text.length>16000)throw Error("Profil çok büyük.");const data=profileSchema.parse(JSON.parse(text)),fingerprint=hash(data);await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(71405233)`;const latest=await tx.qoopProductProfile.findFirst({orderBy:[{createdAt:"desc"},{id:"desc"}]});if(latest && hash(latest.data)===fingerprint)return; // Preserve revisions even when reverting to an older configuration.
await tx.qoopProductProfile.create({data:{fingerprint:hash({data,previous:latest?.id||null}),data}});});return GET();}catch(e){return Response.json({error:e instanceof Error?e.message:"Profil kaydedilemedi."},{status:400});}}
