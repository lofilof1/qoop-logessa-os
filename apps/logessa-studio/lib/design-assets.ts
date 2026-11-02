"use client";
import {api,json} from './client';
import {type Design,emptyBody} from './domain';
export function validateMaster(file:File){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('En fazla 15 MB PNG, JPG veya WebP seç.');}
export async function uploadMaster(file:File,design:Design){
 validateMaster(file);
 const asset=await api(`/api/assets?designId=${design.id}`,{method:'POST',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)},body:file});
 return api<Design>(`/api/designs/${design.id}`,json({...design,stage:design.stage==='ready'?'review':design.stage,body:{...design.body,imageId:asset.id,widthPx:asset.width,heightPx:asset.height}},'PATCH'));
}
export async function createMasterDesign(file:File){validateMaster(file);const name=file.name.replace(/\.[^.]+$/,'').slice(0,110);return api<Design>('/api/designs',json({name:name.length>1?name:`Mockup ${name}`,kind:'pattern',stage:'design',body:{...emptyBody(),collection:'Mockup Atölyesi'}}));}
