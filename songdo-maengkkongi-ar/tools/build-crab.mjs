import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,dedup,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import validator from 'gltf-validator';
import {limbComponents} from './components.mjs';

const src=process.argv[2] ? path.resolve(process.argv[2]) : null;
if(!src) throw new Error('Usage: node build-crab.mjs /path/to/original-crab.glb');
const outputDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/crab');
await fs.mkdir(outputDirectory,{recursive:true});
process.chdir(outputDirectory);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(src);
const root=doc.getRoot(), mesh=root.listMeshes()[0], prim=mesh.listPrimitives()[0];
const original=prim.getAttribute('POSITION').getArray().slice();
const originalIndices=prim.getIndices().getArray();
const {parent,comps}=limbComponents(original,originalIndices);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const positions=prim.getAttribute('POSITION').getArray();
let moved=0;
for(let i=0;i<positions.length;i+=3){
  const x=original[i],y=original[i+1],z=original[i+2],ax=Math.abs(x);
  // Each walking leg gets its own extension vector. The distal ornaments
  // translate with the joint rather than being stretched across the width.
  const part=parent[i/3]>=0?comps.get(parent[i/3]):null;
  const isWalking=part && part.n>100 && part.y<.4;
  const band=part?.y>.15?0:part?.y>-.07?1:part?.y>-.34?2:3;
  const specs=[{root:.49,end:.70,dx:.50,dy:.13},{root:.49,end:.70,dx:.65,dy:-.03},{root:.49,end:.70,dx:.60,dy:-.34},{root:.49,end:.60,dx:.39,dy:-.64}];
  const spec=specs[band];
  const shift=isWalking?smooth(spec.root,spec.end,ax):0;
  positions[i]=x+Math.sign(x)*shift*spec.dx;
  positions[i+1]=y+shift*spec.dy;
  positions[i+2]=z;
  if(shift>.0001)moved++;
}
// Isolate the original TV pedestal from the portable mascot, without changing source.
const kept=[], stand=[];
for(let i=0;i<originalIndices.length;i+=3){
  let x=0,y=0;
  for(let j=0;j<3;j++){const v=originalIndices[i+j]*3;x+=original[v]/3;y+=original[v+1]/3;}
  const isStand=y<-.355 && Math.abs(x)<.43;
  (isStand?stand:kept).push(originalIndices[i],originalIndices[i+1],originalIndices[i+2]);
}
prim.getIndices().setArray(new Uint32Array(kept));
mesh.setName('SangsangArt_LongLeg_Crab');root.listNodes()[0].setName('SangsangArt_LongLeg_Crab');
console.log(JSON.stringify({sourceTriangles:originalIndices.length/3,removedStandTriangles:stand.length/3,deformedVertices:moved}));
// Recalculate surface normals for the deformed shape.
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(prim.getIndices().getArray(),1));geo.computeVertexNormals();
prim.getAttribute('NORMAL').setArray(geo.getAttribute('normal').array);
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.045,error:.003}),prune(),dedup(),textureCompress({encoder:sharp,resize:[2048,2048],targetFormat:'jpeg',quality:90,chromaSubsampling:'4:4:4'}));
function addTangents(){for(const m of root.listMeshes())for(const p of m.listPrimitives()){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p.getAttribute('POSITION').getArray(),3));g.setAttribute('normal',new THREE.BufferAttribute(p.getAttribute('NORMAL').getArray(),3));g.setAttribute('uv',new THREE.BufferAttribute(p.getAttribute('TEXCOORD_0').getArray(),2));g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(),1));g.computeTangents();p.setAttribute('TANGENT',doc.createAccessor().setType('VEC4').setArray(g.getAttribute('tangent').array).setBuffer(root.listBuffers()[0]));
}}
addTangents();
let triangles=0,vertices=0;
for(const m of root.listMeshes())for(const p of m.listPrimitives()){triangles+=p.getIndices().getCount()/3;vertices+=p.getAttribute('POSITION').getCount();}
root.setExtras({title:'상상아트 긴 다리 보석 게',creator:'기획·제작 상상아트',sourceFile:path.basename(src),notes:'Walking-leg length redesign; original ornament textures preserved. Static mesh; not rigged. Pedestal omitted for AR placement.'});
const output='./sangsang-art-longleg-crab.glb';
await io.write(output,doc);
const bytes=await fs.readFile(output);
const report=await validator.validateBytes(new Uint8Array(bytes),{uri:'sangsang-art-longleg-crab.glb',maxIssues:30});
await fs.writeFile('./validation.json',JSON.stringify(report,null,2));
await fs.writeFile('./model-info.json',JSON.stringify({sourceBytes:(await fs.stat(src)).size,outputBytes:bytes.length,triangles,vertices,errors:report.issues.numErrors,warnings:report.issues.numWarnings,rigged:false},null,2));
console.log(JSON.stringify({output,bytes:bytes.length,triangles,vertices,errors:report.issues.numErrors,warnings:report.issues.numWarnings}));
await io.write('./sangsang-art-longleg-crab-detail.glb',doc);
for(const m of root.listMeshes())for(const p of m.listPrimitives())p.setAttribute('TANGENT',null);
await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.36,error:.006}),prune(),textureCompress({encoder:sharp,resize:[1024,1024],targetFormat:'jpeg',quality:88,chromaSubsampling:'4:4:4'}));
addTangents();await doc.transform(prune());
await io.write(output,doc);
const mobileBytes=await fs.readFile(output);
const mobileReport=await validator.validateBytes(new Uint8Array(mobileBytes),{uri:'sangsang-art-longleg-crab.glb',maxIssues:30});
await fs.writeFile('./validation-mobile.json',JSON.stringify(mobileReport,null,2));
const mobileInfo={bytes:mobileBytes.length,triangles:root.listMeshes().reduce((a,m)=>a+m.listPrimitives().reduce((b,p)=>b+p.getIndices().getCount()/3,0),0),errors:mobileReport.issues.numErrors,warnings:mobileReport.issues.numWarnings};
await fs.writeFile('./model-info-mobile.json',JSON.stringify(mobileInfo,null,2));console.log(JSON.stringify(mobileInfo));
