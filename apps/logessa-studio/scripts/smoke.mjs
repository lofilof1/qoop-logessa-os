import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.SMOKE_URL||'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Smoke tests are local-only.');
const anon=await fetch(`${base}/api/designs`);assert.equal(anon.status,401,'anonymous requests rejected');
const login=await fetch(`${base}/signin-with-chatgpt?return_to=/`,{redirect:'manual'});
const cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie,'development sign-in returns session cookie');
const request=(path,body,method='POST',origin=base)=>fetch(base+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await request('/api/designs',{name:'QA',kind:'pattern',body:{}},'POST','https://untrusted.example')).status,403,'cross-origin writes rejected');
assert.equal((await request('/api/designs',{name:'QA',kind:'pattern',stage:'ready',body:{}})).status,422,'incomplete ready state rejected');
let design=await (await request('/api/designs',{name:`QA smoke ${Date.now()}`,kind:'pattern',body:{motif:'olive branches'}})).json();assert(design.id);
try{
 const png=await readFile(new URL('../public/studio-concept.png',import.meta.url));
 const upload=await fetch(base+`/api/assets?designId=${design.id}`,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'image/png','X-File-Name':'master.png'},body:png});const asset=await upload.json();assert.equal(upload.status,201,JSON.stringify(asset));assert(asset.width>1000);
 const original=await fetch(`${base}/api/assets/${asset.id}`,{headers:{Cookie:cookie}});assert(Buffer.from(await original.arrayBuffer()).equals(png),'original master bytes preserved');
 assert.equal((await fetch(`${base}/api/assets/${asset.id}`)).status,401,'asset requires identity');
 assert.equal((await fetch(base+`/api/assets?designId=${design.id}`,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'image/png'},body:'<svg/>'})).status,415,'forged file rejected');
 const changed={...design,body:{...design.body,imageId:asset.id,widthPx:99999,heightPx:99999}};
 const patch=await request(`/api/designs/${design.id}`,changed,'PATCH');assert.equal(patch.status,200);const updated=await patch.json();assert.equal(updated.body.widthPx,asset.width,'server controls master dimensions');
 assert.equal((await request(`/api/designs/${design.id}`,changed,'PATCH')).status,409,'stale version rejected');
 design={...design,...updated};
 const all=await (await fetch(base+'/api/designs',{headers:{Cookie:cookie}})).json();assert(all.some(d=>d.id===design.id),'saved design survives read');
 const missing=await request(`/api/designs/${design.id}`,{...design,body:{...design.body,imageId:'not-owned'}},'PATCH');assert.equal(missing.status,422,'unowned asset rejected');
 console.log('PASS: auth, origin checks, persistent CRUD, original upload bytes, header validation, authoritative dimensions, version conflicts, master ownership.');
}finally{
 const archived=await request(`/api/designs/${design.id}`,{...design,archived:true},'PATCH');assert.equal(archived.status,200,'test record archived');
 const a=await archived.json();assert.equal((await request(`/api/designs/${design.id}`,{...design,...a,archived:false},'PATCH')).status,200,'archive is reversible');
 await request(`/api/designs/${design.id}`,{...design,version:a.version+1,archived:true},'PATCH');
}
