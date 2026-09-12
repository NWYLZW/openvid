"use client";
import { useState, type ReactNode } from 'react';
import type { MockupMotionFragment } from '@/lib/mockup-motion';
import type { MotionKeyframe } from '@/lib/motion-keyframes';
import { sampleMotionKeyframes } from '@/lib/motion-keyframes';
import { PositionPad } from '@/components/ui/PositionPad';
import { DirectionPad } from '@/components/ui/DirectionPad';
import { DetailPageHeader } from '@/components/ui/DetailHeaderMenu';

interface Props {
  fragment: MockupMotionFragment;
  onUpdate: (updates: Partial<MockupMotionFragment>) => void;
  onDelete: () => void;
  onClose: () => void;
  onSeek?: (time: number) => void;
  currentTime?: number;
  children?: ReactNode;
  mode?: "camera" | "zoom";
}
export function CameraKeyframeEditor({fragment,onUpdate,onDelete,onClose,onSeek,currentTime=0,children,mode="camera"}:Props) {
  const frames=fragment.keyframes!;
  const [selection,setSelection]=useState(()=>frames.reduce((best,f,i)=>Math.abs(f.time-(currentTime-fragment.startTime))<Math.abs(frames[best].time-(currentTime-fragment.startTime))?i:best,0));
  const index=Math.min(selection,frames.length-1), frame=frames[index];
  const choose=(i:number)=>{setSelection(i);onSeek?.(Math.max(fragment.startTime,Math.min(fragment.endTime,fragment.startTime+frames[i].time)));};
  const update=(changes:Partial<MotionKeyframe>)=>{
    onUpdate({keyframes:frames.map((f,i)=>i===index?{...f,...changes}:f)});
    onSeek?.(Math.max(fragment.startTime,Math.min(fragment.endTime,fragment.startTime+(changes.time??frame.time))));
  };
  const local=Math.max(0,Math.min(fragment.endTime-fragment.startTime,currentTime-fragment.startTime));
  const duplicate=frames.some(f=>Math.abs(f.time-local)<.01);
  const add=()=>{
    if(duplicate||frames.length>=100)return;
    const pose=sampleMotionKeyframes(frames,local);
    const added:MotionKeyframe={time:local,scale:pose.scale,x:pose.translateXPct,y:pose.translateYPct,pitch:pose.rotateX,yaw:pose.rotateY,roll:pose.rotateZ,perspective:pose.perspectivePx};
    const next=[...frames,added].sort((a,b)=>a.time-b.time);onUpdate({keyframes:next});setSelection(next.indexOf(added));
  };
  const number=(label:string,key:Exclude<keyof MotionKeyframe,'easing'>,min:number,max:number,step=.1,disabled=false)=>(
    <label className="flex items-center justify-between gap-2 text-xs" key={key}><span>{label}</span>
      <input key={`${label}:${frame[key]}`} aria-label={label} type="number" min={min} max={max} step={step} disabled={disabled} defaultValue={Math.round(frame[key]*10000)/10000}
        className="w-24 rounded border border-border bg-background p-2 disabled:opacity-50"
        onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.currentTarget.value=String(frame[key]);e.currentTarget.blur();}}}
        onBlur={e=>{const value=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(value)&&value>=min&&value<=max)update({[key]:value});else e.target.value=String(frame[key]);}} />
    </label>
  );
  const easing=frame.easing;
  return <div className="flex h-full flex-col text-foreground">
    <div className="flex items-center gap-2 border-b border-border p-3"><DetailPageHeader label={mode==="zoom"?"Camera zoom":"Camera keyframes"} icon="ph:arrow-left-bold" onBack={onClose}/><button className="ml-auto text-xs text-destructive" onClick={onDelete}>{mode==="zoom"?"Reset zoom":"Delete motion"}</button></div>
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {fragment.dockLaunch && children}
      <p className="text-xs text-muted-foreground">{mode==="zoom"?"This is the camera scale shown on the Zoom timeline. Editing here also updates Motion. Reset zoom sets scales to 1× without deleting the camera or mouse.":"Select a keyframe to preview and adjust its camera pose. Changes are saved in this project."}</p>
      <div className="grid grid-cols-3 gap-2" aria-label="Camera keyframes">{frames.map((f,i)=><button key={i} aria-pressed={i===index} className={`rounded border p-2 text-xs ${i===index?'border-orange-500 bg-orange-500/10':'border-border'}`} onClick={()=>choose(i)}>{i+1} · {f.time.toFixed(2)}s</button>)}</div>
      <button className="w-full rounded border border-border p-2 text-xs disabled:opacity-40" disabled={duplicate||frames.length>=100} onClick={add}>Add keyframe at playhead ({local.toFixed(2)}s)</button>
      <section className="space-y-3 rounded border border-border p-3" aria-label="Selected camera keyframe">
        <div className="flex justify-between text-xs font-medium"><span>Keyframe {index+1}</span><button className="text-destructive disabled:opacity-40" disabled={frames.length<=2||index===0} onClick={()=>{onUpdate({keyframes:frames.filter((_,i)=>i!==index)});setSelection(Math.max(0,index-1));}}>Remove keyframe</button></div>
        {number('Time (s)','time',index?frames[index-1].time+.01:frame.time,index<frames.length-1?frames[index+1].time-.01:Math.max(frame.time,fragment.endTime-fragment.startTime),.01,index===0)}
        {number('Zoom scale','scale',.2,4,.01)}
        <PositionPad range={100} x={frame.x} y={frame.y} scale={frame.scale} onChange={(x,y)=>update({x,y})} label="Camera position" accentRgb="249,115,22"/>
        {number('Horizontal position (%)','x',-100,100)}{number('Vertical position (%)','y',-100,100)}
        {mode!=="zoom" && <><DirectionPad angleX={frame.pitch} angleY={frame.yaw} maxAngle={65} onChange={(pitch,yaw)=>update({pitch,yaw})} label="3D tilt" accentRgb="249,115,22"/>
        {number('Pitch (°)','pitch',-80,80)}{number('Yaw (°)','yaw',-65,65)}{number('Roll (°)','roll',-45,45)}{number('Perspective','perspective',1200,4000,10)}</>}
        <label className="flex justify-between text-xs items-center">Easing<select aria-label="Keyframe easing" className="rounded border border-border bg-background p-2" value={!easing?'smooth':JSON.stringify(easing)==='[0,0,1,1]'?'linear':JSON.stringify(easing)==='[0.22,1,0.36,1]'?'out':'custom'} onChange={e=>{const v=e.target.value;update({easing:v==='smooth'?undefined:v==='linear'?[0,0,1,1]:v==='out'?[.22,1,.36,1]:[.37,0,.63,1]});}}><option value="smooth">Smooth</option><option value="linear">Linear</option><option value="out">Ease out</option><option value="custom">Custom Bézier</option></select></label>
        {easing&&<div className="grid grid-cols-4 gap-1">{easing.map((v,i)=><label key={i} className="text-[10px] text-muted-foreground">{['X1','Y1','X2','Y2'][i]}<input aria-label={`Easing ${['X1','Y1','X2','Y2'][i]}`} className="mt-1 w-full rounded border bg-background p-1 text-foreground" type="number" min={0} max={1} step={.01} value={v} onChange={e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(n>=0&&n<=1){const curve=[...easing] as [number,number,number,number];curve[i]=n;update({easing:curve});}}}/></label>)}</div>}
      </section>
      {!fragment.dockLaunch && children}
    </div>
  </div>;
}
