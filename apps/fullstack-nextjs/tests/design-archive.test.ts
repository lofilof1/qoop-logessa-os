import {it,expect} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {archiveDesign,archiveRelative} from '../src/lib/design-archive';
it('rejects traversal and unsupported formats',()=>{expect(()=>archiveRelative('../escape','a'.repeat(64),'png')).toThrow();expect(()=>archiveRelative('MZ-0001-D','a'.repeat(64),'svg')).toThrow();});
it('stores exact bytes idempotently and preserves versions',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'qoop-archive-'));const prior=process.env.QOOP_DESIGNS_DIR;process.env.QOOP_DESIGNS_DIR=dir;try{const a=Buffer.from('first'),b=Buffer.from('second');const hash=(v:Buffer)=>createHash('sha256').update(v).digest('hex');const name=await archiveDesign('MZ-0001-D',hash(a),'png',a);expect(await archiveDesign('MZ-0001-D',hash(a),'png',a)).toBe(name);const other=await archiveDesign('MZ-0001-D',hash(b),'png',b);expect(other).not.toBe(name);expect(await readFile(path.join(dir,name))).toEqual(a);await expect(archiveDesign('MZ-0001-D',hash(a),'png',b)).rejects.toThrow();}finally{if(prior===undefined)delete process.env.QOOP_DESIGNS_DIR;else process.env.QOOP_DESIGNS_DIR=prior;await rm(dir,{recursive:true,force:true});}});
