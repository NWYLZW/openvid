'use client';
/* eslint-disable react-hooks/immutability -- R3F exposes mutable Three.js renderer/camera objects; mutations stay in effects and frame callbacks. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DuoRenderer } from '@/lib/duo-render';
import { defaultDuoConfig } from '@/lib/duo-config';
import { HDRI_FILES } from '@/lib/viewer-controls3d';
import { REST_MOCKUP_3D_MOTION, type Mockup3DMotionTransform } from '@/lib/mockup-motion-3d';
import type { Mockup3DStageProps } from './Mockup3DStage';
export interface Duo3DApi {
  renderAt(width:number,height:number):void;
  restorePreview():void;
  setTime(time:number,motion?:Mockup3DMotionTransform):void;
  hasBuiltInShadow:boolean;
  getVisualSize():{width:number;height:number;offsetY:number};
}
type Props=Mockup3DStageProps & {rootRef:React.MutableRefObject<THREE.Group|null>;cameraRef:React.MutableRefObject<THREE.PerspectiveCamera|null>;onLoaded?:()=>void};
function ReferenceRoom(){
  const {gl,scene,invalidate}=useThree();
  useLayoutEffect(()=>{
    const previous=scene.environment,room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(gl);
    const target=pmrem.fromScene(room,.04);scene.environment=target.texture;room.dispose();pmrem.dispose();invalidate();
    return()=>{if(scene.environment===target.texture)scene.environment=previous;target.dispose();invalidate();};
  },[gl,scene,invalidate]);
  return null;
}
export function DuoScene(props:Props) {
  const {gl,scene,camera,size,invalidate}=useThree();
  const latest=useRef(props);
  const dimensions=useRef(size);
  useLayoutEffect(()=>{latest.current=props;dimensions.current=size;},[props,size]);
  const engine=useRef<DuoRenderer|null>(null);
  const [root,setRoot]=useState<THREE.Group|null>(null);
  const [error,setError]=useState<string|null>(null);
  const api=useRef<Duo3DApi|null>(null);
  const exporting=useRef(false);
  const displayedError=useRef<string|null>(null);
  const selected=useRef<{pointerId:number;x:number;y:number;rx:number;ry:number}|null>(null);
  const dragRotation=useRef<{rx:number;ry:number}|null>(null);
  useLayoutEffect(()=>{if(!selected.current)dragRotation.current=null;},[props.initialRotationX,props.initialRotationY]);
  useEffect(()=>{
    const move=(event:PointerEvent)=>{
      const start=selected.current;if(!start||event.pointerId!==start.pointerId)return;
      // Capture before R3F raycasts every mesh. The initial hit already owns this drag.
      event.stopImmediatePropagation();event.preventDefault();
      const wrap=(angle:number)=>((angle+180)%360+360)%360-180;
      dragRotation.current={rx:wrap(start.rx+(event.clientY-start.y)*.3),ry:wrap(start.ry+(event.clientX-start.x)*.3)};
      invalidate();
    };
    const finish=(event:PointerEvent)=>{
      const start=selected.current;if(!start||event.pointerId!==start.pointerId)return;
      const pose=dragRotation.current;
      selected.current=null;
      if(gl.domElement.hasPointerCapture(event.pointerId))gl.domElement.releasePointerCapture(event.pointerId);
      if(event.type==='pointercancel'){dragRotation.current=null;}
      else if(pose)latest.current.onRotationChange?.(pose.rx,pose.ry);
      invalidate();
    };
    window.addEventListener('pointermove',move,{capture:true,passive:false});
    window.addEventListener('pointerup',finish,true);
    window.addEventListener('pointercancel',finish,true);
    return()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);};
  },[gl,invalidate]);
  useEffect(()=>{
    const renderer=new DuoRenderer(invalidate);renderer.setAnisotropy(gl.capabilities.getMaxAnisotropy());engine.current=renderer;
    const cam=camera as THREE.PerspectiveCamera;
    latest.current.cameraRef.current=cam;
    gl.domElement.dataset.duoReady='false';
    gl.toneMapping=THREE.ACESFilmicToneMapping;
    const setTime=(time:number,motion=REST_MOCKUP_3D_MOTION)=>{
      const p=latest.current,c=p.duoConfig??defaultDuoConfig();
      cam.position.set(0,0,c.cameraDistance);cam.lookAt(0,0,.275454);cam.fov=c.cameraFov;cam.near=.1;cam.far=250;cam.zoom=p.zoom??1;cam.updateProjectionMatrix();
      gl.toneMappingExposure=c.exposure;scene.environmentIntensity=p.glow??1.35;
      const rotation=p.autoRotate?time*(p.rotationSpeed??3.5)*Math.PI/180:0;
      renderer.root.rotation.set((dragRotation.current?.rx??p.initialRotationX??0)*Math.PI/180+motion.rotX,(dragRotation.current?.ry??p.initialRotationY??0)*Math.PI/180+rotation+motion.rotY,(p.initialRotationZ??0)*Math.PI/180+motion.rotZ);
      renderer.root.position.set(motion.posX*30,motion.posY*30,motion.posZ*30);renderer.root.scale.setScalar(motion.scale);renderer.setOpacity(motion.opacity);renderer.setProjectionCamera(cam);
      const ready=renderer.update(c,time,p.videoElement,p.imageUrl);
      gl.domElement.dataset.duoReady=String(ready);
      if(renderer.error!==displayedError.current){displayedError.current=renderer.error;setError(renderer.error);}
      if(renderer.error)gl.domElement.dataset.duoError=renderer.error;else delete gl.domElement.dataset.duoError;
    };
    api.current={setTime,hasBuiltInShadow:false,getVisualSize:()=>({width:1000,height:820,offsetY:0}),
      renderAt(w,h){
        if(gl.domElement.dataset.duoReady!=='true')throw new Error(gl.domElement.dataset.duoError||'Duo screen content is still loading');
        exporting.current=true;
        try{gl.setPixelRatio(1);gl.setSize(Math.max(1,w),Math.max(1,h),false);gl.domElement.style.width='100%';gl.domElement.style.height='100%';cam.aspect=w/h;cam.updateProjectionMatrix();gl.render(scene,cam);}catch(error){api.current?.restorePreview();throw error;}
      },
      restorePreview(){exporting.current=false;gl.setPixelRatio(Math.min(window.devicePixelRatio,2));gl.setSize(dimensions.current.width,dimensions.current.height,false);gl.domElement.style.width='100%';gl.domElement.style.height='100%';cam.aspect=dimensions.current.width/dimensions.current.height;setTime(latest.current.timelineTime??0,latest.current.motionTransform);gl.render(scene,cam);invalidate();},
    };
    latest.current.onApi?.(api.current);
    let active=true;
    renderer.load().then(()=>{if(!active)return;setRoot(renderer.root);latest.current.rootRef.current=renderer.root;setTime(latest.current.timelineTime??0,latest.current.motionTransform);latest.current.onLoaded?.();invalidate();}).catch(e=>{if(!active)return;const message='Duo model is unavailable. Run the Duo asset setup, then reload.';setError(message);gl.domElement.dataset.duoError=String(e);latest.current.onLoaded?.();});
    return()=>{active=false;renderer.dispose();engine.current=null;api.current=null;latest.current.rootRef.current=null;latest.current.onApi?.(null);delete gl.domElement.dataset.duoReady;delete gl.domElement.dataset.duoError;};
  },[gl,scene,camera,invalidate]);
  useEffect(()=>{if(!exporting.current){api.current?.setTime(props.timelineTime??0,props.motionTransform);invalidate();}},[props,invalidate]);
  useFrame(()=>{if(!exporting.current)api.current?.setTime(latest.current.timelineTime??0,latest.current.motionTransform);});
  return <>
    {props.duoConfig?.referenceLighting?<ReferenceRoom/>:<Environment files={HDRI_FILES[props.environment??'studio']} />}
    <hemisphereLight args={['#ffffff','#b5baa8',1.8]} />
    <directionalLight color="#fffcf5" intensity={2.6} position={[-15,25,30]} />
    <directionalLight color="#e8edf5" intensity={2} position={[15,5,-15]} />
    {root&&<primitive object={root} onPointerDown={(e:{nativeEvent:PointerEvent;stopPropagation:()=>void})=>{
      if(e.nativeEvent.button!==0||exporting.current)return;
      e.stopPropagation();const n=e.nativeEvent;
      selected.current={pointerId:n.pointerId,x:n.clientX,y:n.clientY,rx:dragRotation.current?.rx??latest.current.initialRotationX??0,ry:dragRotation.current?.ry??latest.current.initialRotationY??0};
      gl.domElement.setPointerCapture(n.pointerId);
    }} />}
    {error&&<Html center><div className="w-64 rounded-xl border bg-background p-4 text-sm text-destructive">{error}</div></Html>}
  </>;
}
