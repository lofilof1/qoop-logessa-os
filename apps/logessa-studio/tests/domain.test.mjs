import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyBody,printCheck,listingIssues,readiness,buildPrompt,profit,csvCell,designInput} from '../lib/domain.ts';
import {imageMetadata} from '../lib/image-metadata.ts';

test('physical size, minimum axis DPI and aspect ratio govern print readiness',()=>{
 const b={...emptyBody(),widthPx:6000,heightPx:3000,widthCm:101.6,heightCm:50.8};
 assert.equal(printCheck(b).dpi,150);assert.equal(printCheck(b).resolution,true);assert.equal(printCheck(b).aspect,true);
 assert.equal(printCheck({...b,heightCm:100}).resolution,false);assert.equal(printCheck({...b,heightCm:100}).aspect,false);
 assert.equal(printCheck(emptyBody()).dpi,null);
});
test('incomplete, duplicated and non-English listing content cannot pass',()=>{
 const b={...emptyBody(),title:'Botanical Wallpaper',description:'Delicate olive branches for a quiet interior.',tags:Array.from({length:13},(_,i)=>`botanical ${i}`)};
 assert.deepEqual(listingIssues(b),[]);
 assert(listingIssues({...b,tags:Array(13).fill('same tag')}).some(i=>i.includes('Tekrarlanan')));
 assert(listingIssues({...b,title:'Yeşil duvar kağıdı'}).some(i=>i.includes('Türkçe')));
 assert(listingIssues({...b,title:'Non-toxic hand-drawn wallpaper'}).some(i=>i.includes('iddiasını')));
 assert(listingIssues({...b,tags:[...b.tags.slice(0,12),'a'.repeat(21)]}).some(i=>i.includes('1–20')));
 assert(listingIssues({...b,title:'a'.repeat(141)}).some(i=>i.includes('140')));
});
test('a complete listing still needs a master, rights, seams, proof and manufacturer checks',()=>{
 const b={...emptyBody(),title:'Botanical Wallpaper',description:'Delicate olive branches for a quiet interior.',tags:Array.from({length:13},(_,i)=>`botanical ${i}`),widthPx:6000,heightPx:6000,widthCm:100,heightCm:100};
 assert.equal(readiness({kind:'pattern',body:b}).length,5);
 assert.deepEqual(readiness({kind:'pattern',body:{...b,imageId:'asset',checks:{rights:true,seams:true,proof:true,manufacturer:true}}}),[]);
});
test('invalid inputs are rejected and prompts distinguish tiles from mural compositions',()=>{
 assert.equal(designInput.safeParse({name:'x',kind:'invalid',body:{}}).success,false);
 assert.equal(designInput.safeParse({name:'Garden',kind:'pattern',body:{widthPx:-1}}).success,false);
 assert.match(buildPrompt(emptyBody(),'pattern'),/--tile --ar 1:1/);
 assert.doesNotMatch(buildPrompt(emptyBody(),'mural'),/--tile/);
});
test('unit economics and exported CSV preserve numbers and prevent spreadsheet formula execution',()=>{
 const r=profit(60,20,8,10,.2);assert.equal(r.net,25.8);assert.equal(profit(0,20,8,10,.2).margin,0);
 assert.equal(csvCell('=SUM(A1)'),`"'=SUM(A1)"`);assert.equal(csvCell('a,"b"'),`"a,""b"""`);assert.equal(csvCell(null),'""');
});
test('server reads image dimensions from bytes and rejects forged/huge headers',async()=>{
 const file=await readFile(new URL('../public/studio-concept.png',import.meta.url));const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
 const m=imageMetadata(buffer);assert(m);assert.equal(m.mime,'image/png');assert(m.width>1000&&m.height>500);
 assert.equal(imageMetadata(new TextEncoder().encode('<svg/>').buffer),null);
 const bad=buffer.slice(0,24);new DataView(bad).setUint32(16,100001);assert.equal(imageMetadata(bad),null);
});
