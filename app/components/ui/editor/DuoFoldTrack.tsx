"use client";
import { useMemo } from 'react';
import { sampleDuoAngle, type DuoConfig } from '@/lib/duo-config';
/** Read-only timeline summary. Editing opens the existing device configuration. */
export function DuoFoldTrack({config,duration,currentTime,onSeek,onEdit}:{config:DuoConfig;duration:number;currentTime:number;onSeek:(time:number)=>void;onEdit?:()=>void}) {
  const points=useMemo(()=>Array.from({length:129},(_,i)=>`${i/128*100},${28-sampleDuoAngle(config,i/128*duration)/180*22}`).join(' '),[config,duration]);
  return <button type="button" aria-label="Duo fold timeline — open 3D configuration" className="relative w-full overflow-hidden border-y border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" onClick={event=>{event.stopPropagation();const rect=event.currentTarget.getBoundingClientRect();onSeek(Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration)));onEdit?.();}}>
    <span className="absolute left-2 top-1 text-[10px]">iPhone Duo · Fold {Math.round(sampleDuoAngle(config,currentTime))}° · {config.keyframes.length?`${config.keyframes.length} keyframes`:'Manual angle'}</span>
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="absolute inset-x-0 bottom-1 h-8 w-full" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>
    {config.keyframes.filter(frame=>frame.time<=duration).map((frame,index)=><span key={index} title={`${frame.time}s · ${frame.angle}°`} className="absolute bottom-2 -translate-x-1/2 text-[9px]" style={{left:`clamp(5px, ${frame.time/duration*100}%, calc(100% - 5px))`}}>◆</span>)}
  </button>;
}
