import * as T from './vendor/three/three.module.js';
import {makeAmphibian,animateAmphibian} from './models.mjs';

// object-fit:cover video coordinates -> displayed, mirrored selfie coordinates.
export function coverPoint(point,vw,vh,w,h){const scale=Math.max(w/vw,h/vh),ox=(w-vw*scale)/2,oy=(h-vh*scale)/2;return {x:w-(point.x*vw*scale+ox),y:point.y*vh*scale+oy};}
export class Selfie{
 constructor(host,notify,{reduced=false}={}){
  this.host=host;this.notify=notify;this.reduced=reduced;this.dead=false;this.active=false;this.tracked=false;this.manual=false;this.photoMode=false;this.side=11;this.lastSeen=0;this.position={x:.73,y:.62};
  this.video=document.createElement('video');this.video.muted=true;this.video.autoplay=true;this.video.playsInline=true;host.prepend(this.video);
  this.photo=document.createElement('img');this.photo.className='selfie-photo';this.photo.alt='선택한 셀카 사진';this.photo.hidden=true;this.video.after(this.photo);
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.toneMapping=T.ACESFilmicToneMapping;host.append(this.renderer.domElement);
  this.scene=new T.Scene();this.scene.add(new T.HemisphereLight('#fff3df','#667561',3));const light=new T.DirectionalLight('#fff4d9',3);light.position.set(-3,5,8);this.scene.add(light);
  this.camera=new T.OrthographicCamera(-1,1,1,-1,.01,20);this.camera.position.z=10;
  this.mascot=makeAmphibian('maeng',true);this.anchor=new T.Group();this.anchor.add(this.mascot);this.scene.add(this.anchor);this.anchor.visible=false;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
  this.click=e=>{if(!this.manual||e.target.closest('button'))return;const r=host.getBoundingClientRect();this.position={x:T.MathUtils.clamp((e.clientX-r.left)/r.width,.15,.85),y:T.MathUtils.clamp((e.clientY-r.top)/r.height,.25,.90)};this.anchor.visible=true;};host.addEventListener('pointerdown',this.click);
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
  this.active=true;this.notify('카메라가 켜졌어요. 어깨 인식을 준비하고 있어요.');
  this.initPose();
 }
 async initPose(){
  if(this.pose||this.loadingPose||this.dead)return;
  this.loadingPose=true;
  try{
   const {FilesetResolver,PoseLandmarker}=await import('./vendor/vision/vision_bundle.mjs');
   const wasm=await FilesetResolver.forVisionTasks('./vendor/vision');if(this.dead)return;
   this.pose=await PoseLandmarker.createFromOptions(wasm,{baseOptions:{modelAssetPath:'./assets/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
   if(this.dead){this.pose.close();this.pose=null;}
  }catch(e){if(!this.dead&&!this.photoMode){this.useManual();this.notify('자동 추적을 사용할 수 없어 직접 놓기로 전환했어요. 어깨 위치를 눌러주세요.');}}
  finally{this.loadingPose=false;}
 }
 async loadPhoto(file){
  if(!file?.type.startsWith('image/'))throw Error('사진 파일을 선택해 주세요.');
  this.stopCamera();
  const url=URL.createObjectURL(file);
  try{await new Promise((resolve,reject)=>{this.photo.onload=resolve;this.photo.onerror=()=>reject(Error('사진을 열지 못했어요. 다른 사진을 골라주세요.'));this.photo.src=url;});}
  catch(e){URL.revokeObjectURL(url);throw e;}
  if(this.dead){URL.revokeObjectURL(url);return;}
  if(this.photoURL)URL.revokeObjectURL(this.photoURL);
  this.photoURL=url;this.photoMode=true;this.photo.hidden=false;this.active=true;this.useManual();
  this.notify('사진 위에서 맹꽁이를 놓을 어깨 위치를 눌러주세요.');
 }
 useManual(){this.manual=true;this.anchor.visible=true;this.notify('맹꽁이를 앉힐 어깨 위치를 눌러주세요.');}
 switchSide(){this.side=this.side===11?12:11;this.position.x=1-this.position.x;}
 frame(t){
  if(this.dead)return;
  if(this.active&&this.pose&&!this.manual&&this.video.readyState>=2&&t-(this.lastFrame||0)>120){
   this.lastFrame=t;
   try{
    const result=this.pose.detectForVideo(this.video,t),p=result.landmarks?.[0],a=p?.[this.side],b=p?.[this.side===11?12:11];
    if(a&&b&&(a.visibility??0)>.55&&(b.visibility??0)>.55){
     const one=coverPoint(a,this.video.videoWidth,this.video.videoHeight,this.w,this.h),two=coverPoint(b,this.video.videoWidth,this.video.videoHeight,this.w,this.h);
     this.position.x=T.MathUtils.lerp(this.position.x,T.MathUtils.clamp(one.x/this.w,.15,.85),.32);this.position.y=T.MathUtils.lerp(this.position.y,T.MathUtils.clamp(one.y/this.h,.2,.94),.32);
     this.scale=T.MathUtils.clamp(Math.abs(one.x-two.x)*.24,42,this.w*.24);this.lastSeen=t;this.anchor.visible=true;
     if(!this.tracked){this.tracked=true;this.notify('어깨를 찾았어요! 맹꽁이와 함께 웃어봐요.');}
    }else if(t-this.lastSeen>1400){this.anchor.visible=false;if(this.tracked){this.tracked=false;this.notify('양쪽 어깨가 보이게 해주세요. 어려우면 직접 놓기를 눌러요.');}}
   }catch(e){this.useManual();}
  }
  const size=this.scale||this.w*.20;this.anchor.scale.setScalar(size);this.anchor.position.set((this.position.x-.5)*this.w,(.5-this.position.y)*this.h,0);this.anchor.rotation.y=-.14;
  animateAmphibian(this.mascot,t/1000,{calling:(t/1000)%8>5,reduced:this.reduced});this.renderer.render(this.scene,this.camera);
 }
 async capture(){
  if(!this.active||(!this.photoMode&&!this.video.videoWidth))throw Error('카메라를 켜거나 사진을 골라주세요.');
  if(!this.anchor.visible)throw Error('어깨가 보이게 하거나 직접 놓기를 눌러주세요.');
  const c=document.createElement('canvas'),ratio=Math.min(2,1080/this.w);c.width=Math.round(this.w*ratio);c.height=Math.round(this.h*ratio)+140;
  const ctx=c.getContext('2d'),w=c.width,h=c.height-140,source=this.photoMode?this.photo:this.video,vw=this.photoMode?source.naturalWidth:source.videoWidth,vh=this.photoMode?source.naturalHeight:source.videoHeight,scale=Math.max(w/vw,h/vh);
  if(this.photoMode)ctx.drawImage(source,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);
  else{ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(source,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);ctx.restore();}
  this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,w,h);
  ctx.fillStyle='#183f3c';ctx.fillRect(0,h,w,140);ctx.fillStyle='#dff08a';ctx.font='bold 27px sans-serif';ctx.fillText('송도에서 만난 작은 친구',28,h+48);
  ctx.fillStyle='#fffefa';ctx.font='18px sans-serif';ctx.fillText('상상아트 | 기획·제작 이미숙',28,h+86);ctx.fillStyle='#c3d4c9';ctx.font='14px sans-serif';ctx.fillText(new Date().toLocaleDateString('ko-KR'),28,h+116);
  return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('사진 저장에 실패했어요.')),'image/png'));
 }
 stopCamera(){if(!this.photoMode)this.active=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;}
 dispose(){this.dead=true;this.stopCamera();if(this.photoURL)URL.revokeObjectURL(this.photoURL);this.pose?.close();this.pose=null;this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.host.removeEventListener('pointerdown',this.click);this.renderer.dispose();this.renderer.forceContextLoss();this.video.remove();this.photo.remove();this.renderer.domElement.remove();this.mascot.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}
}
