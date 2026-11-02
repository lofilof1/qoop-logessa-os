export type Point=[number,number];
export type Matrix=[number,number,number,number,number,number,number,number];
// Eight-equation projective transform; a single flat wall preserves physical ratios.
export function homography(from:Point[],to:Point[]):Matrix|null{
 if(from.length!==4||to.length!==4)return null;const a:number[][]=[];
 for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);}
 for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-10)return null;[a[c],a[p]]=[a[p],a[c]];const div=a[c][c];for(let k=c;k<9;k++)a[c][k]/=div;for(let r=0;r<8;r++)if(r!==c){const factor=a[r][c];for(let k=c;k<9;k++)a[r][k]-=factor*a[c][k];}}
 return a.map(row=>row[8]) as Matrix;
}
export function project(h:Matrix,x:number,y:number):Point{const d=h[6]*x+h[7]*y+1;return[(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];}
export function validQuad(q:Point[]){if(q.length!==4)return false;const cross=q.map((p,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return(b[0]-p[0])*(c[1]-b[1])-(b[1]-p[1])*(c[0]-b[0]);});return cross.every(v=>v>0.0001);}
export const unitQuad:Point[]=[[0,0],[1,0],[1,1],[0,1]];
// Furniture can hide the bottom boundary in individual columns. Enclose the
// observed chroma area instead of averaging those occlusions into a wall edge.
export function wallEnvelope(top:Point[],bottom:Point[],width:number,height:number):Point[]{
 if(top.length<5||bottom.length<5)return [[.05,.05],[.95,.05],[.95,.9],[.05,.9]];
 const edge=(p:Point[],upper:boolean)=>{const n=p.length,sx=p.reduce((s,v)=>s+v[0],0),sy=p.reduce((s,v)=>s+v[1],0),sxx=p.reduce((s,v)=>s+v[0]*v[0],0),sxy=p.reduce((s,v)=>s+v[0]*v[1],0),a=(n*sxy-sx*sy)/(n*sxx-sx*sx||1),intercepts=p.map(([x,y])=>y-a*x),b=upper?Math.min(...intercepts)-3:Math.max(...intercepts)+3;return(x:number)=>(a*x+b)/height;};
 const t=edge(top,true),b=edge(bottom,false),left=Math.max(0,Math.min(...top.map(p=>p[0]))-4),right=Math.min(width,Math.max(...top.map(p=>p[0]))+4),clamp=(n:number)=>Math.max(0,Math.min(1,n));
 const q:Point[]=[[left/width,clamp(t(left))],[right/width,clamp(t(right))],[right/width,clamp(b(right))],[left/width,clamp(b(left))]];
 return validQuad(q)?q:[[0,0],[1,0],[1,1],[0,1]];
}
export function physicalSample(u:number,v:number,wallWidth:number,wallHeight:number,repeatWidth:number,sourceWidth:number,sourceHeight:number,offsetX=0,offsetY=0):Point{
 const repeatHeight=repeatWidth*sourceHeight/sourceWidth;
 return[(u*wallWidth-offsetX)/repeatWidth,(v*wallHeight-offsetY)/repeatHeight];
}
