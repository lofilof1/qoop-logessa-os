import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root:root+'demo',publicDir:root+'public',plugins:[react()],resolve:{alias:{'@':root}},build:{outDir:root+'dist-demo',emptyOutDir:true,rollupOptions:{input:{index:root+'demo/index.html','demo-worker':root+'demo/worker.ts'},output:{entryFileNames:c=>c.name==='demo-worker'?'demo-worker.js':'assets/[name]-[hash].js'}}}});
