/* Exterior geometry adapted from hiroakiyasa/homepage camping.html, retrieved 2026-09-09. +X left, +Z front. */
const TAU=Math.PI*2, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t;
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm(a){return this.mul(a,1/(this.len(a)||1))},lerp:(a,b,t)=>a.map((v,i)=>mix(v,b[i],t))};
const M={id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},trans(x,y,z){let m=this.id();m[12]=x;m[13]=y;m[14]=z;return m},scale(x,y,z){let m=this.id();m[0]=x;m[5]=y;m[10]=z;return m},rotX(a){let m=this.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m},rotY(a){let m=this.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m},rotZ(a){let m=this.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m},compose(p,r,s){return this.mul(this.trans(...p),this.mul(this.rotZ(r[2]),this.mul(this.rotY(r[1]),this.mul(this.rotX(r[0]),this.scale(...s)))))},point(m,p,w=1){return [0,1,2,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*w)},persp(fov,asp,near,far,offset=0){let f=1/Math.tan(fov*Math.PI/360),m=new Float32Array(16);m[0]=f/asp;m[5]=f;m[8]=offset;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m},ortho(l,r,b,t,n,f){let m=this.id();m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);return m},look(eye,target,up=[0,1,0]){let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x),m=this.id();for(let i=0;i<3;i++){m[i*4]=x[i];m[i*4+1]=y[i];m[i*4+2]=z[i]}m[12]=-V.dot(x,eye);m[13]=-V.dot(y,eye);m[14]=-V.dot(z,eye);return m}};
class Geometry{constructor(){this.v=[];this.i=[]}vertex(p,n,uv=[0,0]){this.v.push(...p,...n,...uv);return this.v.length/8-1}tri(a,b,c){this.i.push(a,b,c)}quad(a,b,c,d,n,uv=[[0,0],[1,0],[1,1],[0,1]]){n=n||V.norm(V.cross(V.sub(b,a),V.sub(c,a)));let q=[a,b,c,d].map((p,i)=>this.vertex(p,n,uv[i]));this.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);return this}append(g,m=M.id()){let off=this.v.length/8;for(let i=0;i<g.v.length;i+=8){let p=M.point(m,g.v.slice(i,i+3)),n=V.norm(M.point(m,g.v.slice(i+3,i+6),0).slice(0,3));this.v.push(...p.slice(0,3),...n,g.v[i+6],g.v[i+7])}for(let ix of g.i)this.i.push(ix+off);return this}}
function boxGeo(w,h,d,r=0){let g=new Geometry(),hs=[w/2,h/2,d/2];const axes=[[0,1,2],[0,2,1],[1,2,0],[1,0,2],[2,0,1],[2,1,0]];r=Math.min(r,...hs);for(let f=0;f<6;f++){let [ax,u,v]=axes[f],sign=f%2===0?1:-1;let arr=a=>r>0?[-hs[a],-hs[a]+r*.293,-hs[a]+r,hs[a]-r,hs[a]-r*.293,hs[a]]:[-hs[a],hs[a]];let us=arr(u),vs=arr(v),start=g.v.length/8;for(let j=0;j<vs.length;j++)for(let i=0;i<us.length;i++){let p=[0,0,0],n=[0,0,0];p[ax]=sign*hs[ax];p[u]=us[i];p[v]=vs[j];n[ax]=sign;if(r>0){let q=p.map((t,k)=>clamp(t,-hs[k]+r,hs[k]-r));n=V.norm(V.sub(p,q));p=V.add(q,V.mul(n,r))}g.vertex(p,n,[us[i]/(hs[u]*2)+.5,vs[j]/(hs[v]*2)+.5])}for(let j=0;j<vs.length-1;j++)for(let i=0;i<us.length-1;i++){let a=start+j*us.length+i,b=a+1,c=b+us.length,d=a+us.length;g.i.push(a,b,c,a,c,d)}}return g}
function cylGeo(rt,rb,h,n=32){let g=new Geometry();for(let i=0;i<n;i++){let a=i/n*TAU,b=(i+1)/n*TAU,p=(ang,y,r)=>[Math.cos(ang)*r,y,Math.sin(ang)*r];let pts=[p(a,-h/2,rb),p(b,-h/2,rb),p(b,h/2,rt),p(a,h/2,rt)],qs=pts.map((v,j)=>g.vertex(v,V.norm([Math.cos(j===0||j===3?a:b),(rb-rt)/h,Math.sin(j===0||j===3?a:b)]),[j===0||j===3?i/n:(i+1)/n,j<2?0:1]));g.i.push(qs[0],qs[2],qs[1],qs[0],qs[3],qs[2]);for(let y of [-1,1]){let r=y>0?rt:rb,c=g.vertex([0,y*h/2,0],[0,y,0],[.5,.5]),e=g.vertex(p(a,y*h/2,r),[0,y,0],[Math.cos(a)*.5+.5,Math.sin(a)*.5+.5]),f=g.vertex(p(b,y*h/2,r),[0,y,0],[Math.cos(b)*.5+.5,Math.sin(b)*.5+.5]);g.tri(c,e,f)}}return g}
function sphereGeo(rx,ry,rz,n=32,m=20){let g=new Geometry();for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let a=i/n*TAU,b=j/m*Math.PI,s=Math.sin(b),v=[s*Math.cos(a),Math.cos(b),s*Math.sin(a)];g.vertex([v[0]*rx,v[1]*ry,v[2]*rz],V.norm([v[0]/rx,v[1]/ry,v[2]/rz]),[i/n,j/m])}for(let j=0;j<m;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i;g.i.push(a,a+1,a+n+2,a,a+n+2,a+n+1)}return g}
function torusGeo(major,minor,n=64,m=12){let g=new Geometry();for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let a=i/n*TAU,b=j/m*TAU,c=Math.cos(b),s=Math.sin(b);g.vertex([(major+minor*c)*Math.cos(a),(major+minor*c)*Math.sin(a),minor*s],[c*Math.cos(a),c*Math.sin(a),s],[i/n,j/m])}for(let j=0;j<m;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i;g.i.push(a,a+1,a+n+2,a,a+n+2,a+n+1)}return g}
function tubeGeo(points,r=.01,n=10){let g=new Geometry();for(let j=0;j<points.length;j++){let t=V.norm(V.sub(points[Math.min(j+1,points.length-1)],points[Math.max(0,j-1)])),a=V.norm(V.cross(Math.abs(t[1])>.98?[1,0,0]:[0,1,0],t)),b=V.cross(t,a);for(let i=0;i<=n;i++){let ph=i/n*TAU,no=V.add(V.mul(a,Math.cos(ph)),V.mul(b,Math.sin(ph)));g.vertex(V.add(points[j],V.mul(no,r)),no,[i/n,j/(points.length-1)])}}for(let j=0;j<points.length-1;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i;g.i.push(a,a+1,a+n+2,a,a+n+2,a+n+1)}return g}
function roundedPlane(w,h,r=.06,map=p=>p){let g=new Geometry(),pts=[];for(let j=0;j<4;j++){let cx=(j===0||j===3?1:-1)*(w/2-r),cy=(j<2?1:-1)*(h/2-r);for(let i=0;i<=8;i++){let a=(j*90+i/8*90)*Math.PI/180;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r,0])}}let normal=V.norm(V.cross(V.sub(map([1,0,0]),map([0,0,0])),V.sub(map([0,1,0]),map([0,0,0]))));let c=g.vertex(map([0,0,0]),normal,[.5,.5]);let ids=pts.map(p=>g.vertex(map(p),normal,[p[0]/w+.5,p[1]/h+.5]));for(let i=0;i<ids.length;i++)g.tri(c,ids[i],ids[(i+1)%ids.length]);return g}
function orientGeometry(g){
 if(g.oriented)return;
 const v=g.v;for(let k=0;k<g.i.length;k+=3){
  const a=g.i[k]*8,b=g.i[k+1]*8,c=g.i[k+2]*8;
  const abx=v[b]-v[a],aby=v[b+1]-v[a+1],abz=v[b+2]-v[a+2],acx=v[c]-v[a],acy=v[c+1]-v[a+1],acz=v[c+2]-v[a+2];
  const dot=(aby*acz-abz*acy)*(v[a+3]+v[b+3]+v[c+3])+(abz*acx-abx*acz)*(v[a+4]+v[b+4]+v[c+4])+(abx*acy-aby*acx)*(v[a+5]+v[b+5]+v[c+5]);
  if(dot<0){const tmp=g.i[k+1];g.i[k+1]=g.i[k+2];g.i[k+2]=tmp;}
 }g.oriented=true;
}
async function modelPause(amount,label){
 if(typeof globalThis.__modelProgress==='function')globalThis.__modelProgress(amount,label);
 if(typeof document!=='undefined')await new Promise(r=>setTimeout(r,0));
}
let nodeCounter=0;
class Node{constructor(name,parent=null){this.name=name;this.id=++nodeCounter;this.p=[0,0,0];this.r=[0,0,0];this.s=[1,1,1];this.children=[];this.buckets=new Map();this.visible=true;this.alpha=1;if(parent)parent.children.push(this)}add(g,material,p=[0,0,0],r=[0,0,0],s=[1,1,1]){if(!this.buckets.has(material))this.buckets.set(material,new Geometry());this.buckets.get(material).append(g,M.compose(p,r,s));return this}upload(gl,recursive=true){if(this.gpu){if(recursive)for(const n of this.children)n.upload(gl);return;}this.gpu=[];for(let [mat,g]of this.buckets){
 orientGeometry(g);
let vao=gl.createVertexArray();gl.bindVertexArray(vao);let v=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,(g.v instanceof Float32Array?g.v:new Float32Array(g.v)),gl.STATIC_DRAW);let ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,(g.i instanceof Uint32Array?g.i:new Uint32Array(g.i)),gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===2?2:3,gl.FLOAT,false,32,i===0?0:i===1?12:24)}this.gpu.push({vao,count:g.i.length,mat})}if(recursive)for(let n of this.children)n.upload(gl)}walk(parent=M.id(),alpha=1,out=[]){if(!this.visible||this.alpha<.002)return out;this.world=M.mul(parent,M.compose(this.p,this.r,this.s));for(let b of this.gpu||[])out.push({...b,model:this.world,alpha:alpha*this.alpha,node:this.name});for(let n of this.children)n.walk(this.world,alpha*this.alpha,out);return out}}
const BUILD_MAT={steel:material('#dfe4e1',{rough:.48,metal:.34}),rib:material('#c7d3d0',{rough:.55,metal:.25}),foil:material('#a9b7b9',{rough:.28,metal:.87}),butyl:material('#303c41',{rough:.72}),insulation:material('#b3c8ba',{rough:.96}),vinyl:material('#d8d0b9',{rough:.92}),plyEdge:material('#ad9369',{rough:.85}),fresh:material('#eef3ef',{rough:.58}),waste:material('#b6bfba',{rough:.7}),blue:material('#348bb4',{rough:.65}),orange:material('#d79043',{rough:.62}),red:material('#bd5a43',{rough:.6}),green:material('#4d9c80',{rough:.6}),panel:material('#1b3740',{rough:.33}),warning:material('#d7ab50',{rough:.7})};
function material(hex,opt={}){let h=hex.replace('#','');return {color:[0,2,4].map(i=>Math.pow(parseInt(h.slice(i,i+2),16)/255,2.2)),...opt}}
const MAT={paint:material('#f4f5f1',{rough:.29,metal:.12}),paintInset:material('#d3d4cd',{rough:.35,metal:.15}),rubber:material('#262c2b',{rough:.8}),black:material('#303636',{rough:.32,metal:.30}),chrome:material('#dbe0dd',{rough:.14,metal:.97}),brushed:material('#9ca9a5',{rough:.35,metal:.86}),window:material('#55716f',{rough:.16,metal:.12,alpha:.62,shadow:false}),darkGlass:material('#334644',{rough:.17,metal:.24,alpha:.78,shadow:false}),wood:material('#ffffff',{tex:'wood',rough:.79}),pine:material('#ffffff',{tex:'woodLight',rough:.76}),endwood:material('#cab184',{rough:.7}),fabric:material('#ffffff',{tex:'fabric',rough:.94}),curtain:material('#ffffff',{tex:'curtain',rough:.94}),seat:material('#313835',{rough:.88}),led:material('#fff1c8',{rough:.5,emit:3.3,shadow:false}),ledBright:material('#fff8e3',{rough:.6,emit:4.2,shadow:false}),red:material('#a11c14',{rough:.22,metal:.25}),lens:material('#dfeded',{rough:.11,metal:.42,alpha:.74,shadow:false}),solar:material('#ffffff',{tex:'solar',rough:.18,metal:.42}),screen:material('#ffffff',{tex:'screen',rough:.8,emit:1.0,shadow:false}),floor:material('#121a17',{rough:.95,shadow:false}),platform:material('#1c2822',{rough:.88,metal:.06}),contact:material('#000000',{tex:'contact',rough:1,alpha:.7,shadow:false}),redWire:material('#b62e25',{rough:.46}),blue:material('#1f7386',{rough:.4,metal:.16}),green:material('#698274',{rough:.68}),whiteLabel:material('#d4d7c9',{rough:.72})};
const EXTRA={
 lampHousing:material('#77878c',{rough:.31,metal:.64}),lampGlass:material('#9fb5bc',{rough:.26,metal:.07,alpha:.46,shadow:false}),bumper:material('#282f30',{rough:.73,metal:.03}),hubcap:material('#b9c3c4',{rough:.31,metal:.65}),
 microwave:material('#252e2f',{rough:.24,metal:.48}),display:material('#50b5d9',{rough:.6,emit:1.4,shadow:false}),
 warmDisplay:material('#b4d5bb',{rough:.6,emit:.75,shadow:false}),keyboard:material('#222a2b',{rough:.7}),
 laptop:material('#bdc4c1',{rough:.34,metal:.8}),screenWork:material('#ffffff',{tex:'workscreen',rough:.85,emit:.42,shadow:false}),
 copper:material('#c79361',{rough:.37,metal:.78}),stove:material('#665850',{rough:.45,metal:.35})
};
// Smooth parametric panels for the nose and the high-roof crown.
function panelSurface(fn,nu=32,nv=16,flip=false){let g=new Geometry();for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){let u=i/nu,v=j/nv,p=fn(u,v),du=V.sub(fn(Math.min(u+.0002,1),v),fn(Math.max(0,u-.0002),v)),dv=V.sub(fn(u,Math.min(1,v+.0002)),fn(u,Math.max(0,v-.0002)));let n=V.norm(V.cross(du,dv));if(flip)n=V.mul(n,-1);g.vertex(p,n,[u,v])}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){let a=j*(nu+1)+i,b=a+1,c=b+nu+1,d=a+nu+1;g.i.push(...(flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]))}return g}
function oval(n,mat,rx,ry,px,py,pz,r=.004){let pts=[];for(let i=0;i<=64;i++){let a=i/64*TAU;pts.push([px+Math.cos(a)*rx,py+Math.sin(a)*ry,pz])}T(n,mat,pts,r)}
function B(n,mat,w,h,d,x=0,y=0,z=0,r=.005,rot=[0,0,0]){n.add(boxGeo(w,h,d,r<.004?0:r),mat,[x,y,z],rot)}
function C(n,mat,rt,rb,h,x,y,z,rot=[0,0,0],seg=24){n.add(cylGeo(rt,rb,h,seg),mat,[x,y,z],rot)}
function T(n,mat,p,r=.012){n.add(tubeGeo(p,r),mat)}
/* V3 sculpted exterior. +X = vehicle left, +Z = front; photo-informed, not manufacturer CAD. */
function smoothProfile(points,t){let j=0;while(j<points.length-2&&t>points[j+1][0])j++;let[a,b]=[points[j],points[j+1]],d=b[0]-a[0],u=clamp((t-a[0])/d),prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+2)];let m0=(b[1]-prev[1])/(b[0]-prev[0]),m1=(next[1]-a[1])/(next[0]-a[0]);return (2*u**3-3*u*u+1)*a[1]+(u**3-2*u*u+u)*d*m0+(-2*u**3+3*u*u)*b[1]+(u**3-u*u)*d*m1;}
function roundedOutline(w,h,r,arc=12,edge=12){let p=[],centers=[[w/2-r,h/2-r],[-w/2+r,h/2-r],[-w/2+r,-h/2+r],[w/2-r,-h/2+r]];for(let j=0;j<4;j++){let c=centers[j],a=j*Math.PI/2;for(let i=0;i<=arc;i++){let t=a+i/arc*Math.PI/2;p.push([c[0]+r*Math.cos(t),c[1]+r*Math.sin(t)])}let end=p.at(-1),cn=centers[(j+1)%4],begin=[cn[0]+r*Math.cos(a+Math.PI/2),cn[1]+r*Math.sin(a+Math.PI/2)];for(let i=1;i<edge;i++)p.push([mix(end[0],begin[0],i/edge),mix(end[1],begin[1],i/edge)])}return p;}
function roundPoly(points,dist=.035,arc=10,edge=14){let out=[];for(let j=0;j<points.length;j++){let a=points[(j+points.length-1)%points.length],b=points[j],c=points[(j+1)%points.length],la=Math.hypot(a[0]-b[0],a[1]-b[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]),ra=Math.min(dist,la*.25),rc=Math.min(dist,lc*.25),q=[b[0]+(a[0]-b[0])*ra/la,b[1]+(a[1]-b[1])*ra/la],r=[b[0]+(c[0]-b[0])*rc/lc,b[1]+(c[1]-b[1])*rc/lc];for(let i=0;i<=arc;i++){let t=i/arc;out.push([q[0]*(1-t)**2+2*b[0]*t*(1-t)+r[0]*t*t,q[1]*(1-t)**2+2*b[1]*t*(1-t)+r[1]*t*t])}let nextDist=Math.min(dist,lc*.25),e=[c[0]+(b[0]-c[0])*nextDist/lc,c[1]+(b[1]-c[1])*nextDist/lc];for(let i=1;i<edge;i++)out.push([mix(r[0],e[0],i/edge),mix(r[1],e[1],i/edge)])}return out;}
function normalForMap(fn,x,y,flip=false){let e=.0001,dx=V.sub(fn(x+e,y),fn(x-e,y)),dy=V.sub(fn(x,y+e),fn(x,y-e)),n=V.norm(V.cross(dx,dy));return flip?V.mul(n,-1):n;}
function contourFace(points,fn,flip=false,rings=14){let g=new Geometry(),ctr=points.reduce((a,b)=>[a[0]+b[0]/points.length,a[1]+b[1]/points.length],[0,0]),n=points.length,xmax=Math.max(...points.map(p=>Math.abs(p[0]-ctr[0]))),ymax=Math.max(...points.map(p=>Math.abs(p[1]-ctr[1])));g.vertex(fn(...ctr),normalForMap(fn,...ctr,flip),[.5,.5]);for(let j=1;j<=rings;j++)for(let p of points){let x=mix(ctr[0],p[0],j/rings),y=mix(ctr[1],p[1],j/rings);g.vertex(fn(x,y),normalForMap(fn,x,y,flip),[(x-ctr[0])/xmax*.5+.5,(y-ctr[1])/ymax*.5+.5])}for(let i=0;i<n;i++)g.tri(0,1+i,1+(i+1)%n);for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){let a=1+j*n+i,b=1+j*n+(i+1)%n,c=b+n,d=a+n;g.i.push(a,b,c,a,c,d)}return g;}
function contourRing(out,inn,fn,flip=false,rings=7){let g=new Geometry(),n=out.length;if(n!==inn.length)throw Error('Contour topology mismatch');for(let j=0;j<=rings;j++)for(let i=0;i<n;i++){let x=mix(inn[i][0],out[i][0],j/rings),y=mix(inn[i][1],out[i][1],j/rings);g.vertex(fn(x,y),normalForMap(fn,x,y,flip),[i/n,j/rings])}for(let j=0;j<rings;j++)for(let i=0;i<n;i++){let a=j*n+i,b=j*n+(i+1)%n,c=b+n,d=a+n;g.i.push(a,b,c,a,c,d)}return g;}
function rrFace(w,h,r,fn,flip=false,rings=14){return contourFace(roundedOutline(w,h,r),fn,flip,rings);}
function traceContour(node,mat,pts,fn,r=.005){T(node,mat,[...pts,pts[0]].map(p=>fn(...p)),r);}
const V3={
 pearl:material('#f4f3ef',{rough:.22,metal:.07,coat:.7}),
 glass:material('#29353f',{rough:.14,metal:.10,alpha:.87,shadow:false,glass:1}),
 rearGlass:material('#1a2430',{rough:.13,metal:.12,alpha:.965,shadow:false,glass:1}),
 blackFrit:material('#141b1f',{rough:.27,metal:.12}),
 lightGlass:material('#8799a8',{rough:.23,metal:.07,alpha:.22,shadow:false,glass:1}),
 reflector:material('#cad4d6',{rough:.20,metal:.94}),
 tailLens:material('#b41a1b',{rough:.20,metal:.1,coat:.4}),
 dark:material('#242a2b',{rough:.58,metal:.03}),
 stone:material('#e5e9e5',{rough:.52,metal:.025}),
 floor:material('#edf6fa',{rough:.67,metal:.01,emit:.10}),
 brass:material('#81b5c7',{rough:.34,metal:.72}),
 seat:material('#34393b',{rough:.85}),
 seatInsert:material('#454a49',{rough:.93}),
 engine:material('#414647',{rough:.86})
};
async function buildSculptedExterior(N){const {root,fixed,walls,roof,hatch,slide}=N;
 // Seamless warm-white showroom and satin stone display plinth.
 let studio=new Node('coastal-daylight-stage',root);
 const water=material('#72c7d4',{rough:.32,metal:.16,sea:1,shadow:false,shadowReceive:false});
 const coastFar=material('#9fc7c8',{rough:1,shadow:false}),coastNear=material('#739e98',{rough:1,shadow:false});
 B(studio,water,180,.04,180,0,-.27,0,0);
 C(studio,V3.floor,5.65,5.72,.08,0,-.18,0,[0,0,0],128);
 // Low coastal ridges sit beyond the van; the vehicle's exterior vertices are not changed.
 for(let layer=0;layer<2;layer++){
  studio.add(panelSurface((u,v)=>{const x=mix(-48,48,u),z=-30-layer*22+v*9;const ridge=Math.pow(Math.max(0,Math.sin((x+24)*.042)),2)*(2.4+Math.sin(x*.19+layer)*.65)+.38;return [x,-.25+Math.sin(v*Math.PI)*ridge*(layer?1.25:1),z];},100,18,true),layer?coastFar:coastNear);
 }
 N.coastalStage=studio;C(studio,V3.stone,3.85,3.89,.12,0,-.064,0,[0,0,0],192);studio.add(torusGeo(3.847,.0035,192,8),V3.brass,[0,-.015,0],[Math.PI/2,0,0]);studio.add(rrFace(2.90,6.2,.48,(x,y)=>[x,.002,y]),{...MAT.contact,alpha:.32});
 const sx=y=>smoothProfile([[.30,.877],[.42,.919],[.65,.938],[1.04,.940],[1.24,.934],[1.35,.927],[1.72,.899],[1.96,.875],[2.12,.854]],y);
 const side=(s,y,z,off=0)=>[s*(sx(y)+off),y,z];
 const frontZ=(x,y)=>2.682-.152*(Math.abs(x)/.94)**6-.015*Math.exp(-(((y-.40)/.055)**2));
 const rearZ=(x,y)=>-2.682+.100*(Math.abs(x)/.92)**5+.09*clamp((y-2.05)/.23)**2;
 function sideBand(s,z0,z1,y0,y1,arch=false){let steps=Math.ceil((z1-z0)/.029);walls.add(panelSurface((u,v)=>{let z=mix(z0,z1,u),lo=y0;if(arch)for(let wz of[-1.41,1.70]){let d=Math.abs(z-wz);if(d<.377)lo=Math.max(lo,.337+Math.sqrt(Math.max(0,.377**2-d*d)))}let y=mix(lo,y1,v);let x=sx(y)+.004*Math.exp(-(((y-1.19)/.02)**2));return[s*x,y,z]},steps,20,s>0),V3.pearl);}
 await modelPause(0.12,'3Dの部材を準備しています');
 // Full lower sheet metal with real wheel-arch cutouts. Door remains a distinct moving shell.
 sideBand(-1,-2.49,2.529,.39,1.308,true);sideBand(1,-2.49,-.287,.39,1.308,true);sideBand(1,.887,2.529,.39,1.308,true);
 for(let s of[-1,1]){
  let ranges=s>0?[[-2.49,-.287]]:[[-2.49,.98]];
  for(let [za,zb]of ranges)sideBand(s,za,zb,1.981,2.081);
  // Rounded white window surrounds, dark frits, and smoothly crowned glass.
  const spans=s>0?[[-2.49,-.287]]:[[-2.49,-1.432],[-1.432,-.291],[-.291,.981]];
  for(let [za,zb]of spans){let mid=(za+zb)/2,len=zb-za,outer=roundedOutline(len,.733,.032),inner=roundedOutline(len-.072,.594,.071);let fn=(u,v)=>side(s,v+1.645,u+mid);walls.add(contourRing(outer,inner,fn,s>0),V3.pearl);
   let fritOuter=inner,fritInner=roundedOutline(len-.110,.556,.060);walls.add(contourRing(fritOuter,fritInner,(u,v)=>side(s,v+1.645,u+mid,.0015),s>0,3),V3.blackFrit);
   walls.add(contourFace(fritInner,(u,v)=>side(s,v+1.645,u+mid,.0025+.003*(1-(u/(len*.5))**2)),s>0,12),V3.rearGlass);
  }
  // Subtle pressed shoulder and lower sill; joints are fine gaps, not disconnected boards.
  for(let [za,zb]of(s>0?[[-2.48,-.296],[.896,2.36]]:[[-2.48,2.36]])){
   T(walls,MAT.paintInset,[side(s,1.16,za,.002),side(s,1.16,zb,.002)],.004);
   T(walls,V3.pearl,[side(s,.417,za),side(s,.417,zb)],.012);
  }
  for(let zc of[-1.41,1.70]){walls.add(panelSurface((u,v)=>{let a=mix(-.012,Math.PI+.012,u),r=mix(.376,.425,v),z=zc+Math.cos(a)*r,y=.337+Math.sin(a)*r;return[s*(sx(y)+Math.sin(Math.PI*v)*.012),y,z]},96,10,s>0),V3.pearl);}
  // Front door upper frame and A-pillar form a filled, curved annular panel.
  let outer=roundPoly([[1.00,1.281],[2.478,1.281],[1.947,1.994],[1.00,1.994]],.044),inn=roundPoly([[1.075,1.346],[2.362,1.346],[1.890,1.923],[1.075,1.923]],.045);
  fixed.add(contourRing(outer,inn,(z,y)=>side(s,y,z),s>0,7),V3.pearl);
  fixed.add(contourFace(inn,(z,y)=>side(s,y,z,.0025),s>0,15),{...V3.glass,alpha:.69});traceContour(fixed,V3.blackFrit,inn,(z,y)=>side(s,y,z,.004),.007);
  T(fixed,MAT.black,[[s*sx(.419),.419,1.001],[s*sx(1.281),1.281,1.001],[s*sx(1.967),1.967,1.001]],.0025);
  B(fixed,V3.blackFrit,.017,.036,.122,s*.946,1.160,1.178,.01);B(fixed,MAT.chrome,.016,.018,.094,s*.958,1.165,1.178,.006);
  // Mirror pedestal, curved housings, rear-facing mirror glass.
  T(fixed,V3.dark,[[s*.916,1.452,2.07],[s*1.037,1.475,2.036]],.029);
  fixed.add(sphereGeo(.080,.122,.089,48,28),MAT.brushed,[s*1.071,1.538,2.039]);
  B(fixed,V3.dark,.151,.197,.026,s*1.071,1.538,1.956,.024);B(fixed,MAT.brushed,.123,.166,.007,s*1.071,1.541,1.940,.021);
 }
 await modelPause(0.2,'3Dの部材を準備しています');
 // Smooth, slightly bowed windshield: substantially shorter nose slope than v2.
 const wf=(x,y)=>{let t=(y+.32)/.64;return[x*(1-.050*t),y+1.619,mix(2.509,2.047,t)+.021*(1-(x/.9)**2)];};
 fixed.add(contourRing(roundedOutline(1.825,.729,.071),roundedOutline(1.749,.663,.067),wf,false,4),V3.pearl);
 fixed.add(contourRing(roundedOutline(1.749,.663,.067),roundedOutline(1.720,.637,.061),wf,false,3),V3.blackFrit);
 fixed.add(rrFace(1.720,.637,.061,wf,false,22),{...V3.glass,alpha:.68});
 // V14 joins use the windshield/door edges, not floating rectangular filler boards.
 for(const sideSign of [-1,1]){
  sideBand(sideSign,.882,1.009,1.284,2.023);
  fixed.add(panelSurface((u,v)=>{
   const y=mix(1.283,1.983,v),yy=y-1.619,rad=.071,halfW=.9125,halfH=.3645;
   const inset=Math.max(0,Math.abs(yy)-(halfH-rad));
   const xedge=halfW-rad+Math.sqrt(Math.max(0,rad*rad-inset*inset));
   const a=wf(sideSign*xedge,yy);
   const zz=mix(2.478,1.947,(y-1.281)/.713);
   const b=side(sideSign,y,zz+.002);
   return V.lerp(a,b,u);
  },12,64,sideSign<0),V3.pearl);
 }
 fixed.add(panelSurface((u,v)=>{
  const x=mix(-.838,.838,u),a=wf(x,.362),b=[x,1.975-(Math.abs(x)/.84)**4*.018,2.072];
  return V.lerp(a,b,v);
 },64,6,true),V3.pearl);
 fixed.add(panelSurface((u,v)=>{
  const x=mix(-.918,.918,u),a=wf(x,-.344),b=[x,1.300,frontZ(x,1.300)];return V.lerp(a,b,v);
 },64,8,false),V3.pearl);
 // One continuous rounded front bumper and engine-service nose, with inset grille/lamp details.
 fixed.add(rrFace(1.876,.937,.074,(x,y)=>[x,y+.848,frontZ(x,y+.848)],false,24),V3.pearl);
 const nose=(x,y,off=.0)=>[x,y,frontZ(x,y)+off];
 let grill=roundPoly([[-.595,.949],[.595,.949],[.627,1.093],[-.627,1.093]],.02);
 fixed.add(contourFace(grill,(x,y)=>nose(x,y,.005),false,8),V3.blackFrit);
 for(let by of[.951,1.041]){let pp=[];for(let i=0;i<=50;i++){let x=mix(-.588,.588,i/50),y=by+.026*(Math.abs(x)/.59)**4;pp.push(nose(x,y,.019))}T(fixed,MAT.chrome,pp,.012);}
 for(let x of[-.30,0,.30])B(fixed,V3.dark,.017,.10,.026,x,1.002,frontZ(x,1)+.012,.003);
 oval(fixed,MAT.chrome,.057,.041,0,1.183,frontZ(0,1.183)+.013,.005);oval(fixed,MAT.chrome,.021,.035,0,1.183,frontZ(0,1.183)+.019,.004);oval(fixed,MAT.chrome,.044,.014,0,1.193,frontZ(0,1.183)+.019,.0035);
 fixed.add(rrFace(1.16,.160,.033,(x,y)=>nose(x,y+.651,.009)),V3.blackFrit);
 for(let y of[.599,.641,.681,.715]){let pp=[];for(let i=0;i<32;i++){let x=mix(-.55,.55,i/31);pp.push(nose(x,y,.025))}T(fixed,V3.dark,pp,.008);}
 let lip=[];for(let i=0;i<80;i++){let x=mix(-.882,.882,i/79);lip.push(nose(x,.411,.004))}T(fixed,MAT.paintInset,lip,.006);
 fixed.add(rrFace(.352,.167,.008,(x,y)=>nose(x,y+.495,.036),false,4),MAT.paint); // blank number plate, no dealer text
 for(let s of[-1,1]){
  let xc=s*.739,fn=(x,y)=>{let xx=x+xc,yy=y+1.017;return nose(xx,yy,.011)};
  fixed.add(rrFace(.344,.249,.025,fn,false,13),EXTRA.lampHousing);
  for(let xx of[s*.654,s*.793]){
   fixed.add(panelSurface((u,v)=>{let a=u*TAU,r=.067*v,x=xx+Math.cos(a)*r,y=1.022+Math.sin(a)*r;return nose(x,y,.013+.025*(r/.067)**2)},64,14),MAT.chrome);
   C(fixed,MAT.chrome,.014,.014,.012,xx,1.022,frontZ(xx,1.022)+.015,[Math.PI/2,0,0],24);
  }
  for(let j=0;j<14;j++){let x=xc+s*(.122+j*.0029);T(fixed,MAT.brushed,[nose(x,.921,.027),nose(x,1.108,.027)],.0010);}
  fixed.add(rrFace(.343,.245,.024,(x,y)=>{let p=fn(x,y);p[2]+=.022+.012*(1-(x/.174)**2)*(1-(y/.124)**2);return p},false,14),V3.lightGlass);
  traceContour(fixed,V3.dark,roundedOutline(.35,.255,.027),fn,.003);
  fixed.add(rrFace(.224,.126,.029,(x,y)=>nose(x+s*.733,y+.575,.008),false,10),V3.blackFrit);
  C(fixed,MAT.chrome,.046,.046,.014,s*.729,.575,frontZ(s*.729,.575)+.018,[Math.PI/2,0,0],48);
  fixed.add(sphereGeo(.036,.036,.016,40,22),V3.lightGlass,[s*.729,.575,frontZ(s*.729,.575)+.033]);
  T(fixed,V3.pearl,[nose(s*.633,.574,.048),nose(s*.676,.574,.048)],.010);
  let wiper=[];for(let i=0;i<=32;i++){let x=s*mix(.08,.74,i/32),y=1.335+.017*Math.sin(i/32*Math.PI),p=wf(x,y-1.619);p[2]+=.008;wiper.push(p)}T(fixed,V3.dark,wiper,.0055);
 }
 // Left front auxiliary mirror, recognisable on the owner's vehicle.
 T(fixed,V3.dark,[[.861,1.373,2.432],[1.001,1.429,2.447],[1.025,1.645,2.457]],.023);
 fixed.add(sphereGeo(.064,.084,.035,40,24),V3.dark,[1.014,1.678,2.457],[.12,.2,.1]);
 await modelPause(0.25,'3Dの部材を準備しています');
 // Continuous high-roof loft. Smooth vertex normals preserve reflections across each patch.
 const roofProfile=z=>[smoothProfile([[-2.62,2.181],[-2.49,2.252],[-2.26,2.285],[1.10,2.285],[1.48,2.280],[1.76,2.235],[2.07,1.971]],z),smoothProfile([[-2.62,.823],[-2.49,.881],[-2.26,.887],[1.10,.887],[1.48,.880],[1.76,.863],[2.07,.831]],z),smoothProfile([[-2.62,.060],[-2.49,.088],[-2.26,.095],[1.10,.095],[1.48,.090],[1.76,.065],[2.07,.015]],z)];
 const roofFn=(x,z)=>{let [yc,w,drop]=roofProfile(z);return[x,yc-drop*(Math.abs(x)/w)**3.8,z]};
 N.roofSurfaceY=(x,z)=>roofFn(x,z)[1];
 roof.add(panelSurface((u,v)=>{let z=mix(-2.62,2.07,v),[yc,w]=roofProfile(z),x=mix(-w,w,u);return roofFn(x,z)},72,128,true),V3.pearl);
 for(let s of[-1,1]){
  roof.add(panelSurface((u,v)=>{let z=mix(-2.49,1.01,u),[yc,w,drop]=roofProfile(z);return[s*mix(sx(2.013),w,v),mix(2.013,yc-drop,v),z]},72,10,s<0),V3.pearl);
  // A single thin drip rail, instead of multiple protruding roof slabs.
  let rail=[];for(let j=0;j<=90;j++){let z=mix(-2.48,1.18,j/90),[yc,w,drop]=roofProfile(z);rail.push([s*(w+.004),yc-drop-.004,z])}T(roof,MAT.paintInset,rail,.0045);
  roof.add(panelSurface((u,v)=>{let z=mix(1.005,1.947,u),[yc,w,drop]=roofProfile(z),lo=1.975;return[s*mix(sx(lo),w,v),mix(lo,yc-drop,v),z]},60,14,s<0),V3.pearl);
 }
 // Overlapping seam fillers remove visible daylight gaps where the high roof meets the bodyside.
 for(let s of[-1,1]){
  roof.add(panelSurface((u,v)=>{let z=mix(-2.49,1.92,u),y=mix(1.992,2.048,v),w=sx(y),[yc,r,drop]=roofProfile(z);return[s*mix(w-.004,r-.010,v),mix(y,yc-drop-.003,v),z]},110,5,s<0),V3.pearl);
 }
 // Rear quarter-round panels tie the sidewall to the tailgate frame.
 for(let s of[-1,1])walls.add(panelSurface((u,v)=>{let y=mix(.39,2.084,v),w=sx(y),a=u*Math.PI/2;return[s*(w-.132+.132*Math.cos(a)),y,-2.49-.155*Math.sin(a)]},40,72,s>0),V3.pearl);
 // Rear hatch frame, upper forehead and shaped corner lamps.
 walls.add(rrFace(1.682,.170,.054,(x,y)=>[x,y+2.096,rearZ(x,y+2.096)+.029],true,14),V3.pearl);
 for(let s of[-1,1]){
  let lampMap=(x,y)=>{let yy=y+.986,xx=s*(.856+x);return[xx,yy,rearZ(xx,yy)-.008]};
  walls.add(rrFace(.141,.584,.060,lampMap,true,20),V3.blackFrit);
  walls.add(rrFace(.124,.564,.051,(x,y)=>{let p=lampMap(x,y);p[2]-=.008+.012*(1-(x/.067)**2);return p},true,22),V3.tailLens);
  walls.add(rrFace(.119,.118,.01,(x,y)=>{let p=lampMap(x,y-.135);p[2]-=.034;return p},true,8),V3.reflector);
  for(let j=0;j<5;j++)T(walls,V3.dark,[[s*.808,.814+j*.019,-2.654],[s*.904,.814+j*.019,-2.638]],.0012);
  for(let i=0;i<18;i++){let yy=-.252+i*.028;if(yy>-.20&&yy<-.084)continue;T(walls,MAT.red,[[s*.807,.986+yy,-2.631],[s*.901,.986+yy,-2.612]],.0022)}
 }
 // Gate moves as one bowed mesh about the upper hinge; its glass is a rounded trapezoid.
 const pivot=[0,2.218,-2.560];hatch.p=[...pivot];
 const local=(x,y,off=0)=>[x,y-pivot[1],rearZ(x,y)-pivot[2]+off];
 const outer=roundedOutline(1.600,1.718,.091).map(([x,y])=>[x*(1-.032*clamp((y+.86)/1.718)),y+1.343]);
 const glassOut=roundedOutline(1.472,.645,.089).map(([x,y])=>[x*(1-.035*(y/.645+.5)),y+1.646]);
 const glassIn=roundedOutline(1.439,.612,.075).map(([x,y])=>[x*(1-.035*(y/.612+.5)),y+1.646]);
 hatch.add(contourRing(outer,glassOut,(x,y)=>local(x,y),true,19),V3.pearl);
 hatch.add(contourRing(glassOut,glassIn,(x,y)=>local(x,y,-.003),true,4),V3.blackFrit);
 hatch.add(contourFace(glassIn,(x,y)=>local(x,y,-.007-.008*(1-(x/.74)**2)),true,20),V3.rearGlass);
 traceContour(walls,V3.dark,outer,(x,y)=>[x,y,rearZ(x,y)+.012],.0035);
 // Chrome garnish, emblem, shallow plate recess, wiper and upper brake lamp.
 let garnish=[];for(let i=0;i<=80;i++){let x=mix(-.643,.643,i/80);garnish.push(local(x,1.045+.005*(x/.65)**2,-.014))}T(hatch,MAT.chrome,garnish,.012);
 hatch.add(rrFace(.403,.195,.021,(x,y)=>local(x,y+.873,-.002),true,7),MAT.paintInset);
 hatch.add(rrFace(.338,.148,.008,(x,y)=>local(x,y+.873,-.011),true,6),MAT.paint);
 oval(hatch,MAT.chrome,.041,.030,0,1.159-pivot[1],rearZ(0,1.159)-pivot[2]-.011,.0045);oval(hatch,MAT.chrome,.016,.026,0,1.159-pivot[1],rearZ(0,1.159)-pivot[2]-.016,.0034);oval(hatch,MAT.chrome,.033,.010,0,1.168-pivot[1],rearZ(0,1.159)-pivot[2]-.016,.003);
 hatch.add(rrFace(.244,.038,.016,(x,y)=>local(x,y+2.04,-.009),true,6),V3.tailLens);
 T(hatch,V3.dark,[local(.082,1.840,-.039),local(.211,1.772,-.041),local(.527,1.765,-.040)],.006);T(hatch,V3.dark,[local(.161,1.783,-.047),local(.543,1.760,-.045)],.008);
 // White rear skirt, sweeping corners and black inset with wide horizontal red reflectors.
 fixed.add(rrFace(1.860,.242,.067,(x,y)=>[x,y+.367,-2.669+.173*(Math.abs(x)/.94)**6],true,24),V3.pearl);
 fixed.add(rrFace(1.62,.063,.025,(x,y)=>[x,y+.332,-2.684+.122*(Math.abs(x)/.9)**6],true,12),V3.blackFrit);
 for(let s of[-1,1])fixed.add(rrFace(.227,.032,.012,(x,y)=>{let xx=x+s*.640;return[xx,y+.334,-2.693+.12*(Math.abs(xx)/.9)**6]},true,7),V3.tailLens);
 // Modest spoiler matching the supplied rear photo, not the watermarked scenery.
 roof.add(panelSurface((u,v)=>{let x=mix(-.789,.789,u),z=mix(-2.57,-2.725,v),y=2.251+.028*Math.sin(Math.PI*v)-.020*(x/.81)**4;return[x,y,z]},80,22,true),V3.pearl);
 for(let s of[-1,1])B(roof,V3.pearl,.042,.079,.085,s*.744,2.211,-2.58,.012);
 // Wood lining on the moving gate. A clean seal and inner handle finish the aperture.
 for(let j=0;j<9;j++){let y=.576+j*.081;B(N.hatchWood,j%4?MAT.pine:MAT.wood,1.472,.079,.016,0,y-pivot[1],rearZ(0,y)-pivot[2]+.060,.003)}
 B(N.hatchWood,MAT.pine,1.408,.158,.018,0,2.090-pivot[1],.027,.011);for(let s of[-1,1])B(N.hatchWood,MAT.pine,.048,.599,.018,s*.752,1.650-pivot[1],-.017,.009);
 B(hatch,V3.dark,.137,.033,.035,0,.571-pivot[1],rearZ(0,.57)-pivot[2]+.080,.008);
 // Smooth sliding panel, full depth to the sill, mounted to the existing animation pivot.
 slide.p=[.935,0,.300];let slideFn=(z,y,off=0)=>[sx(y)-.935+off,y,z];
 slide.add(rrFace(1.169,.919,.033,(u,v)=>slideFn(u,v+.849),true,22),V3.pearl);
 const so=roundedOutline(1.169,.750,.032),si=roundedOutline(1.075,.591,.064);
 slide.add(contourRing(so,si,(u,v)=>slideFn(u,v+1.652),true,9),V3.pearl);
 slide.add(contourRing(si,roundedOutline(1.039,.553,.053),(u,v)=>slideFn(u,v+1.652,.0015),true,3),V3.blackFrit);
 slide.add(rrFace(1.039,.553,.053,(u,v)=>slideFn(u,v+1.652,.003),true,14),V3.rearGlass);
 B(slide,V3.dark,.025,.125,.037,.013,1.166,.481,.012);T(slide,MAT.paintInset,[[.003,1.162,-.574],[.003,1.162,.450]],.004);
 for(let j=0;j<8;j++)B(N.slideWood,j%4?MAT.pine:MAT.wood,.014,.078,1.088,-.082,.693+j*.079,0,.002);
 T(walls,MAT.brushed,[[.942,1.157,-2.43],[.945,1.157,-.302]],.0045);
 await modelPause(0.32,'3Dの部材を準備しています');
 // Wheels: curved silver faces, deep graphite recesses, sidewall lettering omitted.
 for(let x of[-.819,.819])for(let z of[-1.41,1.70]){let s=Math.sign(x);
  C(N.wheels,MAT.rubber,.333,.333,.214,x,.337,z,[0,0,Math.PI/2],80);for(let d of[-.093,.093])N.wheels.add(torusGeo(.274,.058,80,14),MAT.rubber,[x+d,.337,z],[0,Math.PI/2,0]);
  C(N.wheels,V3.dark,.209,.209,.023,x+s*.118,.337,z,[0,0,Math.PI/2],72);N.wheels.add(torusGeo(.200,.012,80,12),MAT.brushed,[x+s*.142,.337,z],[0,Math.PI/2,0]);
  for(let j=0;j<6;j++){let a=j/6*TAU;for(let da of[-.062,.062]){let aa=a+da;T(N.wheels,MAT.brushed,[[x+s*.166,.337+Math.cos(aa)*.060,z+Math.sin(aa)*.060],[x+s*.168,.337+Math.cos(aa)*.166,z+Math.sin(aa)*.166],[x+s*.144,.337+Math.cos(aa)*.199,z+Math.sin(aa)*.199]],.013)}C(N.wheels,MAT.chrome,.009,.009,.010,x+s*.181,.337+Math.cos(a)*.062,z+Math.sin(a)*.062,[0,0,Math.PI/2],16);}
  N.wheels.add(sphereGeo(.025,.070,.070,36,28),MAT.brushed,[x+s*.152,.337,z]);for(let d of[-.105,.105])N.wheels.add(torusGeo(.254,.004,80,8),V3.dark,[x+d,.337,z],[0,Math.PI/2,0]);
 }
 await modelPause(0.37,'3Dの部材を準備しています');
 // Driver/passenger seats sit on the raised engine cover, not directly on the living-space floor.
 let cab=new Node('raised-cab-over-engine-seating',fixed);N.cab=cab;
 B(cab,V3.engine,1.615,.245,.846,0,.785,1.437,.085);B(cab,V3.dark,1.621,.024,.759,0,.911,1.433,.011);
 for(let s of[-1,1]){
  B(cab,V3.dark,.480,.071,.476,s*.501,.941,1.470,.026);
  B(cab,V3.seat,.493,.151,.513,s*.501,1.041,1.472,.069);
  B(cab,V3.seatInsert,.357,.009,.376,s*.501,1.115,1.474,.015);
  B(cab,V3.seat,.487,.602,.166,s*.501,1.363,1.241,.072,[-.10,0,0]);
  B(cab,V3.seatInsert,.327,.445,.024,s*.501,1.379,1.329,.012,[-.10,0,0]);
  for(let xo of[-.075,.075])C(cab,MAT.chrome,.008,.008,.118,s*.501+xo,1.663,1.197,[0,0,0],18);
  B(cab,V3.seat,.250,.209,.159,s*.501,1.753,1.186,.057);
  B(cab,V3.seat,.065,.060,.282,s*.230,1.207,1.379,.025);
  // Belts and latches on the rear of the engine deck remain visible from the cabin.
  T(cab,V3.dark,[[s*.718,.726,1.054],[s*.718,1.385,1.156]],.018);B(cab,MAT.red,.036,.047,.021,s*.270,1.028,1.376,.006);
 }
 B(cab,V3.seat,.340,.153,.465,0,1.041,1.459,.038);
 B(cab,V3.seatInsert,.272,.008,.343,0,1.121,1.475,.009);
 N.seatCentreBack.p=[0,1.094,1.240];B(N.seatCentreBack,V3.seat,.324,.485,.136,0,.250,.003,.043,[-.095,0,0]);
 B(N.seatCentreBack,V3.seatInsert,.255,.363,.020,0,.258,.081,.027,[-.095,0,0]);
 for(let x of[-.17,.17])B(cab,MAT.red,.031,.040,.026,x,1.095,1.34,.005);
 B(cab,V3.engine,1.620,.177,.347,0,1.220,2.117,.067);B(cab,V3.dark,.423,.152,.032,.031,1.253,1.928,.015);
 for(let xx of[-.63,-.18,.18,.63]){B(cab,V3.blackFrit,.109,.068,.013,xx,1.282,1.941,.008);for(let i=0;i<4;i++)B(cab,V3.dark,.096,.004,.015,xx,1.260+i*.015,1.930,0);}
 cab.add(torusGeo(.160,.018,56,12),V3.dark,[-.5,1.367,1.989],[.45,0,0]);B(cab,V3.dark,.099,.069,.030,-.5,1.367,1.989,.016,[.45,0,0]);for(let a of[0,2.2,4.4])T(cab,V3.dark,[[-.5,1.367,1.989],[-.5+Math.cos(a)*.145,1.367+Math.sin(a)*.130,1.989+Math.sin(a)*.063]],.011);
 // Clean dark footwells are lower than the raised seat platform.
 B(cab,V3.dark,1.458,.060,.38,0,.65,2.037,.031);
 N.cabSeatCushionY=1.041;N.engineCoverTopY=.908;
 // Front interior trim and curtain rail echo the supplied real cabin photo.
 B(cab,BUILD_MAT.fresh,1.40,.028,.22,0,1.935,1.887,.011);
 for(let s of[-1,1]){
  B(cab,BUILD_MAT.fresh,.068,.505,.106,s*.776,1.736,2.004,.028,[0,0,s*.14]);
  B(cab,BUILD_MAT.fresh,.072,.188,.276,s*.742,2.012,1.758,.026,[0,0,s*.14]);
 }
 B(cab,MAT.black,.604,.112,.244,.556,1.944,1.080,.024);
 T(cab,MAT.brushed,[[-.76,1.905,1.01],[.76,1.905,1.01]],.007);
 return N;
}


export {Node, buildSculptedExterior, orientGeometry};
