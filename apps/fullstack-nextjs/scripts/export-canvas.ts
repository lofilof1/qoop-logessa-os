import { db } from "../src/lib/db";
import { s3,bucket } from "../src/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { writeFile } from "node:fs/promises";
const [designs,analyses,studioBriefs,personalOptions,generations]=await Promise.all([db.design.findMany({include:{assets:true,skus:true,sources:true,researchLinks:true}}),db.imageAnalysis.findMany(),db.studioBrief.findMany(),db.studioOption.findMany(),db.studioGeneration.findMany()]);
const files:{id:string;name:string;mime:string;base64:string}[]=[];
for(const design of designs)for(const a of design.assets){const file=await s3.send(new GetObjectCommand({Bucket:bucket(),Key:a.key}));files.push({id:a.id,name:a.name,mime:a.mime,base64:Buffer.from(await file.Body!.transformToByteArray()).toString("base64")});}
for(const a of analyses)for(const [id,key,name,mime]of [[a.id+':original',a.key,a.name,a.mime],[a.id+':preview',a.previewKey,'analysis-preview.png','image/png']]){const file=await s3.send(new GetObjectCommand({Bucket:bucket(),Key:key}));files.push({id,key,name,mime,base64:Buffer.from(await file.Body!.transformToByteArray()).toString("base64")} as any);}
const output={format:"qoop-local-export-v1",exportedAt:new Date().toISOString(),designs,analyses,studioBriefs,personalOptions,generations,files};
await writeFile(process.argv[2]||"../qoop-canvas/qoop-mevcut-kayitlar.json",JSON.stringify(output));
console.log(JSON.stringify({designs:designs.length,analyses:analyses.length,briefs:studioBriefs.length,personalOptions:personalOptions.length,generations:generations.length,files:files.length}));await db.$disconnect();
