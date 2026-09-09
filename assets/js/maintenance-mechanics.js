import * as THREE from 'three';

export function addMechanics({root,components,wheels,chassis,box,cyl,tube,torus}) {
 const g=id=>components.get(id),spin=[],pistons=[],rods=[],valves=[];
 // Separate the inherited merged wheel triangles into four local-axis pivots.
 const wheelPivots=[];
 for(const x of[-.819,.819])for(const z of[-1.41,1.70]){const p=new THREE.Group();p.position.set(x,.337,z);root.add(p);wheelPivots.push(p);}
 wheels.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.geometry.toNonIndexed(),pos=source.getAttribute('position'),norm=source.getAttribute('normal'),uv=source.getAttribute('uv');const buckets=wheelPivots.map(()=>({p:[],n:[],u:[]}));
  for(let i=0;i<pos.count;i+=3){const x=pos.getX(i),z=pos.getZ(i),index=(x>0?2:0)+(z>0?1:0),b=buckets[index],center=wheelPivots[index].position;for(let j=i;j<i+3;j++){b.p.push(pos.getX(j)-center.x,pos.getY(j)-center.y,pos.getZ(j)-center.z);b.n.push(norm.getX(j),norm.getY(j),norm.getZ(j));b.u.push(uv.getX(j),uv.getY(j));}}
  buckets.forEach((b,i)=>{if(!b.p.length)return;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));const m=new THREE.Mesh(geo,mesh.material);m.castShadow=true;wheelPivots[i].add(m);});source.dispose();
 });wheels.visible=false;
 const pivot=(parent,position,axis,ratio=1)=>{const p=new THREE.Group();p.position.set(...position);parent.add(p);spin.push({p,axis,ratio});return p;};
 for(const [x,y,r]of[[0,-.15,.12],[-.18,.16,.085],[.24,.11,.085],[.13,-.18,.07]]){const p=pivot(g('belt'),[x,y,.031],'z');for(let a=0;a<Math.PI;a+=Math.PI/3)box(p,[r*1.6,.011,.01],[0,0,0],'silver',[0,0,a]);}
 for(const child of [...g('radiator').children])if(child.geometry?.type==='BoxGeometry'&&child.geometry.parameters.width===.06)g('radiator').remove(child);
 for(const x of[-.3,.3]){const fan=pivot(g('radiator'),[x,0,-.085],'z',1.5);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;box(fan,[.065,.16,.018],[Math.sin(a)*.085,Math.cos(a)*.085,0],0x556166,[0,0,-a]);}}
 // Engine assembly: shell, sealing plane, rotating crank, reciprocating pistons.
 const block=box(g('block'),[.55,.36,.68],[0,-.025,0]);
 box(g('head'),[.55,.12,.69],[0,0,0]);box(g('gasket'),[.56,.009,.70],[0,0,0],'orange');
 const crank=pivot(g('crank'),[0,-.18,0],'z',-1);cyl(crank,.026,.76,[0,0,0],'silver','z');
 for(let i=0;i<4;i++){const z=-.255+i*.17,phase=(i===0||i===3)?0:Math.PI;
  cyl(g('block'),.073,.29,[0,.03,z],0x839ea1);const p=new THREE.Group();p.position.z=z;g('crank').add(p);cyl(p,.063,.075,[0,0,0],'silver');for(const y of[-.015,.009,.024])torus(p,.064,.003,[0,y,z*0],'dark','y');pistons.push({p,phase});
  const rod=cyl(g('crank'),.013,.21,[0,-.04,z],'orange');rods.push({rod,phase,z});
  const cx=Math.sin(phase)*.063,cy=Math.cos(phase)*.063;cyl(crank,.022,.07,[cx,cy,z],'orange','z');for(const dz of[-.045,.045])box(crank,[.10,.07,.02],[0,cy*.5,z+dz],'dark');
  for(const x of[-.105,.105])for(const dz of[-.034,.034]){const valve=new THREE.Group();valve.position.set(x,0,z+dz);g('cam').add(valve);cyl(valve,.008,.12,[0,-.055,0]);cyl(valve,.025,.008,[0,-.12,0],'orange');for(let y=-.06;y<0;y+=.013)torus(valve,.014,.003,[0,y,0],'silver','y');valves.push({p:valve,phase:phase+(i>1?Math.PI*2:0)+(x<0?0:Math.PI)});}
 }
 for(const x of[-.105,.105]){const cam=pivot(g('cam'),[x,.035,0],'z',.5);cyl(cam,.015,.76,[0,0,0],'silver','z');for(let i=0;i<4;i++)for(const dz of[-.034,.034])cyl(cam,.028,.022,[.014,0,-.255+i*.17+dz],'orange','z');}
 box(g('timing'),[.40,.39,.027],[0,0,0],'dark');for(const [x,y,r]of[[0,-.22,.055],[-.105,.22,.045],[.105,.22,.045]])torus(g('timing'),r,.012,[x,y,.023],'orange');tube(g('timing'),[[0,-.28,.03],[-.16,.22,.03],[.16,.22,.03],[0,-.28,.03]],.009,'dark');
 cyl(g('oil-pump'),.065,.045,[0,0,0],'silver','z');tube(g('oil-pump'),[[0,0,0],[.08,-.09,-.13],[.08,-.09,-.28]],.014);cyl(g('oil-pump'),.067,.02,[.08,-.09,-.28],'dark');
 cyl(g('oil-cooler'),.086,.09,[0,0,0]);for(let y=-.04;y<.05;y+=.013)torus(g('oil-cooler'),.087,.004,[0,y,0],'dark','y');
 tube(g('ventilation'),[[0,0,0],[-.1,.12,-.15],[-.20,.03,-.40]],.018,'black');
 for(let z=-.25;z<.3;z+=.17){tube(g('manifold'),[[0,0,z],[.14,.12,z],[.23,.08,z],[.23,-.12,z]],.033);tube(g('manifold'),[[-.57,0,z],[-.66,-.12,z],[-.72,-.18,0]],.025,'orange');}
 tube(g('manifold'),[[.23,.08,-.27],[.23,.08,.28]],.045,'dark');
 cyl(g('vacuum'),.16,.08,[0,0,0],'dark','z');tube(g('vacuum'),[[0,0,-.04],[.15,-.13,-.26],[.25,-.05,-.70]],.009,'black');cyl(g('vacuum-pump'),.063,.08,[0,0,0]);
 cyl(g('throttle'),.073,.10,[0,0,0],'silver','z');cyl(g('throttle'),.063,.006,[0,0,.053],'orange','z');
 for(let z=-.255;z<.3;z+=.17){cyl(g('ignition'),.012,.12,[0,0,z]);box(g('ignition'),[.047,.04,.045],[0,.08,z],'dark');cyl(g('efi'),.014,.10,[0,0,z]);}cyl(g('efi'),.025,.68,[0,.05,0],'silver','z');
 cyl(g('secondary-air'),.07,.11,[0,0,0],'black');tube(g('secondary-air'),[[0,0,0],[0,-.16,.12],[-.12,-.25,.12]],.019);
 box(g('plate'),[.16,.06,.005],[0,0,0],'silver');for(let i=0;i<3;i++)box(g('plate'),[.12,.003,.006],[0,-.015+i*.016,.004],'dark');
 box(g('tools'),[.10,.035,.23],[0,0,0],'dark');tube(g('tools'),[[0,0,-.10],[0,.10,0],[0,0,.10],[0,-.06,0],[0,0,-.10]],.012);cyl(g('tools'),.012,.24,[0,.02,0],'silver','z');
 // The transfer housing stays still. Shafts and final-drive carriers rotate inside.
 g('transfer').clear();cyl(g('transfer'),.14,.25,[0,0,0],'silver','z');box(g('transfer'),[.26,.23,.20],[.06,0,0]);
 const centre=pivot(g('transfer'),[0,0,0],'z',.5);for(let z=-.08;z<.1;z+=.025)torus(centre,.11,.005,[0,0,z],'orange');box(centre,[.035,.23,.035],[0,0,0],'orange');
 if(g('front-shaft')){const front=pivot(g('front-shaft'),[0,0,0],'z',.5);cyl(front,.026,1.40,[0,0,0],'silver','z');for(const z of[-.66,.66])box(front,[.09,.045,.07],[0,0,z],'orange');}
 if(g('front-diff')){cyl(g('front-diff'),.115,.22,[-.22,0,0],'dark','z');const ax=pivot(g('front-diff'),[0,0,0],'x',.125);cyl(ax,.025,1.51,[0,0,0],'silver','x');for(const x of[-.66,-.34,.34,.66]){for(let i=0;i<4;i++)torus(ax,.045+i*.003,.007,[x+i*.016,0,0],'black','x');}box(ax,[.07,.10,.02],[.5,0,0],'orange');}
 const rear=pivot(g('differential'),[0,0,0],'x',.125);torus(rear,.14,.018,[0,0,0],'orange','x');box(rear,[.035,.23,.035],[0,0,0],'orange');
 for(const x of[-.64,.64]){for(const y of[-.1,.12]){tube(g('front-suspension'),[[x*.53,y,-.18],[x,y,0],[x*.53,y,.19]],.02,'silver');}tube(g('front-suspension'),[[x*.65,-.10,0],[x*.65,-.10,-1.37]],.023,'orange');cyl(g('front-suspension'),.025,.29,[x,.035,0],'blue');}
 tube(g('front-suspension'),[[-.64,-.12,0],[-.60,-.16,.22],[.60,-.16,.22],[.64,-.12,0]],.018,'dark');
 // Pressed channels and flanges are integral to the body, not a separate truck frame.
 chassis.clear();for(const x of[-.59,.59]){tube(g('body-structure'),[[x,-.03,-2],[x,-.03,-1.2],[x,-.08,0],[x,-.03,1.4],[x,-.03,2.50]],.036,'silver');for(const dx of[-.055,.055])box(g('body-structure'),[.025,.012,4.5],[x+dx,-.04,.2]);}
 for(const z of[-1.95,-1.11,-.1,.83,1.97,2.5]){box(g('body-structure'),[1.35,.045,.08],[0,-.055,z]);for(const x of[-.65,.65])box(g('body-structure'),[.14,.009,.17],[x,-.027,z]);}
 for(const x of[-.77,.77]){const b=g('brakes').position;cyl(g('brakes'),.18,.14,[x-b.x,.337-b.y,-1.41-b.z],'dark','x');}
 // Flanges, fasteners, flexible mounts and heat shields following the supplied exploded view.
 for(const z of[.73,.27,-.48,-.95]){torus(g('exhaust-fittings'),.065,.012,[0,-.05,z]);for(const x of[-.075,.075]){cyl(g('exhaust-fittings'),.009,.07,[x,-.05,z],'silver','z');torus(g('exhaust-fittings'),.016,.004,[x,-.05,z+.015],'orange');}}
 for(const z of[.62,-.42,-1.18]){tube(g('exhaust-fittings'),[[0,-.05,z],[.14,-.05,z],[.18,.07,z]],.01);torus(g('exhaust-fittings'),.031,.013,[.18,.10,z],'black');box(g('exhaust-fittings'),[.10,.014,.09],[.18,.15,z]);}
 box(g('exhaust-fittings'),[.34,.008,.64],[0,.13,.72]);for(let z=.44;z<1.05;z+=.06)box(g('exhaust-fittings'),[.33,.007,.008],[0,.14,z],'dark');
 // Continuous engine → front pipe → valve → silencer → tail path (routing schematic).
 g('exhaust').clear();cyl(g('exhaust'),.13,.57,[0,0,.52],'silver','z');tube(g('exhaust'),[[0,0,.80],[0,.03,1.10],[.03,.04,1.44]],.04);tube(g('exhaust'),[[0,0,.24],[0,.01,-.12],[-.22,.02,-.65]],.039);tube(g('dpr'),[[0,0,-.30],[.03,-.02,-.40],[.03,-.02,-.46]],.04);
 const scrCatalyst=cyl(g('scr'),.12,.27,[-1.02,-.08,1.24],'silver','z');scrCatalyst.name='SCR catalyst (schematic separate from urea tank)';tube(g('scr'),[[0,0,0],[-.18,.04,.65],[-1.02,.04,1.24]],.007,'blue');
 tube(g('battery'),[[.07,.17,-.08],[.19,.08,-.16],[.23,-.18,-.18]],.012,'black');tube(g('battery'),[[-.07,.17,.08],[-.20,-.18,.08],[-.55,-.22,.12]],.012,'red');
 const flow=new THREE.Group();root.add(flow);const tracks=[];
 for(const endZ of[1.70,-1.41])for(const x of[-.74,.74]){const points=endZ>0?[[0,.84,1.43],[0,.48,.40],[-.22,.43,.03],[-.22,.37,1.7],[x,.37,1.7]]:[[0,.84,1.43],[0,.48,.40],[0,.39,-1.41],[x,.39,-1.41]];const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));tube(flow,points,.009,endZ>0?'blue':'orange');const dots=[];for(let i=0;i<5;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(.026,10,8),new THREE.MeshBasicMaterial({color:endZ>0?0x1f8db2:0xf6a22b}));flow.add(d);dots.push(d);}tracks.push({curve,dots,front:endZ>0});}flow.visible=false;
 let internal=false,phase=0,engineType='1gd';
 function cutaway(on){internal=on;wheelPivots.forEach(p=>p.visible=!on);for(const id of['engine','block','head','timing'])g(id).traverse(o=>{if(!o.isMesh)return;o.material.wireframe=on;o.material.transparent=on;o.material.opacity=on?.13:1;o.material.depthWrite=!on;o.castShadow=!on;});for(const id of['crank','cam','gasket'])g(id).visible=on;}
 cutaway(false);
 return {cutaway,configure(type){engineType=type;g('vacuum-pump').visible=type!=='gas';cutaway(internal);},update(dt,running,speed,power,is4wd){if(running)phase+=dt*speed*2.4;
  spin.forEach(({p,axis,ratio})=>p.rotation[axis]=phase*ratio);wheelPivots.forEach(p=>p.rotation.x=phase*.125);g('shaft').rotation.z=phase*.5;
  pistons.forEach(({p,phase:offset})=>{const a=phase+offset;p.position.y=-.18+.063*Math.cos(a)+Math.sqrt(.21**2-(.063*Math.sin(a))**2);});
  rods.forEach(({rod,phase:offset,z})=>{const a=phase+offset,x=.063*Math.sin(a),bottom=-.18+.063*Math.cos(a),top=bottom+Math.sqrt(.21**2-x*x);rod.position.set(x/2,(bottom+top)/2,z);rod.rotation.z=Math.asin(x/.21);});
  valves.forEach(({p,phase:offset})=>p.position.y=-.025*Math.max(0,Math.cos(phase*.5+offset)-.5)*2);
  flow.visible=power;tracks.forEach(({curve,dots,front})=>dots.forEach((d,i)=>{d.visible=!front||is4wd;d.position.copy(curve.getPointAt((phase*.035+i/5)%1));}));
 },state:()=>({phase,internal,engineType,wheelAngles:wheelPivots.map(p=>p.rotation.x),camAngle:phase*.5,shaftAngle:phase*.5})};
}
