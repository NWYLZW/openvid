import type { MockupMotionFragment } from './mockup-motion';
import type { MotionKeyframe } from './motion-keyframes';
import { parsePointerTrack } from "./pointer-track.ts";
import { parseCameraDepthOfField } from './camera-depth-of-field.ts';

function canonical(value: unknown): unknown {
  // CDP JSON transports may round the last binary-float digit; ignore only that noise.
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toPrecision(14));
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}

/** Patch only the selected fragment, rejecting stale snapshots instead of overwriting human edits. */
export function updateCameraFragment(current: MockupMotionFragment, changes: {keyframes?: MotionKeyframe[]; depthOfField?: unknown; pointerTrack?: unknown}, expected: MockupMotionFragment): MockupMotionFragment {
  if (JSON.stringify(canonical(current)) !== JSON.stringify(canonical(expected))) throw new Error('Motion changed since it was read. Read state() again before editing.');
  if (Object.keys(changes).some(k=>!['keyframes','depthOfField','pointerTrack'].includes(k))) throw new Error('Unknown motion update');
  if (!current.keyframes?.length) throw new Error('Select a camera keyframe fragment');
  const next={...current};
  if(changes.keyframes!==undefined) {
    const frames=changes.keyframes;
    if(!Array.isArray(frames)||frames.length<2||frames.length>100) throw new Error('Expected 2..100 keyframes');
    let previous=-Infinity;
    const limits={scale:[.2,4],x:[-100,100],y:[-100,100],pitch:[-80,80],yaw:[-65,65],roll:[-45,45],perspective:[1200,4000]};
    for(const frame of frames) {
      if(!frame||!Number.isFinite(frame.time)||frame.time<=previous) throw new Error('Keyframe times must strictly increase');
      previous=frame.time;
      for(const [key,[min,max]] of Object.entries(limits)) {
        const value=frame[key as keyof typeof limits];
        if(!Number.isFinite(value)||value<min||value>max) throw new Error(`Invalid camera ${key}`);
      }
      if(frame.easing!==undefined&&(!Array.isArray(frame.easing)||frame.easing.length!==4||frame.easing.some(n=>!Number.isFinite(n)||n<0||n>1))) throw new Error('Invalid camera easing');
    }
    // Preserve external knots produced by trim/split; new edits cannot extend their existing envelope.
    if(frames[0].time < Math.min(0,current.keyframes[0].time)||frames.at(-1)!.time>Math.max(current.endTime-current.startTime,current.keyframes.at(-1)!.time)) throw new Error('Keyframes exceed fragment range');
    next.keyframes=structuredClone(frames);
  }
  if('depthOfField' in changes) {
    if(changes.depthOfField===null) next.depthOfField=undefined;
    else next.depthOfField=parseCameraDepthOfField(changes.depthOfField);
  }
  if ('pointerTrack' in changes) {
    if(changes.pointerTrack===null) next.pointerTrack=undefined;
    else {
      const parsed=parsePointerTrack(changes.pointerTrack);
      const oldTimes=current.pointerTrack?.events.map(e=>e.time)??[];
      const min=Math.min(0,...oldTimes), max=Math.max(current.endTime-current.startTime,...oldTimes);
      if(parsed.events.some(e=>e.time<min||e.time>max)) throw new Error('Pointer events exceed the fragment range');
      next.pointerTrack=parsed;
    }
  }
  return next;
}

/** The shared UI/API setter publishes immediately, even while React batches rendering. */
export function commitMotionState(ref: {current: MockupMotionFragment[]}, action: MockupMotionFragment[] | ((previous: MockupMotionFragment[])=>MockupMotionFragment[]), publish: (next:MockupMotionFragment[])=>void) {
  const next=typeof action==='function'?action(ref.current):action;
  ref.current=next;
  publish(next);
}
