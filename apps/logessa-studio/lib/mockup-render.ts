import type {MockupSettings} from "./domain";
import {homography,project,unitQuad,validQuad,wallEnvelope,type Point} from "./perspective";

export async function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Görsel yüklenemedi."));img.src=src;});}
export function detectWall(scene:HTMLImageElement):Point[]{
 const c=document.createElement("canvas");c.width=scene.width;c.height=scene.height;const ctx=c.getContext("2d")!;ctx.drawImage(scene,0,0);const{data}=ctx.getImageData(0,0,c.width,c.height);
 const top:Point[]=[],bottom:Point[]=[];const green=(x:number,y:number)=>{const i=(y*c.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];return g>65&&g>r*1.4&&g>b*1.4;};
 for(let x=0;x<c.width;x+=4){let first=-1,last=-1;for(let y=0;y<c.height;y+=2)if(green(x,y)){if(first<0)first=y;last=y;}if(first>=0&&last-first>c.height*.15){top.push([x,first]);bottom.push([x,last]);}}
 return wallEnvelope(top,bottom,c.width,c.height);
}

export function renderMockup(canvas:HTMLCanvasElement,scene:HTMLImageElement,master:HTMLImageElement,s:MockupSettings,kind:string,calibration=false,drawGuides=s.guides){
 if(!validQuad(s.corners))throw new Error("Duvar köşeleri kesişiyor veya çok yakın. Sol üst → sağ üst → sağ alt → sol alt sırasıyla seç.");
 const q=s.corners.map(([x,y])=>[x*scene.width,y*scene.height] as Point),inverse=homography(q,unitQuad),forward=homography(unitQuad,q);if(!inverse||!forward)throw new Error("Duvar perspektifi hesaplanamadı.");
 canvas.width=scene.width;canvas.height=scene.height;const ctx=canvas.getContext("2d",{willReadFrequently:true})!;ctx.drawImage(scene,0,0);
 if(!calibration){
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),source=document.createElement("canvas"),max=3072;
  const scale=Math.min(1,max/Math.max(master.width,master.height));source.width=Math.max(1,Math.round(master.width*scale));source.height=Math.max(1,Math.round(master.height*scale));const sc=source.getContext("2d",{willReadFrequently:true})!;sc.drawImage(master,0,0,source.width,source.height);const art=sc.getImageData(0,0,source.width,source.height).data;
  const tileHeight=s.repeatWidthCm*master.height/master.width,sw=source.width,sh=source.height,wrap=(n:number)=>((n%1)+1)%1;
  const minX=Math.max(0,Math.floor(Math.min(...q.map(p=>p[0])))),maxX=Math.min(canvas.width-1,Math.ceil(Math.max(...q.map(p=>p[0]))));
  const minY=Math.max(0,Math.floor(Math.min(...q.map(p=>p[1])))),maxY=Math.min(canvas.height-1,Math.ceil(Math.max(...q.map(p=>p[1]))));
  // Inverse projection samples the source, never stretches its physical X/Y scale independently.
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=(y*canvas.width+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
   if(g<65||g<r*1.28||g<b*1.28)continue;
   const[u,v]=project(inverse,x+.5,y+.5);if(u<0||u>1||v<0||v>1)continue;
   let tx=(u*s.wallWidthCm-s.offsetX)/s.repeatWidthCm,ty=(v*s.wallHeightCm-s.offsetY)/tileHeight;
   if(kind!=="pattern"&&(tx<0||tx>=1||ty<0||ty>=1)){pixels.data[i]=242;pixels.data[i+1]=239;pixels.data[i+2]=231;continue;}
   tx=wrap(tx)*sw-.5;ty=wrap(ty)*sh-.5;
   const x0=Math.floor(tx),y0=Math.floor(ty),fx=tx-x0,fy=ty-y0;
   const sample=(xx:number,yy:number,c:number)=>art[((((yy%sh)+sh)%sh)*sw+((xx%sw)+sw)%sw)*4+c];
   const at=(c:number)=>(sample(x0,y0,c)*(1-fx)+sample(x0+1,y0,c)*fx)*(1-fy)+(sample(x0,y0+1,c)*(1-fx)+sample(x0+1,y0+1,c)*fx)*fy;
   const alpha=at(3)/255,shade=s.lighting==="shadows"?Math.max(.45,Math.min(1.15,g/190)):1;
   for(let c=0;c<3;c++)pixels.data[i+c]=(at(c)*alpha+[242,239,231][c]*(1-alpha))*shade;
  }
  ctx.putImageData(pixels,0,0);
 }
 if(calibration||drawGuides){
  ctx.lineWidth=Math.max(2,canvas.width/650);ctx.strokeStyle="#f5f5e4";ctx.setLineDash([9,7]);ctx.beginPath();q.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
  if(drawGuides&&!calibration){for(let cm=s.panelWidthCm;cm<s.wallWidthCm;cm+=s.panelWidthCm){const a=project(forward,cm/s.wallWidthCm,0),b=project(forward,cm/s.wallWidthCm,1);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
  ctx.setLineDash([]);if(calibration)q.forEach(([x,y],i)=>{ctx.fillStyle="#435f3a";ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fill();ctx.fillStyle="white";ctx.font="bold 17px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(i+1),x,y);});
 }
 return {tileHeightCm:s.repeatWidthCm*master.height/master.width,sourceWidth:master.width,sourceHeight:master.height,outputWidth:canvas.width,outputHeight:canvas.height};
}
