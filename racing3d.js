'use strict';
// Self-contained WebGL track, vehicle and camera renderer. All geometry uses metres.
const Racing3D=(()=>{
 const TAU=Math.PI*2,HALF=8,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let n=Math.hypot(...a)||1;return a.map(v=>v/n)}};
 function perspective(fov,aspect,n,f){let t=1/Math.tan(fov/2);return new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
 function lookAt(eye,target){let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);}
 function model(x=0,y=0,z=0,yaw=0,roll=0){let c=Math.cos(yaw),s=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);return new Float32Array([c*cr,sr,-s*cr,0,-c*sr,cr,s*sr,0,s,0,c,0,x,y,z,1]);}
 function hex(s){return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);}
 class Geometry{
  constructor(){this.a=[];}
  tri(a,b,c,col){let n=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),color=typeof col==='string'?hex(col):col;for(const p of [a,b,c])this.a.push(...p,...n,...color);return this;}
  quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);return this;}
  box(x,y,z,w,h,l,col,top=col){let x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-l/2,z1=z+l/2;this.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],top);this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col);this.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],col);this.quad([x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],col);this.quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],col);this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],col);return this;}
  cone(x,y,z,r,h,col,segments=24,topR=0){for(let i=0;i<segments;i++){let a=i/segments*TAU,b=(i+1)/segments*TAU;this.quad([x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(b)*r,y,z+Math.cos(b)*r],[x+Math.sin(b)*topR,y+h,z+Math.cos(b)*topR],[x+Math.sin(a)*topR,y+h,z+Math.cos(a)*topR],col);}return this;}
  cylinderX(radius=.32,width=.30,col='#111722',n=16,rim='#bdc9d4'){for(let i=0;i<n;i++){let a=i/n*TAU,b=(i+1)/n*TAU;let p=[-width/2,Math.sin(a)*radius,Math.cos(a)*radius],q=[width/2,p[1],p[2]],r=[width/2,Math.sin(b)*radius,Math.cos(b)*radius],s=[-width/2,r[1],r[2]];this.quad(p,q,r,s,i%4?'#131a23':'#252e39');for(const side of [-1,1]){const x=side*(width/2+.002);this.tri([x,0,0],[x,Math.sin(a)*radius,Math.cos(a)*radius],[x,Math.sin(b)*radius,Math.cos(b)*radius],col);const ri=radius*.62;this.tri([x+side*.004,0,0],[x+side*.004,Math.sin(a)*ri,Math.cos(a)*ri],[x+side*.004,Math.sin(b)*ri,Math.cos(b)*ri],i%2?rim:'#586c85');}}return this;}
 }
 class CanvasView{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.faces=[];this.cache=new Map();this.software=true;}
  begin(eye,target,fov=1.06,sky=[.36,.63,.74],far=1400){this.view=lookAt(eye,target);this.f=this.canvas.height/(2*Math.tan(fov/2));this.sky=sky;this.far=far;this.faces.length=0;const c=this.ctx,w=this.canvas.width,h=this.canvas.height;const gradient=c.createLinearGradient(0,0,0,h*.7);const col=(v)=>`rgb(${v.map(x=>Math.round(x*255)).join(',')})`;gradient.addColorStop(0,col(sky.map(v=>v*.76)));gradient.addColorStop(1,col(sky.map(v=>Math.min(1,v*1.13))));c.fillStyle=gradient;c.fillRect(0,0,w,h);}
  draw(geo,m=model()){
   const a=geo.a,v=this.view,W=this.canvas.width,H=this.canvas.height,light=[-.426,.852,-.298];
   for(let i=0;i<a.length;i+=27){let points=[],allFar=true;for(let j=0;j<3;j++){let k=i+j*9,x=a[k],y=a[k+1],z=a[k+2],wx=m[0]*x+m[4]*y+m[8]*z+m[12],wy=m[1]*x+m[5]*y+m[9]*z+m[13],wz=m[2]*x+m[6]*y+m[10]*z+m[14];let p=[v[0]*wx+v[4]*wy+v[8]*wz+v[12],v[1]*wx+v[5]*wy+v[9]*wz+v[13],-(v[2]*wx+v[6]*wy+v[10]*wz+v[14])];points.push(p);if(p[2]<this.far*1.2)allFar=false;}if(allFar||points.every(p=>p[2]<.22))continue;
    if(points.some(p=>p[2]<.22)){const clipped=[];for(let j=0;j<points.length;j++){const p=points[j],q=points[(j+1)%points.length],inside=p[2]>=.22,next=q[2]>=.22;if(inside)clipped.push(p);if(inside!==next){const t=(.22-p[2])/(q[2]-p[2]);clipped.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,.22]);}}points=clipped;}
    const pp=points.map(p=>[W/2+p[0]/p[2]*this.f,H/2-p[1]/p[2]*this.f]);if(pp.every(p=>p[0]<-2)||pp.every(p=>p[0]>W+2)||pp.every(p=>p[1]<-2)||pp.every(p=>p[1]>H+2))continue;
    const depth=points.reduce((s,p)=>s+p[2],0)/points.length;let nx=a[i+3],ny=a[i+4],nz=a[i+5];let normal=[m[0]*nx+m[4]*ny+m[8]*nz,m[1]*nx+m[5]*ny+m[9]*nz,m[2]*nx+m[6]*ny+m[10]*nz];let lit=.48+.52*Math.abs(V.dot(normal,light));let fog=clamp((depth-this.far*.26)/(this.far*.74),0,1);fog=fog*fog*(3-2*fog);if((geo.layer||0)<-2)fog=0;const color=[0,1,2].map(j=>Math.round(clamp(a[i+6+j]*lit*(1-fog)+this.sky[j]*fog,0,1)*255));this.faces.push({p:pp,z:depth,layer:geo.layer||0,c:`rgb(${color.join(',')})`});
   }
  }
  finish(){const c=this.ctx;this.faces.sort((a,b)=>a.layer-b.layer||b.z-a.z);c.lineJoin='round';c.lineWidth=.45;for(const q of this.faces){c.beginPath();q.p.forEach((p,j)=>j?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=q.c;c.fill();c.strokeStyle=q.c;c.stroke();}}
  disposeGeometry(){}
 }

 class GLView{
  constructor(canvas,preview=false){this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:preview,powerPreference:'high-performance'});if(!gl)return new CanvasView(canvas);this.gl=gl;this.buffers=new Map();const vs=`attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 M;uniform mat4 V;uniform mat4 P;varying vec3 color;varying vec3 world;varying float distanceZ;void main(){vec4 wp=M*vec4(p,1.0);world=wp.xyz;vec3 normal=normalize(mat3(M)*n);float light=.48+.52*abs(dot(normal,normalize(vec3(-.5,1.0,-.35))));color=c*light;vec4 view=V*wp;distanceZ=-view.z;gl_Position=P*view;}`;
   const fs=`precision mediump float;varying vec3 color;varying vec3 world;varying float distanceZ;uniform vec3 fogColor;uniform float fogFar;void main(){float fog=smoothstep(fogFar*.26,fogFar,distanceZ);gl_FragColor=vec4(mix(color,fogColor,fog),1.0);}`;
   function shader(type,src){let sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
   const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,vs));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));this.program=pr;this.loc={};for(const name of ['M','V','P','fogColor','fogFar'])this.loc[name]=gl.getUniformLocation(pr,name);for(const name of ['p','n','c'])this.loc[name]=gl.getAttribLocation(pr,name);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  }
  upload(geo){let b=this.buffers.get(geo);if(!b){b={buffer:this.gl.createBuffer(),count:geo.a.length/9};this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(geo.a),this.gl.STATIC_DRAW);this.buffers.set(geo,b);}return b;}
  begin(eye,target,fov=1.06,sky=[.36,.63,.74],far=1400){const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.V,false,lookAt(eye,target));gl.uniformMatrix4fv(this.loc.P,false,perspective(fov,this.canvas.width/this.canvas.height,.15,6000));gl.uniform3fv(this.loc.fogColor,sky);gl.uniform1f(this.loc.fogFar,far);}
  draw(geo,m=model()){const gl=this.gl,b=this.upload(geo);gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);for(const [name,offset] of [['p',0],['n',12],['c',24]]){gl.enableVertexAttribArray(this.loc[name]);gl.vertexAttribPointer(this.loc[name],3,gl.FLOAT,false,36,offset);}gl.uniformMatrix4fv(this.loc.M,false,m);gl.drawArrays(gl.TRIANGLES,0,b.count);}
  finish(){}
  disposeGeometry(geo){const b=this.buffers.get(geo);if(b){this.gl.deleteBuffer(b.buffer);this.buffers.delete(geo);}}
 }
 const TRACKS=[{id:'volcano',name:'熔脈火山環線',tag:'VOLCANIC RIDGE',description:'高速長彎 · 火山峽谷 · 複合彎道',difficulty:'★★☆',points:[[0,0],[0,260],[140,420],[350,390],[500,260],[530,40],[380,-100],[430,-300],[200,-460],[-40,-380],[-160,-180],[-90,-40]]},{id:'coast',name:'潮汐海岸挑戰',tag:'TIDAL COAST',description:'S彎 · 髮夾彎 · 巨浪濕滑路段',difficulty:'★★★',points:[[0,0],[0,220],[150,360],[360,330],[520,180],[420,20],[600,-140],[470,-350],[240,-380],[150,-220],[-30,-300],[-180,-140],[-80,-40]]}];
 function makeTrack(index){const definition=TRACKS[index],cp=definition.points.map(p=>[p[0],0,-p[1]]),raw=[],count=cp.length*48;function cat(a,b,c,d,t){let t2=t*t,t3=t2*t;return b.map((_,j)=>.5*((2*b[j])+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3));}
  for(let i=0;i<=count;i++){let f=(i%count)/count*cp.length,k=Math.floor(f),n=cp.length;raw.push(cat(cp[(k+n-1)%n],cp[k%n],cp[(k+1)%n],cp[(k+2)%n],f-k));}let length=0;for(let i=0;i<raw.length;i++){if(i)length+=Math.hypot(raw[i][0]-raw[i-1][0],raw[i][2]-raw[i-1][2]);raw[i][1]=0;raw[i].dist=length;}const step=length/count;
  const track={...definition,index,raw,length,step};track.sample=function(dist){dist=((dist%length)+length)%length;let lo=0,hi=raw.length-1;while(hi-lo>1){let mid=(lo+hi)>>1;if(raw[mid].dist<dist)lo=mid;else hi=mid;}const a=raw[lo],b=raw[hi],t=(dist-a.dist)/(b.dist-a.dist||1),p=a.map((v,j)=>v+(b[j]-v)*t),tangent=V.norm(V.sub(b,a));const behind=raw[(lo-2+count)%count],ahead=raw[(lo+2)%count];let v1=V.norm(V.sub(a,behind)),v2=V.norm(V.sub(ahead,b));const curvature=(v1[0]*v2[2]-v1[2]*v2[0])/(step*3);return {p,t:tangent,right:[-tangent[2],0,tangent[0]],heading:Math.atan2(-tangent[0],-tangent[2]),curvature};};return track;
 }
 const palettes=[['#f3f5fc','#2450a4','#f3d345'],['#e64046','#272a38','#ffbf71'],['#f2f2f8','#2466b4','#ffcf4b'],['#e9e4f4','#a64291','#f6a8d2'],['#5d7d70','#182e3d','#a6e2a8'],['#f3cf42','#252e3b','#b7efff'],['#3466b6','#eeead6','#f1b632'],['#344354','#ec8034','#ffd6a0'],['#f4f4f5','#173e7b','#ffd353'],['#f6f1f7','#30224e','#ed6c99']];
 const SHAPES=[
 {label:'長鼻六輪・雙層尾翼',layout:'六輪開放式',width:3.0,length:5.75},
 {label:'四輪包覆・寬體GT艙',layout:'四輪封閉式',width:3.05,length:4.90},
 {label:'三叉車頭・分離前翼',layout:'四輪開放式',width:3.18,length:5.40},
 {label:'雙浮筒・弧形輪罩',layout:'四輪輪罩式',width:3.10,length:5.35},
 {label:'箭形六輪・中央尾鰭',layout:'六輪窄腰式',width:2.95,length:5.90},
 {label:'五輪電磁・單後輪',layout:'五輪三角式',width:3.12,length:5.25},
 {label:'蝶翼車身・雙層鷗翼',layout:'四輪短軸式',width:3.38,length:5.15},
 {label:'楔形GT・高位進氣口',layout:'四輪裝甲式',width:3.0,length:4.95},
 {label:'雙後置引擎・六輪尖翼',layout:'六輪雙渦流式',width:3.45,length:6.05},
 {label:'紫白流線・獨立雙尾翼',layout:'六輪流線式',width:3.40,length:6.10}
 ];
 function carParts(i){const [body,accent,trim]=palettes[i],g=new Geometry(),shadow=new Geometry(),wheels=[],spec=SHAPES[i];
  // Lofted hulls use genuine cross-sections: each model has a separate silhouette.
  function hull(sections,col=body,side=accent){
   const rings=sections.map(([z,w,b,t,x=0])=>[[x-w,b,z],[x+w,b,z],[x+w,b+(t-b)*.72,z],[x+w*.68,t,z],[x-w*.68,t,z],[x-w,b+(t-b)*.72,z]]);
   for(let n=0;n<rings.length-1;n++)for(let k=0;k<6;k++)g.quad(rings[n][k],rings[n+1][k],rings[n+1][(k+1)%6],rings[n][(k+1)%6],k===3?col:k===0?'#152438':side);
   for(const ring of [rings[0],rings[rings.length-1]]){const c=ring.reduce((p,v)=>p.map((q,j)=>q+v[j]/6),[0,0,0]);for(let n=0;n<6;n++)g.tri(c,ring[n],ring[(n+1)%6],side);}
  }
  function plate(points,y,color=body,thickness=.055){g.quad(...points.map(([x,z])=>[x,y,z]),color);g.quad(...points.map(([x,z])=>[x,y-thickness,z]).reverse(),accent);for(let n=0;n<4;n++){let a=points[n],b=points[(n+1)%4];g.quad([a[0],y,a[1]],[a[0],y-thickness,a[1]],[b[0],y-thickness,b[1]],[b[0],y,b[1]],accent);}}
  function fin(x,z,h=.48,l=.7,color=accent,y=.22){g.tri([x,y,z-l/2],[x,y+h,z+l/2],[x,y,z+l/2],color);g.tri([x+.045,y,z-l/2],[x+.045,y,z+l/2],[x+.045,y+h,z+l/2],color);g.quad([x,y+h,z+l/2],[x+.045,y+h,z+l/2],[x+.045,y,z+l/2],[x,y,z+l/2],trim);}
  function canopy(z=-.3,l=1.4,w=.55,h=.44,y=.43){const nr=6,ns=16;for(let a=0;a<nr;a++)for(let n=0;n<ns;n++){const make=(r,k)=>{const phi=r/nr*Math.PI/2,theta=k/ns*TAU;return [Math.cos(theta)*Math.cos(phi)*w/2,y+Math.sin(phi)*h,z+Math.sin(theta)*Math.cos(phi)*l/2];};g.quad(make(a,n),make(a,n+1),make(a+1,n+1),make(a+1,n),n<8?'#28a7c1':'#11607f');}g.box(0,y+h+.006,z-.10,.035,.023,l*.70,'#bcecf1');}
  function wing(z=1.7,span=2.75,y=.9,sweep=.20,col=body,split=false){
   if(split){for(const s of [-1,1]){const cx=s*span*.28,hw=span*.25;plate([[cx-hw,z-.24],[cx+hw,z-.24+sweep],[cx+hw,z+.22+sweep],[cx-hw,z+.22]],y,col);g.box(cx,y-.28,z,.065,.56,.12,accent);fin(cx+s*hw,z+.02,.25,.65,trim,y-.05);}}
   else{plate([[-span/2,z-.25+sweep],[span/2,z-.25+sweep],[span/2,z+.25],[-span/2,z+.25]],y,col);for(const s of [-1,1]){g.box(s*span*.27,y/2,z,.06,y,.13,accent);fin(s*span/2,z,.25,.66,accent,y-.08);}}
  }
  function ringZ(x,y,z,r=.35,depth=.7,col=accent,core='#091729',rim=trim){
   const n=16,inner=r*.68;for(let j=0;j<n;j++){const a=j/n*TAU,b=(j+1)/n*TAU,p=(ang,rad,dz)=>[x+Math.cos(ang)*rad,y+Math.sin(ang)*rad,z+dz];g.quad(p(a,r,-depth/2),p(b,r,-depth/2),p(b,r,depth/2),p(a,r,depth/2),col);for(const end of [-1,1]){const zz=end*depth/2;g.quad(p(a,r,zz),p(a,inner,zz),p(b,inner,zz),p(b,r,zz),rim);g.tri([x,y,z+zz-end*.045],p(a,inner,zz-end*.04),p(b,inner,zz-end*.04),core);}}g.box(x,y,z+depth/2+.008,r*.18,r*.18,.035,'#54b9e7');
  }
  function domeZ(x,y,z,r,color){for(let k=0;k<5;k++)for(let n=0;n<16;n++){const p=(j,m)=>{const a=j/5*Math.PI/2,t=m/16*TAU;return [x+Math.cos(t)*r*Math.cos(a),y+Math.sin(t)*r*Math.cos(a),z-r*.70*Math.sin(a)];};g.quad(p(k,n),p(k,n+1),p(k+1,n+1),p(k+1,n),n===3?'#4d83b1':color);}}
  function vent(x,z,w=.34,l=.65,y=.60){g.box(x,y,z,w,.035,l,'#101e31');for(let n=0;n<5;n++)g.box(x,y+.026,z-l*.36+n*l*.18,w*.85,.017,.023,'#6a829c');}
  function wheel(x,z,front=false,r=.34,rim='#c9b38a'){const wh={x,z,front,radius:r,geo:new Geometry().cylinderX(r,.32,'#111923',16,rim)};wheels.push(wh);g.box(x*.62,.19,z,Math.abs(x)*.75+.05,.055,.075,'#56657a');}
  function pair(z,x=1.12,front=false,r=.34,rim='#c9b38a'){for(const s of [-1,1])wheel(s*x,z,front,r,rim);}
  function fender(s,z0,z1,x,w=.4,top=.72,col=body){hull([[z0,.02,.23,.30,s*x],[z0+.24,w*.9,.23,top*.86,s*x],[z1-.22,w,.23,top,s*x],[z1,.12,.23,top*.65,s*x]],col,col);}
  function lights(x,z,y=.40){g.box(x,y,z,.15,.08,.035,trim);}
  if(i===0){
   hull([[-2.88,.04,.16,.21],[-1.8,.22,.18,.44],[.10,.46,.20,.53],[1.72,.56,.20,.51]],body,accent);canopy(-.10,1.58,.60,.40,.46);
   pair(-1.7,1.04,true,.32);pair(-.88,1.04,true,.32);pair(1.25,1.08,false,.39);
   for(const s of [-1,1]){hull([[-2.65,.04,.13,.19,s*1.35],[-1.98,.23,.16,.38,s*.98],[1.3,.40,.18,.48,s*.68]],body,accent);plate([[s*.2,-2.55],[s*1.44,-2.75],[s*1.28,-2.13],[s*.4,-1.85]],.22,body);vent(s*.68,.78,.37,.62,.52);fin(s*1.18,1.43,.48,.78,accent);lights(s*.85,-2.0);}
   wing(1.85,2.62,.86,.25,body);wing(1.92,2.05,1.03,.18,trim);
  }else if(i===1){
   hull([[-2.45,.75,.16,.36],[-1.75,1.22,.17,.62],[.05,1.25,.18,.69],[1.9,1.13,.19,.61]],body,body);canopy(-.10,1.20,.78,.32,.65);pair(-1.34,1.20,true,.36);pair(1.26,1.20,false,.39);
   hull([[-2.42,.68,.37,.40],[-1.15,.72,.62,.68]],accent,accent);g.box(0,.27,-2.48,1.7,.12,.08,'#111c2c');for(const s of [-1,1]){g.box(s*.84,.48,-2.32,.38,.09,.04,trim);vent(s*.85,.85,.35,.66,.66);fin(s*1.32,1.40,.58,.75,body,.36);ringZ(s*.76,.43,1.98,.22,.20,accent);}wing(1.70,2.85,.92,.04,body);
  }else if(i===2){
   hull([[-2.55,.035,.14,.20],[-.7,.28,.18,.52],[.4,.49,.19,.55],[1.65,.52,.18,.43]],body,accent);canopy(-.38,1.62,.53,.39,.43);pair(-1.30,1.08,true,.34);pair(1.17,1.11,false,.39);
   for(const s of [-1,1]){hull([[-2.68,.025,.12,.22,s*1.43],[-1.65,.36,.18,.57,s*1.00],[.10,.22,.20,.56,s*.67],[1.55,.38,.20,.50,s*.88]],body,accent);plate([[s*.3,-1.86],[s*1.52,-2.55],[s*1.40,-1.96],[s*.55,-1.26]],.24,trim);fin(s*1.48,1.45,.50,.80,body);vent(s*.78,.88,.32,.65,.55);}wing(1.88,2.97,.90,.30,accent,true);
  }else if(i===3){
   hull([[-2.72,.06,.14,.22],[-.55,.31,.18,.50],[.80,.36,.18,.52],[1.86,.24,.18,.37]],body,accent);canopy(-.28,1.44,.53,.40,.43);pair(-1.30,1.14,true,.35);pair(1.24,1.14,false,.36);
   for(const s of [-1,1]){hull([[-2.55,.035,.18,.25,s*.95],[-1.78,.37,.21,.69,s*1.10],[-.72,.31,.22,.57,s*1.16],[.15,.39,.22,.60,s*1.09],[1.65,.43,.23,.76,s*.99],[2.20,.16,.25,.58,s*.93]],body,accent);plate([[s*.28,-.2],[s*1.45,-.72],[s*1.52,.25],[s*.32,.55]],.41,body);vent(s*1.00,.96,.32,.57,.80);ringZ(s*1.00,.51,2.12,.24,.18,accent);}wing(1.82,2.2,.96,-.25,body,true);
  }else if(i===4){
   hull([[-3.00,.03,.16,.25],[-1.30,.19,.18,.56],[.25,.40,.18,.61],[1.85,.52,.19,.59]],body,accent);canopy(-.32,1.72,.47,.40,.49);pair(-1.76,1.02,true,.31);pair(-.92,1.02,true,.31);pair(1.25,1.10,false,.40);
   for(const s of [-1,1]){plate([[s*.16,-2.6],[s*1.40,-2.13],[s*1.17,-1.48],[s*.34,-1.6]],.23,trim);hull([[-.70,.20,.20,.40,s*.66],[.53,.35,.18,.70,s*.81],[1.97,.43,.19,.62,s*.96]],body,accent);vent(s*.83,.78,.38,.72,.73);ringZ(s*.89,.40,2.13,.28,.25,accent);}fin(0,1.02,.77,1.15,trim,.45);wing(1.97,2.72,.80,.38,accent);
  }else if(i===5){
   hull([[-2.57,.04,.16,.21],[-.65,.47,.20,.53],[.63,.85,.19,.48],[1.96,.25,.19,.43]],body,accent);canopy(-.46,1.27,.68,.38,.45);pair(-1.25,1.16,true,.34);pair(.62,1.17,false,.36);wheel(0,1.92,false,.40,'#adcbd9');
   for(const s of [-1,1]){plate([[s*.10,-2.18],[s*1.52,-1.92],[s*1.14,-.92],[s*.38,-.58]],.23,body);hull([[-.17,.19,.20,.51,s*.83],[1.2,.30,.21,.66,s*.83],[1.80,.05,.21,.50,s*.65]],accent,body);ringZ(s*.80,.48,1.56,.30,.22,accent);fin(s*1.30,.95,.42,.88,trim,.36);}wing(1.52,2.48,.92,-.32,body);g.box(0,.64,1.1,.13,.54,.67,trim);
  }else if(i===6){
   hull([[-2.49,.08,.15,.24],[-1.20,.25,.18,.49],[.10,.43,.18,.56],[1.68,.59,.19,.48]],body,accent);canopy(-.18,1.31,.62,.41,.43);pair(-1.17,1.15,true,.35);pair(1.10,1.23,false,.38);
   for(const s of [-1,1]){plate([[s*.23,-1.68],[s*1.63,-2.30],[s*1.49,-1.41],[s*.50,-.62]],.25,accent);plate([[s*.36,-.23],[s*1.56,-.78],[s*1.42,.25],[s*.57,.81]],.46,body);hull([[.0,.18,.22,.41,s*.82],[1.69,.40,.22,.62,s*.98]],body,accent);fin(s*1.52,1.60,.55,.90,trim,.37);}wing(1.93,3.18,.83,.29,body);wing(1.55,2.40,1.08,-.10,trim);
  }else if(i===7){
   hull([[-2.41,.65,.13,.29],[-1.5,1.13,.15,.53],[.40,1.17,.17,.58],[1.91,.91,.18,.49]],body,accent);canopy(-.10,1.10,.74,.31,.54);pair(-1.20,1.17,true,.36);pair(1.16,1.18,false,.39);
   for(const s of [-1,1]){g.box(s*.86,.36,-2.23,.31,.08,.04,trim);plate([[s*.1,-2.47],[s*1.45,-2.13],[s*1.33,-1.75],[s*.48,-1.90]],.18,accent);vent(s*.83,.72,.35,.72,.63);fin(s*1.23,1.24,.48,.68,accent,.34);g.box(s*.82,.43,1.92,.21,.09,.04,'#ff704b');}hull([[.52,.28,.53,.90],[1.21,.23,.52,.83]],accent,body);g.box(0,.83,.50,.44,.15,.04,'#071321');wing(1.83,2.60,.88,.04,accent);
  }else if(i===8){
   // 雷神: blue/white forked front, six wheels and two elevated independent jet nacelles.
   hull([[-2.98,.04,.15,.24],[-1.74,.37,.18,.48],[-.22,.49,.20,.59],[1.88,.45,.21,.56]],body,accent);canopy(-.54,1.88,.64,.43,.49);pair(-1.78,1.27,true,.32,'#c39a56');pair(-.94,1.27,true,.32,'#c39a56');pair(1.30,1.22,false,.42,'#c39a56');
   for(const s of [-1,1]){hull([[-2.90,.03,.14,.22,s*1.65],[-2.02,.34,.52,.68,s*1.15],[-.53,.40,.55,.79,s*1.07],[.26,.16,.24,.56,s*.78]],body,body);plate([[s*.28,-2.28],[s*1.60,-2.79],[s*1.43,-2.25],[s*.53,-1.67]],.20,accent);g.tri([s*.73,.63,-1.91],[s*.98,.71,-1.34],[s*1.09,.61,-1.66],trim);hull([[.15,.24,.22,.55,s*.97],[.83,.44,.23,.72,s*1.10],[2.12,.42,.26,.65,s*1.07]],body,accent);ringZ(s*1.05,1.02,1.33,.42,1.10,accent,'#091729',body);domeZ(s*1.05,1.02,.78,.42,accent);g.box(s*1.05,.63,1.25,.18,.51,.42,body);fin(s*1.55,1.22,.65,.93,body,.39);plate([[s*.61,.99],[s*1.53,1.07],[s*1.55,1.64],[s*.60,1.51]],1.48,body);g.box(s*1.05,1.52,1.28,.70,.035,.13,trim);}g.box(0,.22,1.98,1.15,.16,.15,accent);
  }else if(i===9){
   // 凰呀: violet floating shoulder pods, white flowing front fairings and a long cyan canopy.
   hull([[-3.08,.03,.15,.23],[-1.15,.25,.21,.49],[.35,.43,.23,.62],[2.18,.38,.25,.56]],body,accent);canopy(-.48,2.05,.55,.44,.48);pair(-1.78,1.20,true,.32,'#bb9559');pair(-.96,1.20,true,.32,'#bb9559');pair(1.35,1.21,false,.41,'#bb9559');
   for(const s of [-1,1]){hull([[-3.02,.015,.15,.23,s*1.61],[-2.42,.20,.21,.63,s*1.28],[-1.54,.42,.55,.83,s*1.13],[-.64,.34,.50,.73,s*1.11],[-.04,.15,.25,.48,s*.87]],body,body);g.tri([s*.91,.83,-1.68],[s*1.26,.84,-1.63],[s*1.29,.73,-2.26],accent);plate([[s*.14,-2.83],[s*.43,-1.31],[s*.64,-.77],[s*.30,-1.66]],.37,trim);hull([[.03,.25,.23,.63,s*.84],[.72,.48,.26,.91,s*1.04],[1.86,.45,.28,.86,s*1.08],[2.29,.19,.27,.64,s*.94]],accent,accent);ringZ(s*1.04,.91,1.05,.35,.93,accent);hull([[.15,.08,.60,.95,s*.82],[.67,.14,.59,1.28,s*.93],[1.59,.14,.62,1.23,s*1.07]],body,body);plate([[s*.51,1.42],[s*1.56,1.58],[s*1.57,2.13],[s*.57,1.97]],1.39,accent);g.box(s*1.05,1.43,1.78,.79,.03,.15,body);fin(s*1.59,1.95,.31,.63,body,1.16);vent(s*.96,.48,.29,.48,1.01);}
  }
  for(const s of [-1,1]){g.box(s*.35,.32,2.00,.18,.08,.04,'#ff6f5d');}
  for(let n=0;n<36;n++){let a=n/36*TAU,b=(n+1)/36*TAU;shadow.tri([0,.025,0],[Math.sin(a)*(spec.width/2+.06),.025,Math.cos(a)*(spec.length/2+.05)],[Math.sin(b)*(spec.width/2+.06),.025,Math.cos(b)*(spec.length/2+.05)],'#101923');}shadow.layer=-1;
  const wheelGeo=new Geometry().cylinderX(.34,.32,'#14202a');return {body:g,wheel:wheelGeo,shadow,wheels,spread:spec.width/2,length:spec.length,spec,exhaust:i===8?[[-1.05,1.02,1.93],[1.05,1.02,1.93]]:i===9?[[-1.04,.91,1.57],[1.04,.91,1.57]]:[[-.35,.32,2.03],[.35,.32,2.03]]};
 }

 const cars=Array.from({length:10},(_,i)=>carParts(i));let track=makeTrack(0),scene=null,renderer=null,preview=null,previewCanvas=null,cam=null;
 function offset(s,d,y=.03){return [s.p[0]+s.right[0]*d,y,s.p[2]+s.right[2]*d];}
 function scenery(t){const road=new Geometry(),ground=new Geometry(),structures=new Geometry(),sea=new Geometry(),props=new Geometry();
  if(t.index===1){sea.quad([-5000,-.35,-5000],[-5000,-.35,5000],[5000,-.35,5000],[5000,-.35,-5000],'#2386a3');ground.quad([-3000,-.12,-3000],[-3000,-.12,3000],[100,-.12,3000],[145,-.12,-3000],'#628b63');for(let n=0;n<160;n++){let x=180+(n%10)*48,z=-1600+Math.floor(n/10)*200;structures.box(x,-.28,z,24,.018,1.7,n%3?'#5ab5c5':'#a9e3e7');}}
  else{ground.quad([-4000,-.15,-4000],[-4000,-.15,4000],[4000,-.15,4000],[4000,-.15,-4000],'#514e52');props.cone(230,-.12,30,150,175,'#584852',48,23);props.cone(230,166,30,25,3,'#f07137',36,12);for(let n=0;n<9;n++){let a=n/9*TAU,rx=Math.sin(a),rz=Math.cos(a);props.quad([230+rx*23,169,30+rz*23],[230+rx*30+rz*3,150,30+rz*30-rx*3],[230+rx*145+rz*7,0,30+rz*145-rx*7],[230+rx*140,0,30+rz*140],'#df6538');}for(let n=0;n<6;n++)props.cone(230+n*8,180+n*22,30,20+n*10,30,'#737381',12,24+n*9);}
  for(let i=0;i<t.raw.length-1;i++){let a=t.sample(t.raw[i].dist),b=t.sample(t.raw[i+1].dist-.001);let stripe=Math.floor(t.raw[i].dist/6)%2;road.quad(offset(a,-HALF),offset(b,-HALF),offset(b,HALF),offset(a,HALF),i%2?'#343c49':'#353d49');for(const side of [-1,1]){road.quad(offset(a,side*HALF),offset(b,side*HALF),offset(b,side*(HALF+.65)),offset(a,side*(HALF+.65)),stripe?'#f5ddd1':'#d94b44');if(i%3===0){let pa=offset(a,side*(HALF+.86),.67),pb=offset(b,side*(HALF+.86),.67);const p2=t.sample(t.raw[Math.min(i+3,t.raw.length-1)].dist-.001);pb=offset(p2,side*(HALF+.86),.67);structures.quad(pa,pb,[pb[0],.88,pb[2]],[pa[0],.88,pa[2]],t.index===1?'#d3e4e6':'#a4a7b1');}if(i%9===0){let p=offset(a,side*(HALF+.90),.46);structures.box(p[0],p[1],p[2],.13,.94,.13,'#c8d8dd');}}
   if(Math.floor(t.raw[i].dist/11)%2===0)for(const line of [-1/3,1/3])road.quad(offset(a,HALF*line-.05,.045),offset(b,HALF*line-.05,.045),offset(b,HALF*line+.05,.045),offset(a,HALF*line+.05,.045),'#d5e4e9');

  }
  // Start/finish line only at the real lap boundary.
  const s=t.sample(0),e=t.sample(3);for(let k=0;k<12;k++)road.quad(offset(s,-HALF+k*HALF/6,.055),offset(e,-HALF+k*HALF/6,.055),offset(e,-HALF+(k+1)*HALF/6,.055),offset(s,-HALF+(k+1)*HALF/6,.055),k%2?'#ffffff':'#15202d');
  for(let i=0;i<t.raw.length;i+=22){let s=t.sample(t.raw[i].dist),side=i%2?1:-1,p=offset(s,side*(HALF+20+(i%9)*2),-.1);if(t.index===1&&p[0]<100){props.cone(p[0],0,p[2],2.9,9.5,'#3e775d',8);props.box(p[0],1,p[2],.55,3,.55,'#776e5b');}else if(t.index===0){props.cone(p[0],0,p[2],4+(i%5),4+(i%4),'#6c6263',7);}}
  if(t.index===1)for(let n=0;n<26;n++){const x=130+Math.sin(n*.7)*18,z=-950+n*75;if(t.raw.every(p=>Math.hypot(p[0]-x,p[2]-z)>34))props.cone(x,-8,z,16,17,'#9f9a81',7,8);}
  sea.layer=-4;ground.layer=-3;road.layer=-2;return {road,ground,structures,sea,props};
 }
 // Remove a broad checker pattern: asphalt stays continuous between timing lines.
 function buildScene(){scene=scenery(track);}
 function init(canvas){renderer=new GLView(canvas);buildScene();return track;}
 function choose(index){track=makeTrack(index);cam=null;if(renderer){if(scene)for(const geo of Object.values(scene))renderer.disposeGeometry(geo);buildScene();}return track;}
 function drawVehicle(view,i,p,heading,steer=0,spin=0,roll=0,boost=false,brake=false){const car=cars[i];view.draw(car.shadow,model(p[0],p[1]+.055,p[2],heading));view.draw(car.body,model(p[0],p[1],p[2],heading,roll));const c=Math.cos(heading),s=Math.sin(heading);for(const wh of car.wheels){let wx=p[0]+c*wh.x+s*wh.z,wz=p[2]-s*wh.x+c*wh.z;let m=model(wx,p[1]+(wh.radius||.32),wz,heading+(wh.front?steer:0)); // Wheel spokes rotate around their real axle.
    let cr=Math.cos(spin),sr=Math.sin(spin);const r=new Float32Array(m);for(let j=0;j<4;j++){r[4+j]=m[4+j]*cr+m[8+j]*sr;r[8+j]=-m[4+j]*sr+m[8+j]*cr;}view.draw(wh.geo||car.wheel,r);}
   if(boost){if(!drawVehicle.flame)drawVehicle.flame=new Geometry().cone(0,0,0,.18,1.6,'#70f8ff',7);const flame=drawVehicle.flame;for(const local of car.exhaust){let x=p[0]+c*local[0]+s*local[2],z=p[2]-s*local[0]+c*local[2];let m=model(x,p[1]+local[1],z,heading); // tip follows exhaust direction along local +Z
      m[4]=s;m[5]=0;m[6]=c;m[8]=0;m[9]=-1;m[10]=0;view.draw(flame,m);}}
 }
 const waterPatch=new Geometry().box(0,.055,0,16,.035,70,'#5b9caa'),foamCube=new Geometry().box(0,0,0,2,.3,1.2,'#d2f5f7'),waveMesh=new Geometry();for(let k=0;k<20;k++){let z=(k-10)*3;waveMesh.quad([0,-.3,z],[0,-.3,z+3],[-1.4,2.4,z+3],[-1.4,2.4,z],'#73c2d1');waveMesh.quad([-1.4,2.4,z],[-1.4,2.4,z+3],[-2.1,2.3,z+3],[-2.1,2.3,z],'#e2fcfb');}
 function render(g,selected,dt){if(!renderer)return;const s=track.sample(g.dist),right=s.right,p=V.add(s.p,V.mul(right,g.x*(HALF-1.1))),heading=s.heading-g.yaw;
  const behind=V.sub(p,V.mul(s.t,8.9)),eye=[behind[0],p[1]+2.65+(g.boost>0?.15:0),behind[2]],ahead=track.sample(g.dist+24),look=[ahead.p[0]+right[0]*g.x*5,.65,ahead.p[2]+right[2]*g.x*5];
  const desiredLook=V.sub(look,p);if(!cam)cam={eye:[...eye],look:[...look],direction:[...s.t],lookDirection:[...desiredLook]};const k=1-Math.exp(-dt*10);for(let i=0;i<3;i++){cam.direction[i]+=(s.t[i]-cam.direction[i])*k;cam.lookDirection[i]+=(desiredLook[i]-cam.lookDirection[i])*k;}const direction=V.norm(cam.direction);cam.eye=[p[0]-direction[0]*8.9,p[1]+2.65+(g.boost>0?.15:0),p[2]-direction[2]*8.9];cam.look=V.add(p,cam.lookDirection);const shake=g.collide>0?Math.sin(g.elapsed*70)*.06:0;cam.eye[1]+=shake;
  const sky=track.index===1?[.44,.72,.83]:[.52,.57,.67];renderer.begin(cam.eye,cam.look,(g.boost>0?1.16:1.02),sky,track.index===1?1200:1500);
  renderer.draw(scene.sea);renderer.draw(scene.ground);renderer.draw(scene.props);renderer.draw(scene.road);renderer.draw(scene.structures);
  if(g.wave){let ws=track.sample(g.wave.dist),wp=ws.p,age=g.elapsed-g.wave.at;renderer.draw(waterPatch,model(wp[0],0,wp[2],ws.heading));if(age>=4&&age<10){const d=14-(age-4)*4.4,pp=V.add(wp,V.mul(ws.right,d));renderer.draw(waveMesh,model(pp[0],0,pp[2],ws.heading));for(let k=0;k<17;k++){const off=(k-8)*3;let p2=V.add(pp,V.mul(ws.t,off));renderer.draw(foamCube,model(p2[0],2.3+Math.sin(g.elapsed*8+k)*.16,p2[2],ws.heading));}}}
  const all=g.ai.map(a=>({...a,player:false}));all.push({i:selected,dist:g.dist,lane:g.x,player:true});for(const a of all){if(!a.player&&a.finish!==null)continue;const ss=track.sample(a.dist),pos=V.add(ss.p,V.mul(ss.right,(a.player?g.x:a.lane)*(HALF-1.1)));if(Math.hypot(pos[0]-p[0],pos[2]-p[2])>550)continue;drawVehicle(renderer,a.i,pos,ss.heading-(a.player?g.yaw:(a.vx||0)*.035),a.player?-g.steer*.34:(a.vx||0)*.05,(a.player?g.dist:a.dist)/.32,a.player?-g.steer*Math.min(.045,g.speed*.0001):0,a.player&&g.boost>0,a.player&&g.braking);}
  renderer.finish();
 }
 function previewTo(canvas,i,angle=.72,zoom=1){if(!preview){previewCanvas=document.createElement('canvas');preview=new GLView(previewCanvas,true);}const r=canvas.getBoundingClientRect(),w=Math.max(64,Math.round(r.width||640)),h=Math.max(64,Math.round(r.height||360));canvas.width=w*Math.min(devicePixelRatio||1,1.5);canvas.height=h*Math.min(devicePixelRatio||1,1.5);previewCanvas.width=canvas.width;previewCanvas.height=canvas.height;const radius=7.8*Math.max(1,cars[i].length/5.65)/zoom,eye=[Math.sin(angle)*radius,2.65/zoom,-Math.cos(angle)*radius];preview.begin(eye,[0,.46,-.18],.62,[.037,.064,.10],70);if(!previewTo.stage){previewTo.stage=new Geometry().box(0,-.12,0,13,.2,12,'#16283a','#233449');previewTo.pad=new Geometry().cone(0,-.01,0,3.6,.025,'#34485d',64,3.6);}previewTo.stage.layer=-3;previewTo.pad.layer=-2;preview.draw(previewTo.stage);preview.draw(previewTo.pad);drawVehicle(preview,i,[0,.025,0],0,0,0,0,false);preview.finish();const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(previewCanvas,0,0);}
 function drawMap(canvas,g=null,colors=[]){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,raw=track.raw;let xs=raw.map(p=>p[0]),zs=raw.map(p=>p[2]),minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs),scale=Math.min((w-28)/(maxx-minx),(h-25)/(maxz-minz));const project=p=>[(p[0]-(minx+maxx)/2)*scale+w/2,(p[2]-(minz+maxz)/2)*scale+h/2];c.clearRect(0,0,w,h);c.strokeStyle=track.index===1?'#8cdadf':'#e5a28b';c.lineWidth=4;c.beginPath();raw.forEach((p,i)=>{const q=project(p);i?c.lineTo(...q):c.moveTo(...q);});c.stroke();let start=project(track.sample(0).p);c.fillStyle='#fff';c.fillRect(start[0]-3,start[1]-3,6,6);if(g)for(const a of [...g.ai,{i:g.selected,dist:g.dist,player:true}]){const q=project(track.sample(a.dist).p);c.fillStyle=a.player?'#fff':colors[a.i]||'#7ce5d8';c.beginPath();c.arc(...q,a.player?4.5:2.4,0,TAU);c.fill();}}
 return {TRACKS,HALF,carSpecs:cars.map(c=>({...c.spec,wheels:c.wheels.length,vertices:c.body.a.length/9})),makeTrack,init,choose,render,previewTo,drawMap,get track(){return track;},get available(){return !!renderer;},get software(){return !!renderer?.software;},resetCamera(){cam=null;},sample:d=>track.sample(d)};
})();
