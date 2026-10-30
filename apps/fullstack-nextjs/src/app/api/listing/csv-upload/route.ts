import {localMutation} from '@/lib/image-connection';
import {classifyResearchCsv,researchQuery} from '@/lib/csv-upload';
import {POST as keywordPost} from '../csv/route';
import {POST as listingPost} from '../top-listings/route';
export const runtime='nodejs';
export async function POST(r:Request){try{
 localMutation(r);
 const reader=r.body?.getReader();if(!reader)throw Error('Dosya seç.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>3*1024*1024){await reader.cancel();throw Error('Dosya başına en fazla 2 MB.');}chunks.push(x.value);}
 const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':r.headers.get('content-type')||''}}).formData();
 const files=form.getAll('files');const file=files[0];
 if(files.length!==1||!(file instanceof File)||!file.size||file.size>2*1024*1024)throw Error('Her istekte bir CSV, dosya başına en fazla 2 MB.');
 const kind=classifyResearchCsv(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));
 const mode=String(form.get('mode')||'preview');if(!['preview','commit'].includes(mode))throw Error('Geçersiz işlem.');
 const forwarded=new FormData();forwarded.append('files',file);forwarded.set('mode',mode);
 forwarded.set('settings',JSON.stringify([kind==='listing'?{query:researchQuery(file.name),market:'unknown',observedAt:'',currency:'unknown'}:{market:'unknown',source:'erank-keyword',definition:'unknown',period:'',observedAt:'',numberFormat:'en'}]));
 forwarded.set('acceptRevisions',String(form.get('acceptRevisions')==='true'));
 const request=new Request(r.url,{method:'POST',headers:{origin:r.headers.get('origin')||'',host:r.headers.get('host')||''},body:forwarded});
 const result=await(kind==='listing'?listingPost(request):keywordPost(request));
 return Response.json({kind,...await result.json()},{status:result.status});
}catch(e){return Response.json({error:e instanceof Error?e.message:'CSV okunamadı.'},{status:400});}}
