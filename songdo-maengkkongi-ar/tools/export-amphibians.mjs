import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Document,NodeIO} from '@gltf-transform/core';
import validator from 'gltf-validator';
import {makeAmphibian} from '../app/models.mjs';
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../app/assets/models');await fs.mkdir(out,{recursive:true});
const reports=[];
for(const [kind,cute] of [['maeng',false],['toad',false],['om',false],['maeng',true]]){
 const group=makeAmphibian(kind,cute),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),materials=new Map(),nodes=new Map();let triangles=0;
 function acc(type,array){return doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);}
 function visit(object){
  const node=doc.createNode(object.name).setTranslation(object.position.toArray()).setRotation(object.quaternion.toArray()).setScale(object.scale.toArray());nodes.set(object,node);
  if(object.isMesh){
   const geo=object.geometry,m=object.material;
   if(!materials.has(m)){const mat=doc.createMaterial().setBaseColorFactor([...m.color.toArray(),m.opacity]).setMetallicFactor(m.metalness||0).setRoughnessFactor(m.roughness??.5).setDoubleSided(m.side===2);if(m.transparent)mat.setAlphaMode('BLEND');materials.set(m,mat);}
   const primitive=doc.createPrimitive().setMaterial(materials.get(m));
   for(const [key,semantic] of [['position','POSITION'],['normal','NORMAL'],['color','COLOR_0']]){const a=geo.getAttribute(key);if(a)primitive.setAttribute(semantic,acc('VEC3',new Float32Array(a.array)));}
   if(geo.index){primitive.setIndices(acc('SCALAR',new Uint32Array(geo.index.array)));triangles+=geo.index.count/3;}else triangles+=geo.attributes.position.count/3;
   node.setMesh(doc.createMesh().addPrimitive(primitive));
  }
  for(const child of object.children)node.addChild(visit(child));return node;
 }
 scene.addChild(visit(group));
 if(cute){
  const blink=doc.createAnimation('Blink');for(const side of [-1,1]){
   const node=nodes.get(group.getObjectByName(`eye-${side}`));
   const sample=doc.createAnimationSampler().setInput(acc('SCALAR',new Float32Array([0,2.3,2.38,2.48,2.56,4]))).setOutput(acc('VEC3',new Float32Array([1,1,1,1,1,1,1,.12,1,1,.12,1,1,1,1,1,1,1]))).setInterpolation('LINEAR');
   blink.addSampler(sample).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('scale').setSampler(sample));
  }
  const node=nodes.get(group.getObjectByName('vocal-sac')),call=doc.createAnimation('VocalSac');
  const sample=doc.createAnimationSampler().setInput(acc('SCALAR',new Float32Array([0,.35,.65,.9,1.2,1.5,2]))).setOutput(acc('VEC3',new Float32Array([.01,.01,.01,1.4,1.4,1.4,.7,.7,.7,1.4,1.4,1.4,.7,.7,.7,.01,.01,.01,.01,.01,.01]))).setInterpolation('LINEAR');
  call.addSampler(sample).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('scale').setSampler(sample));
 }
 doc.getRoot().setExtras({...group.userData,creator:'상상아트 | 기획·제작 이미숙',notes:'Procedural proportion study. Not a scan or exact conversion of the approved image. Requires biological and visual review. Four front digits, five rear digits, partial rear webbing.'});
 const name=cute?'mascot-seven-prototype.glb':`${kind}-observation-prototype.glb`;await new NodeIO().write(path.join(out,name),doc);
 const bytes=await fs.readFile(path.join(out,name));const report=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:20});
 reports.push({file:name,bytes:bytes.length,triangles,errors:report.issues.numErrors,warnings:report.issues.numWarnings,issues:report.issues.messages,foreDigits:4,hindDigits:5});
}
await fs.writeFile(path.join(out,'validation.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
