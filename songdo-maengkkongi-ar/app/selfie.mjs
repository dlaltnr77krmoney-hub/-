import * as T from './vendor/three/three.module.js';
import {makeAmphibian,animateAmphibian} from './models.mjs';

export class Selfie{
 constructor(host,notify,{reduced=false}={}){
  this.host=host;this.notify=notify;this.reduced=reduced;this.dead=false;this.active=false;this.photoMode=false;this.position={x:.50,y:.64};this.size=.22;this.pointers=new Map();this.pinch=null;
  this.video=document.createElement('video');this.video.muted=true;this.video.autoplay=true;this.video.playsInline=true;host.prepend(this.video);
  this.photo=document.createElement('img');this.photo.className='selfie-photo';this.photo.alt='선택한 셀카 사진';this.photo.hidden=true;this.video.after(this.photo);
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.toneMapping=T.ACESFilmicToneMapping;host.append(this.renderer.domElement);
  this.scene=new T.Scene();this.scene.add(new T.HemisphereLight('#fff3df','#667561',3));const light=new T.DirectionalLight('#fff4d9',3);light.position.set(-3,5,8);this.scene.add(light);
  this.camera=new T.OrthographicCamera(-1,1,1,-1,.01,20);this.camera.position.z=10;
  this.mascot=makeAmphibian('maeng',true);this.mascot.rotation.y=-.14;this.anchor=new T.Group();this.anchor.add(this.mascot);this.scene.add(this.anchor);this.anchor.visible=true;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
  this.place=e=>{const r=host.getBoundingClientRect();this.position={x:T.MathUtils.clamp((e.clientX-r.left)/r.width,.16,.84),y:T.MathUtils.clamp((e.clientY-r.top)/r.height,.22,.87)};};
  this.pointerDown=e=>{if(!this.active||e.target.closest('button'))return;host.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===1)this.place(e);if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),size:this.size};}};
  this.pointerMove=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===1)this.place(e);else if(this.pointers.size===2&&this.pinch){const [a,b]=[...this.pointers.values()];this.size=T.MathUtils.clamp(this.pinch.size*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(this.pinch.distance,1),.14,.40);}};
  this.pointerUp=e=>{this.pointers.delete(e.pointerId);if(this.pointers.size<2)this.pinch=null;};
  host.addEventListener('pointerdown',this.pointerDown);host.addEventListener('pointermove',this.pointerMove);host.addEventListener('pointerup',this.pointerUp);host.addEventListener('pointercancel',this.pointerUp);
  this.renderer.setAnimationLoop(t=>this.frame(t));
 }
 resize(){this.w=this.host.clientWidth;this.h=this.host.clientHeight;this.renderer.setSize(this.w,this.h,false);this.camera.left=-this.w/2;this.camera.right=this.w/2;this.camera.top=this.h/2;this.camera.bottom=-this.h/2;this.camera.updateProjectionMatrix();}
 async start(){
  if(this.dead)return;
  this.photoMode=false;this.photo.hidden=true;
  this.stopCamera();
  if(!navigator.mediaDevices?.getUserMedia)throw Error('카메라는 HTTPS 주소 또는 이 컴퓨터의 localhost에서 사용할 수 있어요.');
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:960}},audio:false});
  if(this.dead){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.video.srcObject=stream;
  try{await this.video.play();}catch(e){this.stopCamera();throw e;}
  this.active=true;this.notify('손바닥을 화면에 보여주고, 맹꽁이를 놓을 자리를 터치해 주세요.');
 }
 async loadPhoto(file){
  if(!file?.type.startsWith('image/'))throw Error('사진 파일을 선택해 주세요.');
  this.stopCamera();
  const url=URL.createObjectURL(file);
  try{await new Promise((resolve,reject)=>{this.photo.onload=resolve;this.photo.onerror=()=>reject(Error('사진을 열지 못했어요. 다른 사진을 골라주세요.'));this.photo.src=url;});}
  catch(e){URL.revokeObjectURL(url);throw e;}
  if(this.dead){URL.revokeObjectURL(url);return;}
  if(this.photoURL)URL.revokeObjectURL(this.photoURL);
  this.photoURL=url;this.photoMode=true;this.photo.hidden=false;this.active=true;
  this.notify('사진 속 손바닥을 터치해 맹꽁이를 놓아주세요.');
 }
 resetPosition(){this.position={x:.5,y:.64};this.size=.22;this.notify('손바닥을 터치해 맹꽁이를 놓아주세요.');}
 frame(t){
  if(this.dead)return;
  // The overlay is scaled in screen pixels; its depth must stay in front of the camera.
  this.anchor.scale.set(this.w*this.size,this.w*this.size,1);this.anchor.position.set((this.position.x-.5)*this.w,(.5-this.position.y)*this.h,0);
  animateAmphibian(this.mascot,t/1000,{calling:(t/1000)%8>5,reduced:this.reduced});this.renderer.render(this.scene,this.camera);
 }
 async capture(){
  if(!this.active||(!this.photoMode&&!this.video.videoWidth))throw Error('카메라를 켜거나 사진을 골라주세요.');
  const c=document.createElement('canvas'),ratio=Math.min(2,1080/this.w);c.width=Math.round(this.w*ratio);c.height=Math.round(this.h*ratio)+140;
  const ctx=c.getContext('2d'),w=c.width,h=c.height-140,source=this.photoMode?this.photo:this.video,vw=this.photoMode?source.naturalWidth:source.videoWidth,vh=this.photoMode?source.naturalHeight:source.videoHeight,scale=Math.max(w/vw,h/vh);
  if(this.photoMode)ctx.drawImage(source,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);
  else{ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(source,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);ctx.restore();}
  this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,w,h);
  ctx.fillStyle='#183f3c';ctx.fillRect(0,h,w,140);ctx.fillStyle='#dff08a';ctx.font='bold 27px sans-serif';ctx.fillText('송도에서 만난 작은 친구',28,h+48);
  ctx.fillStyle='#fffefa';ctx.font='18px sans-serif';ctx.fillText('기획·제작 상상아트',28,h+86);ctx.fillStyle='#c3d4c9';ctx.font='14px sans-serif';ctx.fillText(new Date().toLocaleDateString('ko-KR'),28,h+116);
  return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('사진 저장에 실패했어요.')),'image/png'));
 }
 stopCamera(){if(!this.photoMode)this.active=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;}
 dispose(){this.dead=true;this.stopCamera();if(this.photoURL)URL.revokeObjectURL(this.photoURL);this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.host.removeEventListener('pointerdown',this.pointerDown);this.host.removeEventListener('pointermove',this.pointerMove);this.host.removeEventListener('pointerup',this.pointerUp);this.host.removeEventListener('pointercancel',this.pointerUp);this.renderer.dispose();this.renderer.forceContextLoss();this.video.remove();this.photo.remove();this.renderer.domElement.remove();this.mascot.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}
}
