import {db} from './db';
import {automaticVariantName,genericVariantLabels} from './variant-name';
export async function ensureVariantName(design:{id:string;code:string;title:string}){
 const source=await db.source.findFirst({where:{designId:design.id,deletedAt:null},orderBy:[{createdAt:'asc'},{id:'asc'}]});
 if(!source)return '';
 const label=automaticVariantName(design.title,source);
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71405234)`;
  const sku=await tx.sku.findFirst({where:{designId:design.id,code:design.code}});
  if(!sku){if(!await tx.sku.findFirst({where:{designId:design.id}}))await tx.sku.create({data:{designId:design.id,code:design.code,label}});}
  else if(genericVariantLabels.includes(sku.label))await tx.sku.update({where:{id:sku.id},data:{label}});
 });
 return label;
}
