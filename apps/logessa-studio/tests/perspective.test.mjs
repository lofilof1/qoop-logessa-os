import test from 'node:test';import assert from 'node:assert/strict';
import {homography,project,unitQuad,validQuad,physicalSample,wallEnvelope} from '../lib/perspective.ts';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
test('perspective transform maps four corners and its inverse returns the physical plane',()=>{
 const q=[[120,55],[1020,100],[1150,780],[50,900]],h=homography(unitQuad,q),inv=homography(q,unitQuad);assert(h&&inv);assert(validQuad(q));
 unitQuad.forEach(([x,y],i)=>{const p=project(h,x,y);near(p[0],q[i][0]);near(p[1],q[i][1]);});
 const screen=project(h,.37,.64),uv=project(inv,...screen);near(uv[0],.37);near(uv[1],.64);
});
test('one physical repeat preserves source aspect ratio and exact centimetre scale',()=>{
 const tileW=58.42,sourceW=2000,sourceH=1000,tileH=29.21;
 const first=physicalSample(0,0,400,300,tileW,sourceW,sourceH),next=physicalSample(tileW/400,tileH/300,400,300,tileW,sourceW,sourceH);
 near(first[0],0);near(first[1],0);near(next[0],1);near(next[1],1);
 const offset=physicalSample(0,0,400,300,tileW,sourceW,sourceH,58.42,29.21);near(offset[0],-1);near(offset[1],-1);
});
test('degenerate and self-intersecting wall planes are rejected',()=>{assert.equal(homography([[0,0],[0,0],[0,0],[0,0]],unitQuad),null);assert.equal(validQuad([[0,0],[1,1],[1,0],[0,1]]),false);});

test('automatic wall envelope retains exposed green below occluding furniture',()=>{const top=[[10,20],[30,20],[50,20],[70,20],[90,20]],bottom=[[10,80],[30,55],[50,50],[70,55],[90,80]],q=wallEnvelope(top,bottom,100,100),inv=homography(q.map(([x,y])=>[x*100,y*100]),unitQuad);assert(validQuad(q));for(const p of [...top,...bottom]){const [u,v]=project(inv,...p);assert(u>=0&&u<=1&&v>=0&&v<=1,'all observed wall pixels fit within automatic boundary');}});
