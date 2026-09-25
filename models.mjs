import * as T from './vendor/three/three.module.js';
import { mergeGeometries } from './vendor/three/addons/utils/BufferGeometryUtils.js';

// Proportion studies, not scan-derived or taxonomist-approved specimens.
// Forefeet: four digits. Hindfeet: five digits; Kaloula has partial webbing.
const v = a => new T.Vector3(...a);
function rand(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const skinMat = new T.MeshStandardMaterial({vertexColors:true,roughness:.61});
function skinGeometry(scale,kind) {
  const extent=Math.max(...scale),segments=extent>.5?48:extent>.2?24:12;
  const geo=new T.SphereGeometry(1,segments,Math.round(segments*2/3)); geo.scale(...scale);
  const p=geo.attributes.position, colors=[];
  const dark=new T.Color(kind==='om'?'#514a37':kind==='toad'?'#62513e':'#4a3d30');
  const light=new T.Color(kind==='om'?'#9c9170':kind==='toad'?'#ac946d':'#b59b74');
  const belly=new T.Color('#ddc9a5');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)/scale[0],y=p.getY(i)/scale[1],z=p.getZ(i)/scale[2];
    const noise=Math.sin(x*21+Math.sin(z*13)*2)*Math.cos(y*17+z*9)+.5*Math.sin(x*49+y*43+z*33);
    const c=light.clone().lerp(dark,T.MathUtils.smoothstep(noise,-.1,.8));
    const front=Math.max(0,z-.3), low= Math.max(0,.18-y);
    c.lerp(belly,Math.min(1,front*.8+low*1.5));
    colors.push(c.r,c.g,c.b);
    const bump=1+.006*Math.sin(x*91+y*77)*Math.cos(z*89);
    p.setXYZ(i,p.getX(i)*bump,p.getY(i)*bump,p.getZ(i)*bump);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const normals=geo.attributes.normal;
  for(let i=0;i<normals.count;i++){
    const n=new T.Vector3().fromBufferAttribute(normals,i);
    if(n.lengthSq()<.01)n.set(p.getX(i)/(scale[0]**2),p.getY(i)/(scale[1]**2),p.getZ(i)/(scale[2]**2));
    n.normalize();normals.setXYZ(i,n.x,n.y,n.z);
  }
  return geo;
}
function ellipsoid(group,position,scale,kind,material=null,name=''){
  const geo=material?new T.SphereGeometry(1,24,16):skinGeometry(scale,kind);
  if(material)geo.scale(...scale);
  const mesh=new T.Mesh(geo,material||skinMat);mesh.position.set(...position);mesh.name=name;group.add(mesh);return mesh;
}
function limb(group,a,b,r,kind){
  const d=v(b).sub(v(a)),mid=v(a).add(v(b)).multiplyScalar(.5);
  const m=ellipsoid(group,mid.toArray(),[r,d.length()/2+r,r],kind);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;
}
function web(group,base,ends,kind){
  const pos=[];
  for(let i=0;i<ends.length-1;i++){
    const a=v(base),b=v(ends[i]).lerp(a,.5),c=v(ends[i+1]).lerp(a,.5);
    const notch=b.clone().add(c).multiplyScalar(.5).lerp(a,.12);
    for(const t of [a,b,notch,a,notch,c])pos.push(...t.toArray());
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();
  group.add(new T.Mesh(g,new T.MeshStandardMaterial({color:'#a18762',side:T.DoubleSide,roughness:.7})));
}
function feet(group,base,side,hind,kind){
  const n=hind?5:4,ends=[];
  ellipsoid(group,base,[hind?.15:.11,.055,.13],kind);
  for(let j=0;j<n;j++){
    const spread=(j-(n-1)/2)*.10, len=(hind?.29:.22)*(1-Math.abs(j-(n-1)/2)*.14);
    const end=[base[0]+spread,base[1]-.014,base[2]+len];ends.push(end);
    const start=[base[0]+spread*.3,base[1],base[2]];
    limb(group,start,end,.025,kind);
  }
  if(hind)web(group,base,ends,kind);
  group.userData[`${hind?'hind':'fore'}Digits${side}`]=n;
}
function combineSkin(group){
  const pieces=[];group.updateMatrixWorld(true);
  group.traverse(m=>{if(m.isMesh&&m.material===skinMat){const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);pieces.push(g);}});
  const remove=[];group.traverse(m=>{if(m.isMesh&&m.material===skinMat)remove.push(m);});
  remove.forEach(m=>{m.parent.remove(m);m.geometry.dispose();});
  if(pieces.length){const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());group.add(new T.Mesh(merged,skinMat));}
}
export function makeAmphibian(kind='maeng',cute=false){
  const g=new T.Group();g.name=cute?'mascot-seven-study':`${kind}-observation-study`;
  const om=kind==='om',toad=kind==='toad';
  const body=om?[.64,.42,.92]:toad?[.78,.60,.84]:[.85,cute?.83:.70,.78];
  const by=om?.55:toad?.74:cute?.91:.81;
  ellipsoid(g,[0,by,0],body,kind);
  const hy=om?.69:toad?.86:1.02, hz=om?.65:toad?.58:.58;
  if(!cute)ellipsoid(g,[0,hy,hz],[om?.44:.52,om?.27:.34,om?.46:.35],kind);
  else ellipsoid(g,[0,.89,.60],[.58,.43,.32],kind);
  const eyeY=cute?1.28:hy+.20,eyeX=cute?.34:om?.29:.34,eyeZ=cute?.70:hz+.18;
  const irisMat=new T.MeshStandardMaterial({color:'#ad803d',roughness:.3});
  const pupilMat=new T.MeshStandardMaterial({color:'#080b0d',roughness:.09,metalness:.12});
  const glintMat=new T.MeshBasicMaterial({color:'#fff7e4'});
  for(const side of [-1,1]){
    ellipsoid(g,[side*eyeX,eyeY,eyeZ],[cute?.245:.15,cute?.25:.15,.16],kind);
    const eye=new T.Group();eye.name=`eye-${side}`;eye.position.set(side*eyeX,eyeY,eyeZ+.125);g.add(eye);
    ellipsoid(eye,[0,0,0],[cute?.187:.11,cute?.202:.10,.072],kind,irisMat);
    ellipsoid(eye,[0,0,.046],[cute?.153:.091,cute?.166:.047,.048],kind,pupilMat);
    ellipsoid(eye,[-.035,.048,.092],[cute?.039:.019,cute?.043:.019,.012],kind,glintMat);
    const frontA=[side*(om?.38:.58),om?.51:.65,.44],frontB=[side*(om?.61:.77),.27,.65],frontC=[side*(om?.57:.70),.12,.89];
    limb(g,frontA,frontB,om?.085:.12,kind);limb(g,frontB,frontC,.078,kind);feet(g,frontC,side,false,kind);
    const backA=[side*(om?.48:.58),om?.43:.50,-.50],backB=[side*(om?.88:1.0),.27,om?-.67:-.37],backC=[side*(om?.73:.98),.11,om?.38:.02];
    limb(g,backA,backB,om?.23:.24,kind);limb(g,backB,backC,.09,kind);feet(g,backC,side,true,kind);
    if(toad)ellipsoid(g,[side*.51,.99,.29],[.17,.12,.34],kind);
    ellipsoid(g,[side*.12,hy+.045,hz+.335],[.021,.014,.012],kind,pupilMat);
  }
  if(cute){
    ellipsoid(g,[0,.98,.904],[.071,.090,.025],kind,new T.MeshStandardMaterial({color:'#63372a',roughness:.6}));
    ellipsoid(g,[0,.944,.923],[.043,.021,.01],kind,new T.MeshStandardMaterial({color:'#d38e72'}));
  }else{
    const curve=new T.CatmullRomCurve3([v([-.32,hy-.08,hz+.24]),v([0,hy-.11,hz+.365]),v([.32,hy-.08,hz+.24])]);
    g.add(new T.Mesh(new T.TubeGeometry(curve,22,.008,5,false),new T.MeshStandardMaterial({color:'#594834'})));
  }
  const random=rand(toad?94:om?122:37);
  // Discrete bumps on toad, short longitudinal ridges on wrinkled frog.
  for(let i=0;i<(toad?140:om?45:45);i++){
    const a=random()*Math.PI*2,b=random()*1.65;
    const p=[Math.sin(b)*Math.cos(a)*body[0],by+Math.cos(b)*body[1],Math.sin(b)*Math.sin(a)*body[2]];
    if(p[2]>.45)continue;
    const r=toad?.035+random()*.025:.014+random()*.012;
    ellipsoid(g,p,[r,r*.6,om?r*4:r],kind);
  }
  combineSkin(g);
  if(kind==='maeng'){
    const sac=ellipsoid(g,[0,.63,.85],[.23,.18,.13],kind,new T.MeshStandardMaterial({color:'#d7b89a',transparent:true,opacity:.82,roughness:.42}),'vocal-sac');
    sac.scale.setScalar(.01);
  }
  g.userData={...g.userData,species:kind,cute,webbing:'hindfoot partial; forefoot absent',status:'procedural prototype; biological review required'};
  return g;
}

export function animateAmphibian(g,time,{calling=false,reduced=false}={}){
  if(!g)return;
  if(!reduced)g.rotation.z=g.userData.cute?Math.sin(time*.65)*.045:0;
  for(const side of [-1,1]){
    const eye=g.getObjectByName(`eye-${side}`);if(eye)eye.scale.y= !reduced&&time%4.7>4.53?.13:1;
  }
  const sac=g.getObjectByName('vocal-sac');if(sac)sac.scale.setScalar(calling?.7+Math.max(0,Math.sin(time*5))*.8:.01);
}
