import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function archiveRelative(code:string,sha256:string,format:string){
 if(!/^[A-Z0-9][A-Z0-9-]{2,59}$/.test(code)||! /^[a-f0-9]{64}$/.test(sha256)||!['png','tiff','psd'].includes(format))throw Error('Arşiv dosya kimliği geçersiz.');
 return `${code}/${code}-${sha256}.${format}`;
}
export async function archiveDesign(code:string,sha256:string,format:string,body:Buffer){
 if(createHash('sha256').update(body).digest('hex')!==sha256)throw Error('Arşiv dosyası doğrulanamadı.');
 const relative=archiveRelative(code,sha256,format),root=process.env.QOOP_DESIGNS_DIR||path.resolve('tasarimlar');
 const target=path.join(root,relative);await mkdir(path.dirname(target),{recursive:true});
 try{await writeFile(target,body,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const existing=await readFile(target);if(!existing.equals(body))throw Error('Arşivdeki dosya farklı; üzerine yazılmadı.');}
 return relative;
}
