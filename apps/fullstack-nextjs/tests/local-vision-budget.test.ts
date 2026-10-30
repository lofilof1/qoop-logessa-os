import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {runLocalVision} from '../scripts/local-vision';
async function fixture(reply:unknown,check:(body:any)=>void){const dir=await mkdtemp(join(tmpdir(),'qoop-review-'));const prior=[process.env.QOOP_RUNTIME_DIR,process.env.OLLAMA_ENDPOINT];let calls=0;
 const server=createServer((req,res)=>{calls++;let body='';req.on('data',b=>body+=b);req.on('end',()=>{check(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(reply));});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};process.env.QOOP_RUNTIME_DIR=dir;process.env.OLLAMA_ENDPOINT=`http://127.0.0.1:${address.port}`;
 return{calls:()=>calls,async close(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));for(const [i,key]of ['QOOP_RUNTIME_DIR','OLLAMA_ENDPOINT'].entries()){if(prior[i]===undefined)delete process.env[key];else process.env[key]=prior[i];}await rm(dir,{recursive:true,force:true});}};
}
it('uses a larger review allowance and reuses the validated HTTP response',async()=>{let budget=0;const f=await fixture({done:true,done_reason:'stop',message:{content:'{"ok":true}'},eval_count:3200},b=>{budget=b.options.num_predict;});try{await runLocalVision(null,'review','budget',{},JSON.parse,{outputTokens:6000,contextTokens:16384});expect(budget).toBeGreaterThan(3000);const reused=await runLocalVision(null,'review','budget',{},JSON.parse,{outputTokens:6000,contextTokens:16384});expect(reused.cached).toBe(true);expect(f.calls()).toBe(1);}finally{await f.close();}});
it('rejects an unfinished report without retry or provider fallback',async()=>{const f=await fixture({done:true,done_reason:'length',message:{content:'{"ok":'}},()=>{});try{await expect(runLocalVision(null,'review','unfinished',{},JSON.parse)).rejects.toThrow('tamamlanamadı');expect(f.calls()).toBe(1);}finally{await f.close();}});
