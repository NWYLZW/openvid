import type { MockupMotionFragment } from './mockup-motion';
import { sampleMotionKeyframes } from './motion-keyframes.ts';
/** A view of existing camera scale, never a second zoom state or render layer. */
export function cameraZoomView(fragment: MockupMotionFragment) {
  if (!fragment.keyframes?.length || fragment.endTime<=fragment.startTime) return null;
  const duration=fragment.endTime-fragment.startTime;
  const times=[...new Set([...Array.from({length:49},(_,i)=>i/48*duration),...fragment.keyframes.map(f=>f.time).filter(t=>t>=0&&t<=duration)])].sort((a,b)=>a-b);
  const samples=times.map(time=>({time,scale:sampleMotionKeyframes(fragment.keyframes!,time).scale}));
  if(samples.every(s=>Math.abs(s.scale-1)<1e-6))return null;
  const min=Math.min(...samples.map(s=>s.scale)),max=Math.max(...samples.map(s=>s.scale));
  return {id:fragment.id,start:fragment.startTime,end:fragment.endTime,min,max,
    points:samples.map(s=>`${s.time/duration*100},${26-(s.scale-min)/Math.max(.1,max-min)*20}`).join(' ')};
}
