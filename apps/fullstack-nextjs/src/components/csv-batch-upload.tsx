'use client';
import {useState} from 'react';
type Item={name:string;kind?:string;rows?:number;revisions?:number;invalid?:number;reused?:boolean;error?:string;saved?:boolean};
export function CsvBatchUpload({onSaved}:{onSaved:()=>Promise<void>}){
 const[files,setFiles]=useState<File[]>([]),[items,setItems]=useState<Item[]>([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[accept,setAccept]=useState(false);
 async function run(mode:'preview'|'commit'){
 setBusy(true);const output:Item[]=[];
 try{for(const[i,file]of files.entries()){
 const prior=items[i];if(mode==='commit'&&prior?.error){output.push(prior);continue;}
 setProgress(`${i+1}/${files.length} · ${file.name}`);
 try{const form=new FormData();form.append('files',file);form.set('mode',mode);form.set('acceptRevisions',String(accept));
 const r=await fetch('/api/listing/csv-upload',{method:'POST',body:form});const x=await r.json();if(!r.ok)throw Error(x.error||'CSV alınamadı.');
 const f=x.files[0];const invalid=f.stats?.invalid||0;
 output.push({name:file.name,kind:x.kind,rows:f.stats?.total??f.rows,revisions:f.stats?.revisions||0,invalid,reused:f.reused,saved:mode==='commit',...(invalid?{error:`${invalid} hatalı satır; gelişmiş yükleme alanında kontrol et.`}:{})});
 }catch(e){output.push({name:file.name,error:e instanceof Error?e.message:'CSV alınamadı.'});}
 setItems([...output]);
 }
 if(mode==='commit'){setProgress(`${output.filter(i=>i.saved).length} dosya kayıtlı veya önceden aktarılmış. ${output.filter(i=>i.error).length} dosya kontrol bekliyor.`);await onSaved();}
 else setProgress('Önizleme hazır. Türler dosya içeriğinden belirlendi; ülke ve dönem bilinmiyor olarak korunur.');
 }finally{setBusy(false);}
 }
 return <section><h3>CSV dosyalarını birlikte yükle</h3><p>Kelime ve Top Listings dosyalarını birlikte seçebilirsin. En fazla 100 dosya sırayla işlenir; dosya başına 2 MB. Tarih ve pazar bilgilerini doğrulamak için gelişmiş alanı kullan.</p><input aria-label="Toplu eRank CSV dosyaları" type="file" multiple accept=".csv,text/csv" disabled={busy} onChange={e=>{const f=Array.from(e.target.files||[]);setItems([]);setAccept(false);if(f.length>100){setFiles([]);setProgress('Bir seferde en fazla 100 dosya seç.');return;}setFiles(f);setProgress('');}}/><div className="actions"><button type="button" disabled={busy||!files.length} onClick={()=>run('preview')}>Dosyaları önizle</button>{items.length===files.length&&items.length>0&&<button type="button" disabled={busy||items.every(i=>i.error||i.saved)||(!accept&&items.some(i=>i.revisions))} onClick={()=>run('commit')}>Geçerli dosyaları kaydet</button>}</div>{items.some(i=>i.revisions)&&<label><input type="checkbox" disabled={busy} checked={accept} onChange={e=>setAccept(e.target.checked)}/>Aynı ölçümde farklı değerleri önceki kayıtları koruyarak yeni sürüm olarak ekle.</label>}<p role="status">{progress}</p>{items.length>0&&<details><summary>Dosya sonuçları · {items.length}</summary>{items.map((i,n)=><p key={n}>{i.name} · {i.error||`${i.kind==='listing'?'İlan':'Kelime'} · ${i.rows} satır${i.saved?' · kayıtlı':''}${i.reused?' · tekrar aktarılmadı':''}`}</p>)}</details>}</section>;
}
