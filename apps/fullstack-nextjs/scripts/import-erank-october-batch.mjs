import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
const root='/Users/USER/Desktop/erank/23 ekim';
const results=[];
for(const name of (await readdir(root)).filter(n=>n.endsWith('.csv')).sort()){
 const listing=/ - Top Listings(?: \(\d+\))?\.csv$/i.test(name);
 const query=name.replace(/^eRank - Keyword Tool - /i,'').replace(/ - Top Listings(?: \(\d+\))?\.csv$/i,'').replace(/\.csv$/i,'');
 const settings=listing?{query,market:'unknown',observedAt:'',currency:'unknown'}:{market:'unknown',source:'erank-keyword',definition:'unknown',period:'',observedAt:'',numberFormat:'en'};
 const form=new FormData();form.append('files',new File([await readFile(`${root}/${name}`)],name,{type:'text/csv'}));form.set('settings',JSON.stringify([settings]));form.set('mode','preview');
 const url=`http://localhost:3000/api/listing/${listing?'top-listings':'csv'}`;
 const p=await fetch(url,{method:'POST',headers:{origin:'http://localhost:3000'},body:form});const preview=await p.json();
 if(!p.ok||preview.files?.[0]?.stats?.invalid){results.push({name,error:preview});console.log(JSON.stringify({name,error:preview}));continue;}
 form.set('mode','commit');form.set('acceptRevisions','true');
 const r=await fetch(url,{method:'POST',headers:{origin:'http://localhost:3000'},body:form});const result=await r.json();results.push({name,kind:listing?'listing':'keyword',ok:r.ok,result});console.log(JSON.stringify({name,ok:r.ok,result}));
}
await mkdir('data/import-audits',{recursive:true});await writeFile('data/import-audits/erank-2026-10-25.json',JSON.stringify({source:root,metadata:'Market, measurement period and observation date unknown; folder name is not proof',results},null,2));
console.log(JSON.stringify({files:results.length,failed:results.filter(x=>!x.ok).length}));
