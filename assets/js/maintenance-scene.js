import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { Node, buildSculptedExterior, orientGeometry } from './hiace-exterior.js';
import { addMechanics } from './maintenance-mechanics.js';

const V = (a) => new THREE.Vector3(...a);
export async function createScene(canvas, parts, onSelect) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .04, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 17;
  controls.enablePan = true;
  controls.maxPolarAngle = Math.PI;
  controls.autoRotateSpeed = .5;
  scene.add(new THREE.HemisphereLight(0xe9faff, 0x68766d, 2.6));
  for (const [pos, intensity] of [[[4,9,5],3.5],[[-6,3,1],2],[[0,-5,0],2]]) {
    const light = new THREE.DirectionalLight(0xffffff,intensity);
    light.position.set(...pos);scene.add(light);
    if(pos[1]===9){light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});light.shadow.bias=-.001;}
  }
  const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
  const ctx=envCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.5,'#c8dfdf');gradient.addColorStop(1,'#657871');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#fff';ctx.fillRect(60,30,60,110);ctx.fillRect(340,30,90,110);
  const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;scene.environment=env;
  const root=new THREE.Group();scene.add(root);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(3.65,3.7,.07,100),new THREE.MeshStandardMaterial({color:0xe5eeea,roughness:.85}));
  floor.position.y=-.047;floor.receiveShadow=true;scene.add(floor);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.63,.006,8,100),new THREE.MeshBasicMaterial({color:0xbacac2}));ring.rotation.x=Math.PI/2;ring.position.y=-.006;floor.add(ring);
  const N={root:new Node('root')};N.car=new Node('van',N.root);
  for(const key of ['fixed','walls','roof','hatch','slide','hatchWood','slideWood','seatCentreBack','wheels'])N[key]=new Node(key,N.car);
  await buildSculptedExterior(N);
  const convert=(node)=>{
    const group=new THREE.Group();group.name=node.name;group.position.set(...node.p);group.rotation.set(...node.r);group.scale.set(...node.s);
    for(const [mat,g] of node.buckets){
      if(!g.i.length)continue;
      orientGeometry(g);
      const buffer=new THREE.InterleavedBuffer(new Float32Array(g.v),8),geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geo.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));geo.setAttribute('uv',new THREE.InterleavedBufferAttribute(buffer,2,6));geo.setIndex(g.i);
      const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...mat.color),roughness:mat.rough??.6,metalness:mat.metal??0,transparent:(mat.alpha??1)<1,opacity:mat.alpha??1,side:THREE.DoubleSide,depthWrite:(mat.alpha??1)>.95});
      material.userData.opacity=material.opacity;
      const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mat.shadow!==false;mesh.receiveShadow=true;group.add(mesh);
    }
    for(const child of node.children)if(child!==N.cab)group.add(convert(child));
    return group;
  };
  const shell=new THREE.Group();root.add(shell);
  for(const key of ['fixed','walls','roof','hatch','slide'])shell.add(convert(N[key]));
  const wheels=convert(N.wheels);root.add(wheels);
  const materials={silver:0xabb9bc,dark:0x303a40,black:0x19232a,orange:0xd49b4b,yellow:0xf4ca40,red:0xc95a48,blue:0x5e919e};
  const mat=(color,metal=.45)=>new THREE.MeshStandardMaterial({color:materials[color]??color,roughness:.43,metalness:metal});
  const box=(parent,size,pos,color='silver',rotation=[0,0,0])=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));mesh.position.set(...pos);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const cyl=(parent,r,length,pos,color='silver',axis='y',r2=r)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,length,24),mat(color));mesh.position.set(...pos);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const tube=(parent,points,r=.025,color='silver')=>{
    const curve=new THREE.CatmullRomCurve3(points.map(V));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,40,r,8,false),mat(color));mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const torus=(parent,r,thickness,pos,color='silver',axis='z')=>{
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,thickness,12,40),mat(color));mesh.position.set(...pos);if(axis==='x')mesh.rotation.y=Math.PI/2;if(axis==='y')mesh.rotation.x=Math.PI/2;parent.add(mesh);return mesh;
  };
  const chassis=new THREE.Group();root.add(chassis);
  for(const x of[-.59,.59])box(chassis,[.08,.13,4.68],[x,.36,0],'dark');
  for(const z of[-2.3,-1.4,-.4,.8,1.68,2.3])box(chassis,[1.35,.09,.09],[0,.36,z],'dark');
  const floorPanels=new THREE.Group();root.add(floorPanels);
  box(floorPanels,[1.73,.03,3.44],[0,.62,-.79],0xc7d2ce);
  for(let x=-.78;x<.8;x+=.09)box(floorPanels,[.018,.008,3.37],[x,.639,-.79],0xa8b6b5);
  const seats=new THREE.Group(),seatLid=new THREE.Group();root.add(seats,seatLid);seatLid.position.set(.26,.92,1.04);
  box(seatLid,[1.05,.05,.84],[0,0,.40],'dark');
  function seat(parent,x,z=0){
    box(parent,[.46,.12,.47],[x,.10,z+.39],0x434b50);box(parent,[.45,.55,.13],[x,.43,z+.13],0x434b50,[-.1,0,0]);box(parent,[.24,.18,.13],[x,.80,z+.08],0x434b50);
    for(const dx of[-.07,.07])cyl(parent,.008,.13,[x+dx,.68,z+.08]);
  }
  seat(seatLid,.25);seat(seatLid,-.22);
  seats.position.set(-.52,.92,1.04);seat(seats,0);
  const dash=new THREE.Group();root.add(dash);box(dash,[1.58,.18,.35],[0,1.21,2.1],'dark');torus(dash,.15,.015,[-.50,1.35,1.9],'black');
  // Vehicle coordinates: +X = vehicle left, +Z = front, +Y = up.
  const components=new Map();
  for(const p of parts){const group=new THREE.Group();group.name=p.id;group.position.set(...p.position);group.userData.base=group.position.clone();group.userData.part=p.id;components.set(p.id,group);root.add(group);}
  const g=id=>components.get(id);
  box(g('engine'),[.57,.43,.7],[0,-.10,0]);box(g('engine'),[.62,.075,.75],[0,.16,0],'dark');
  for(let z=-.28;z<=.3;z+=.14){box(g('engine'),[.60,.018,.014],[0,.203,z],0x7e8c91);for(const x of[-.27,.27])cyl(g('engine'),.017,.018,[x,.22,z]);}
  cyl(g('engine'),.05,.023,[.14,.218,.22],'black');box(g('engine'),[.46,.10,.56],[0,-.34,0],'black');
  const textCanvas=document.createElement('canvas');textCanvas.width=256;textCanvas.height=128;const tc=textCanvas.getContext('2d');tc.fillStyle='#263238';tc.fillRect(0,0,256,128);tc.fillStyle='#e1e9e7';tc.font='bold 38px sans-serif';tc.textAlign='center';tc.fillText('D-4D',128,74);const labelTexture=new THREE.CanvasTexture(textCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;const engineLabel=new THREE.Mesh(new THREE.PlaneGeometry(.30,.15),new THREE.MeshBasicMaterial({map:labelTexture}));engineLabel.rotation.x=-Math.PI/2;engineLabel.position.set(0,.21,-.04);g('engine').add(engineLabel);
  cyl(g('filter'),.08,.18,[0,0,0],'dark');cyl(g('filter'),.085,.02,[0,.10,0]);
  const belt=g('belt');for(const [x,y,r]of[[0,-.15,.12],[-.18,.16,.085],[.24,.11,.085],[.13,-.18,.07]]){cyl(belt,r,.04,[x,y,0],'black','z');cyl(belt,r*.45,.05,[x,y,.008]);}
  tube(belt,[[0,-.27,.026],[-.21,-.13,.026],[-.26,.16,.026],[-.18,.24,.026],[.24,.20,.026],[.33,.1,.026],[.2,-.22,.026],[0,-.27,.026]],.018,'black');
  for(const x of[-.04,.89]){cyl(g('mount'),.07,.09,[x,0,0],'black');box(g('mount'),[.16,.035,.22],[x,.07,0]);}
  cyl(g('air'),.17,.35,[0,0,0],'black','z');for(let z=-.16;z<.18;z+=.07)torus(g('air'),.17,.01,[0,0,z],'dark');tube(g('air'),[[0,.1,-.15],[0,.3,-.25],[-.36,.3,-.45]],.07,'black');
  torus(g('turbo'),.12,.068,[0,0,0]);cyl(g('turbo'),.085,.15,[0,0,.12],'silver','z');cyl(g('turbo'),.066,.154,[0,0,.13],'black','z');tube(g('turbo'),[[0,.12,0],[.03,.27,0],[.20,.30,.15]],.048);
  box(g('intercooler'),[.54,.09,.31],[0,0,0]);for(let z=-.13;z<.14;z+=.025)box(g('intercooler'),[.53,.012,.006],[0,.055,z],'dark');tube(g('intercooler'),[[-.29,0,0],[-.48,-.02,-.09],[-.48,-.27,-.2]],.048,'black');
  for(let i=0;i<4;i++){const z=-.24+i*.16;cyl(g('injector'),.02,.19,[0,0,z]);box(g('injector'),[.055,.05,.05],[0,.12,z],'black');tube(g('injector'),[[0,.09,z],[.09,.15,z],[.17,.1,z]],.007);cyl(g('glow'),.009,.085,[0,0,z]);}cyl(g('injector'),.028,.65,[.17,.10,0],'silver','z');
  box(g('scv'),[.15,.15,.17],[0,0,0]);cyl(g('scv'),.045,.09,[.11,0,0],'dark','x');tube(g('scv'),[[.06,.09,0],[.1,.18,-.1],[-.10,.3,-.26]],.009);
  cyl(g('fuel-filter'),.09,.19,[0,0,0]);cyl(g('fuel-filter'),.08,.04,[0,.13,0],'black');tube(g('fuel-filter'),[[0,.15,0],[.12,.17,0],[.13,.1,.35]],.013,'black');
  box(g('egr'),[.13,.11,.14],[0,0,0]);cyl(g('egr'),.06,.14,[0,.1,0],'black');for(let z=-.21;z<.3;z+=.15)tube(g('egr'),[[.08,0,z],[.16,-.05,z],[.18,-.16,z]],.029);
  box(g('egr-cooler'),[.13,.14,.34],[0,0,0]);tube(g('egr-cooler'),[[0,0,.17],[0,.15,.24],[.11,.15,.24]],.025);
  box(g('radiator'),[1.18,.48,.06],[0,0,0],'dark');for(let x=-.53;x<.55;x+=.03)box(g('radiator'),[.007,.43,.07],[x,0,0]);for(const x of[-.3,.3]){torus(g('radiator'),.19,.012,[x,0,-.08],'black');for(let i=0;i<7;i++)box(g('radiator'),[.06,.32,.018],[x,0,-.085],0x556166,[0,0,i*Math.PI/7]);}
  tube(g('radiator'),[[-.57,.18,0],[-.67,.17,-.10],[-.64,.20,-.47],[-.32,.13,-.61]],.04,'black');
  cyl(g('water-pump'),.095,.12,[0,0,0],'silver','z');cyl(g('water-pump'),.08,.04,[0,0,.09],'black','z');
  cyl(g('alternator'),.115,.19,[0,0,0],'silver','z');for(let a=0;a<Math.PI*2;a+=.4)box(g('alternator'),[.017,.055,.14],[Math.sin(a)*.10,Math.cos(a)*.10,0],'black',[0,0,-a]);cyl(g('alternator'),.065,.035,[0,0,.12],'black','z');
  box(g('battery'),[.24,.25,.30],[0,0,0],'black');box(g('battery'),[.25,.025,.31],[0,.14,0],'dark');box(g('battery'),[.07,.035,.09],[-.07,.17,.08],'red');box(g('battery'),[.05,.025,.06],[.07,.17,-.08]);tube(g('battery'),[[-.07,.18,.08],[-.12,.19,.17],[-.2,.1,.20]],.012,'red');
  cyl(g('starter'),.065,.22,[0,0,0],'dark','z');cyl(g('starter'),.04,.13,[.07,.04,0]);cyl(g('ac'),.09,.21,[0,0,0],'silver','z');cyl(g('ac'),.10,.04,[0,0,.14],'black','z');
  cyl(g('transmission'),.25,.21,[0,0,.33],'silver','z',.18);cyl(g('transmission'),.16,.70,[0,0,-.1],'silver','z',.10);box(g('transmission'),[.32,.055,.5],[0,-.13,0],'black');for(let z=-.32;z<.35;z+=.085)torus(g('transmission'),.15,.009,[0,0,z]);
  cyl(g('shaft'),.04,1.59,[0,0,0],'dark','z');for(const z of[-.74,.74]){cyl(g('shaft'),.075,.07,[0,0,z],'silver','z');box(g('shaft'),[.13,.065,.1],[0,0,z],'silver');}
  const diff=new THREE.Mesh(new THREE.SphereGeometry(.18,24,16),mat('dark'));diff.scale.set(1,.85,1.2);g('differential').add(diff);cyl(g('differential'),.055,1.5,[0,0,0],'dark','x');
  cyl(g('transfer'),.15,.25,[0,0,0]);tube(g('transfer'),[[0,0,0],[-.08,-.07,.3],[-.15,-.07,1.35]],.03,'dark');cyl(g('transfer'),.055,1.4,[.22,-.09,1.55],'dark','x');cyl(g('transfer'),.13,.20,[.22,-.09,1.55],'dark','z');
  cyl(g('dpr'),.16,.5,[0,0,0],'silver','z');for(const z of[-.25,.25])cyl(g('dpr'),.07,.12,[0,0,z],'silver','z',.16);for(const z of[-.2,.2])torus(g('dpr'),.165,.009,[0,0,z]);
  cyl(g('exhaust-valve'),.067,.12,[0,0,0],'silver','z');box(g('exhaust-valve'),[.12,.09,.09],[.09,.025,0],'black');
  box(g('exhaust-sensors'),[.085,.06,.05],[0,0,0],'black');for(const z of[-.13,.13])tube(g('exhaust-sensors'),[[0,-.02,z/3],[0,-.09,z],[.17,-.1,z]],.006,'dark');
  cyl(g('fuel-addition'),.02,.10,[0,0,0]);box(g('fuel-addition'),[.05,.045,.05],[0,.06,0],'black');
  box(g('scr'),[.30,.26,.39],[0,0,0],'dark');cyl(g('scr'),.04,.025,[0,.14,.10],'blue');
  cyl(g('exhaust'),.13,.57,[0,0,0],'silver','z');tube(g('exhaust'),[[0,0,-.28],[0,0,-.45],[-.23,0,-.63]],.045);tube(g('exhaust'),[[0,0,.28],[0,0,.54],[-.06,.02,.75],[-.06,.03,1.39]],.042);tube(g('dpr'),[[0,0,.30],[0,.1,.58],[0,.26,.88]],.045);
  box(g('tank'),[.52,.24,1.08],[0,0,0],'black');for(const z of[-.35,.35])box(g('tank'),[.54,.025,.045],[0,-.132,z]);
  for(const x of[0,-1.54]){cyl(g('brakes'),.205,.025,[x,0,0],'silver','x');box(g('brakes'),[.10,.18,.12],[x,.03,.16],'red');cyl(g('brakes'),.06,.08,[x,0,0],'dark','x');}
  cyl(g('steering'),.045,1.18,[0,0,0],'silver','x');for(const x of[-.50,.50]){for(let i=-3;i<4;i++)torus(g('steering'),.043,.007,[x+i*.015,0,0],'black','x');tube(g('steering'),[[x,0,0],[x*1.45,-.03,-.1]],.015);}
  for(const x of[0,1.3]){for(let i=0;i<4;i++)tube(g('suspension'),[[x,-.06+i*.01,-.58+i*.06],[x,-.11+i*.01,0],[x,-.06+i*.01,.58-i*.06]],.015,'dark');cyl(g('suspension'),.033,.34,[x,.07,0],'orange');}
  for(const x of[-.64,.64]){tube(chassis,[[x,.35,1.42],[x*.45,.32,1.65],[x,.35,1.95]],.032,'dark');cyl(chassis,.035,.30,[x,.49,1.64],'orange');tube(chassis,[[x,.31,1.62],[x,.32,.4]],.023,'dark');}
  const dipstick=new THREE.Group();dipstick.position.set(.26,.14,.14);g('engine').add(dipstick);cyl(dipstick,.004,.30,[0,-.10,0]);torus(dipstick,.028,.009,[0,.065,0],'yellow');
  const force=new THREE.Group();root.add(force);const forcePath=new THREE.CatmullRomCurve3([[0,.8,1.4],[0,.55,.6],[0,.41,-.45],[0,.39,-1.41],[.74,.40,-1.41]].map(V));
  const flowTrack=new THREE.Mesh(new THREE.TubeGeometry(forcePath,60,.010,6,false),new THREE.MeshBasicMaterial({color:0xedb93c,transparent:true,opacity:.7}));force.add(flowTrack);
  for(let i=0;i<8;i++)force.add(new THREE.Mesh(new THREE.SphereGeometry(.036,12,8),new THREE.MeshBasicMaterial({color:0xffc92d})));
  const mechanics=addMechanics({root,components,wheels,chassis,box,cyl,tube,torus});
  let running=!reduced.matches,motionSpeed=1,is4wd=true,internalView=false;
  const internalIds=['engine','block','head','gasket','crank','cam','timing','oil-pump','injector','glow','ignition'];
  function setCutaway(on){internalView=on;mechanics.cutaway(on);document.getElementById('engine-cutaway').setAttribute('aria-pressed',String(on));if(on){powerOn=false;document.getElementById('power-flow').setAttribute('aria-pressed','false');setView('engine');move([1.7,1.65,3.1],[0,.88,1.43]);}}
  let active='engine',view='exterior',available=parts,transition=null,opening=0,explosion=0,ghost=1,allPins=false,powerOn=false,currentStep=-1;
  const pins=document.getElementById('hotspots'),pinMap=new Map(),lineMap=new Map();
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('hotspot-lines');svg.setAttribute('aria-hidden','true');pins.append(svg);
  for(const p of parts){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke','#597577');line.setAttribute('stroke-width','1');line.setAttribute('opacity','.55');svg.append(line);lineMap.set(p.id,line);}
  for(const p of parts){const b=document.createElement('button');b.className='hotspot';b.dataset.recordPartId=p.id;b.setAttribute('aria-label',p.name+'を選ぶ');const n=document.createElement('b');n.textContent=String(parts.indexOf(p)+1).padStart(2,'0');const t=document.createElement('span');t.textContent=p.name;b.append(n,t);b.addEventListener('click',()=>onSelect(p.id));pins.append(b);pinMap.set(p.id,b);}
  const poses={exterior:{p:[7,3.65,8],t:[0,.95,0]},engine:{p:[4.5,4,5],t:[0,.82,1.45]},underbody:{p:[3.2,-4.5,4.7],t:[0,.36,0]},xray:{p:[6,3.3,7],t:[0,.7,0]},explode:{p:[7,4.6,8],t:[0,.7,0]}};
  function move(p,t){transition={from:camera.position.clone(),fromT:controls.target.clone(),to:V(p),toT:V(t),start:performance.now(),duration:reduced.matches?0:900};}
  function setView(key){view=key;currentStep=-1;document.getElementById('explore').dataset.view=key;controls.autoRotate=false;const pose=poses[key];move(pose.p,pose.t);document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));document.getElementById('view-label').textContent=({exterior:'01 / 外観',engine:'02 / 座席下点検口',underbody:'03 / 床下',xray:'04 / 透視',explode:'05 / 配置を分解'})[key];}
  function select(id,focus=true){active=id;currentStep=-1;pinMap.forEach((b,k)=>b.classList.toggle('active',k===id));if(focus){const p=parts.find(p=>p.id===id);setView(p.view);const position=components.get(id).position;const offset=p.view==='engine'?[3.2,2.8,3.4]:[3.4,-3.2,3.5];move(position.clone().add(V(offset)).toArray(),position.toArray());}}
  function configure(list,engine){available=list;is4wd=list.some(p=>p.id==='transfer');for(const p of parts){components.get(p.id).visible=list.some(a=>a.id===p.id);}mechanics.configure(engine);tc.clearRect(0,0,256,128);tc.fillStyle='#263238';tc.fillRect(0,0,256,128);tc.fillStyle='#e1e9e7';tc.fillText(engine==='gas'?'VVT-i':'D-4D',128,74);labelTexture.needsUpdate=true;}
  function resize(){const rect=canvas.parentElement.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
  const ro=new ResizeObserver(resize);ro.observe(canvas.parentElement);resize();camera.position.set(...poses.exterior.p);controls.target.set(...poses.exterior.t);controls.update();
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];transition=null;});
  canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||view==='exterior')return;const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects([...components.values()].filter(o=>o.visible),true);if(hits[0]){let object=hits[0].object;while(object&&!object.userData.part)object=object.parent;if(object)onSelect(object.userData.part);}});
  const visibleObserver=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;});let inView=true;visibleObserver.observe(canvas);
  let last=performance.now(),raf=0;
  function frame(now){raf=requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;if(document.hidden||!inView)return;
    if(transition){const t=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1,e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.fromT,transition.toT,e);if(t===1)transition=null;}
    const k=reduced.matches?1:1-Math.exp(-dt*5);
    const lidTarget=view==='engine'||view==='explode'?1:0;
    opening=THREE.MathUtils.lerp(opening,active==='engine'&&currentStep===3?0:lidTarget,k);seatLid.rotation.x=-opening*1.5;
    dipstick.position.y=THREE.MathUtils.lerp(dipstick.position.y,active==='engine'&&currentStep===2?.45:.14,k);
    force.visible=false;mechanics.update(dt,running,motionSpeed,powerOn&&view!=='exterior',is4wd);
    explosion=THREE.MathUtils.lerp(explosion,view==='explode'?1:0,k);
    ghost=THREE.MathUtils.lerp(ghost,view==='exterior'?1:view==='engine'?.07:view==='xray'?.12:0,k);
    shell.visible=ghost>.008;shell.traverse(o=>{if(!o.isMesh)return;o.material.transparent=ghost<.99||o.material.userData.opacity<1;o.material.opacity=o.material.userData.opacity*ghost;o.material.depthWrite=ghost>.95&&o.material.userData.opacity>.95;o.castShadow=ghost>.9;});
    floor.visible=view==='exterior';floorPanels.visible=view==='exterior';seats.visible=(view==='exterior'||view==='engine'||view==='explode')&&!(internalView&&view==='engine');seatLid.visible=seats.visible;dash.visible=view==='exterior';
    if(internalView&&view==='engine')shell.visible=false;
    for(const p of parts){const visible=available.some(a=>a.id===p.id);g(p.id).visible=visible&&(!(internalView&&view==='engine')||(internalIds.includes(p.id)&&p.id!=='engine'))&&(!['crank','cam','gasket'].includes(p.id)||internalView);}
    const usedRects=[];const rect=canvas.getBoundingClientRect();
    for(const p of parts){const group=components.get(p.id),base=group.userData.base;const categoryOffset={engine:[0,.4,0],intake:[.52,.28,.1],cooling:[-.5,.15,.48],drive:[0,-.45,0],exhaust:[-.5,-.1,0],chassis:[.2,-.15,0]}[p.category];group.position.copy(base).addScaledVector(V(categoryOffset),explosion);
      group.traverse(o=>{if(o.isMesh&&o.material.emissive){o.material.emissive.setHex(active===p.id&&view!=='exterior'?0x74531c:0);o.material.emissiveIntensity=currentStep>=0?.7:.4;}});
      const b=pinMap.get(p.id),line=lineMap.get(p.id);line.style.display='none';
      const major=['engine','transmission','differential','dpr','battery','radiator','brakes','tank','turbo'];
      const shown=group.visible&&view!=='exterior'&&(view!=='engine'||p.view==='engine')&&(allPins||p.id===active||major.includes(p.id));b.hidden=!shown;if(!shown)continue;
      const screen=group.position.clone().project(camera);if(screen.z>1||screen.z<-1||Math.abs(screen.x)>.93||Math.abs(screen.y)>.85){b.hidden=true;continue;}
      const px=(screen.x*.5+.5)*rect.width,py=(-screen.y*.5+.5)*rect.height;
      const verbose=p.id===active||['engine','transmission','differential','dpr','battery','radiator'].includes(p.id);b.classList.toggle('compact',!verbose);
      const width=verbose?150:28;let y=py;for(let n=0;n<8&&usedRects.some(r=>Math.abs(px-r.x)<(width+r.w)/2&&Math.abs(y-r.y)<31);n++)y+=32;
      if(y>rect.height-35){b.hidden=true;continue;}usedRects.push({x:px,y,w:width});b.style.left=px+'px';b.style.top=y+'px';
      if(Math.abs(y-py)>5){line.style.display='';line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('y1',py);line.setAttribute('y2',y);}
    }
    controls.update(dt);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);document.getElementById('fallback').hidden=false;canvas.hidden=true;pins.hidden=true;});
  document.getElementById('explore').dataset.view='exterior';
  return {setView,select,configure,motion(on){running=on;},speed(value){motionSpeed=value;},cutaway:setCutaway,step(index){if(index===0||view==='exterior')setView(parts.find(p=>p.id===active).view);currentStep=index;},showAllPins(on){allPins=on;if(view==='exterior')setView('xray');},power(on){powerOn=on;if(on)setView('underbody');},rotate(on){controls.autoRotate=on&&!reduced.matches;transition=null;},reset(){powerOn=false;document.getElementById('power-flow').setAttribute('aria-pressed','false');setView('exterior');},getState(){return{view,active,opening,running,motionSpeed,is4wd,dashboardVisible:dash.visible,batteryPosition:g('battery').userData.base.toArray(),enginePosition:g('engine').userData.base.toArray(),parts:available.length,meshes:renderer.info.render.calls,...mechanics.state()};}};
}
