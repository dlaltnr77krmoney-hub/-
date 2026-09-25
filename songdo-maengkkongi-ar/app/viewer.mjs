import * as T from './vendor/three/three.module.js';
import {OrbitControls} from './vendor/three/addons/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/three/addons/environments/RoomEnvironment.js';
import {makeAmphibian,animateAmphibian} from './models.mjs';
let crabPromise;
export function crabModel(){return crabPromise??=new GLTFLoader().loadAsync('./assets/crab.glb').then(g=>g.scene).catch(e=>{crabPromise=null;throw e;});}
export class Viewer{
 constructor(host,{kind='maeng',cute=false,angle=.35,interactive=true,transparent=false}={}){
  this.host=host;this.dead=false;this.reduced=false;this.calling=false;
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;host.append(this.renderer.domElement);
  this.scene=new T.Scene();const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();this.scene.environment=this.environment;
  this.camera=new T.PerspectiveCamera(34,1,.01,100);
  this.scene.environmentIntensity=.5;this.scene.add(new T.HemisphereLight('#fff7e3','#6d7a60',.9));const sun=new T.DirectionalLight('#fff4dd',1.5);sun.position.set(-3,6,5);this.scene.add(sun);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.enabled=interactive;this.controls.minDistance=1.8;this.controls.maxDistance=24;
  this.ready=this.load(kind,cute,angle);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  this.renderer.setAnimationLoop(t=>{if(this.dead)return;this.controls.update();if(kind!=='crab')animateAmphibian(this.model,t/1000,{calling:this.calling,reduced:this.reduced});this.renderer.render(this.scene,this.camera);});
 }
 async load(kind,cute,angle){
  try{
   let model=kind==='crab'?(await crabModel()).clone(true):makeAmphibian(kind,cute);if(this.dead)return;
   this.model=model;const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
   const normalizer=new T.Group();normalizer.add(model);if(kind==='crab'){const center=box.getCenter(new T.Vector3());model.position.sub(center);const scale=2.1/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);model.position.multiplyScalar(scale);}
   else model.position.y=-.75;
   normalizer.rotation.y=kind==='crab'?0:angle;this.scene.add(normalizer);this.normalizer=normalizer;this.fitted=false;this.resize();this.host.querySelector('.stage-loading')?.remove();
  }catch(e){const n=this.host.querySelector('.stage-loading');if(n)n.textContent='3D를 불러오지 못했어요. 새로고침해 주세요.';throw e;}
 }
 resize(){const w=this.host.clientWidth||300,h=this.host.clientHeight||300;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const distance=Math.max(1.95,2.65/this.camera.aspect)/(2*Math.tan(17*Math.PI/180))*1.12;if(!this.fitted||Math.abs(this.lastAspect-this.camera.aspect)>.2){this.camera.position.set(0,.5,distance);this.controls.target.set(0,0,0);this.fitted=true;}this.lastAspect=this.camera.aspect;}
 dispose(){this.dead=true;this.renderer.setAnimationLoop(null);this.observer.disconnect();this.controls.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();if(this.model&&this.model.userData.species)this.model.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}
}
