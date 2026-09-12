/** Dock coordinates are percentages of the canvas; animation time is local to its motion fragment. */
export interface DockLaunch {
  exitAfterOpen?: boolean;
  exitDelay?: number;
  exitDuration?: number;
  startFromCenter?: boolean;
  settleDuration?: number;
  pinToBottom?: boolean;
  followCamera?: boolean;
  appearance?: "light" | "dark"; runningDots?: boolean; separatorAfter?: number;
  glassBlur?: number; cornerRadius?: number; cameraZoom?: number;
  enabled: boolean; icons: string[]; selected: number; x: number; y: number;
  size: number; gap: number; opacity: number; start: number;
  bounces: number; amplitude: number; bounceDuration: number; expandDuration: number; keepVisible: boolean;
}
export const defaultDockLaunch = (): DockLaunch => ({followCamera:true,pinToBottom:false,appearance:"dark",runningDots:true,glassBlur:24,cornerRadius:36,enabled:true,icons:[],selected:0,x:50,y:84,size:8,gap:31,opacity:48,start:.3,bounces:2,amplitude:60,bounceDuration:1.05,expandDuration:.95,keepVisible:true});
export function parseDockLaunch(value: unknown): DockLaunch {
  if(!value || typeof value!=='object'||Array.isArray(value))throw new Error('Expected Dock configuration');
  const v=value as DockLaunch;
  const limits={selected:[0,7],x:[5,95],y:[10,90],size:[3,16],gap:[0,80],opacity:[0,100],start:[-3600,60],bounces:[1,4],amplitude:[0,100],bounceDuration:[.3,4],expandDuration:[.25,3]};
  if(Object.keys(v).some(k=>!['exitAfterOpen','exitDelay','exitDuration','startFromCenter','settleDuration','followCamera','pinToBottom','appearance','runningDots','separatorAfter','glassBlur','cornerRadius','cameraZoom','enabled','icons','keepVisible',...Object.keys(limits)].includes(k)))throw new Error('Unknown Dock field');
  for(const [key,[min,max]] of Object.entries(limits)){const n=v[key as keyof typeof limits];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(`Invalid Dock ${key}`);}
  if(!Number.isInteger(v.bounces)||!Number.isInteger(v.selected)||typeof v.enabled!=='boolean'||typeof v.keepVisible!=='boolean')throw new Error('Invalid Dock options');
  if(!Array.isArray(v.icons)||v.icons.length>8||v.icons.some(s=>typeof s!=='string'||s.length>1500000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)))throw new Error('Dock icons must be embedded PNG, JPEG or WebP images (maximum 8)');
  if(v.icons.length && v.selected>=v.icons.length)throw new Error('Dock selection missing');
  for(const [key,min,max] of [['glassBlur',0,40],['cornerRadius',10,45],['cameraZoom',1,3]] as const){const n=v[key];if(n!==undefined&&(!Number.isFinite(n)||n<min||n>max))throw new Error(`Invalid Dock ${key}`);}
  if(v.appearance!==undefined&&!['light','dark'].includes(v.appearance))throw new Error('Invalid Dock appearance');
  if(v.runningDots!==undefined&&typeof v.runningDots!=='boolean')throw new Error('Invalid running indicators');
  if(v.separatorAfter!==undefined&&(!Number.isInteger(v.separatorAfter)||v.separatorAfter<0||v.separatorAfter>7||(v.separatorAfter>0&&v.separatorAfter>=v.icons.length)))throw new Error('Divider must separate two icons');
  if(v.pinToBottom!==undefined&&typeof v.pinToBottom!=='boolean')throw new Error('Invalid Dock bottom pin');
  if(v.followCamera!==undefined&&typeof v.followCamera!=='boolean')throw new Error('Invalid scene camera follow');
  if(v.followCamera&&v.pinToBottom)throw new Error('Choose scene camera follow or screen pin');
  if(v.startFromCenter!==undefined&&typeof v.startFromCenter!=='boolean')throw new Error('Invalid centered Dock entrance');
  if(v.settleDuration!==undefined&&(!Number.isFinite(v.settleDuration)||v.settleDuration<0||v.settleDuration>1))throw new Error('Invalid Dock settling duration');
  if(v.exitAfterOpen!==undefined&&typeof v.exitAfterOpen!=='boolean')throw new Error('Invalid Dock exit');
  if(v.exitDelay!==undefined&&(!Number.isFinite(v.exitDelay)||v.exitDelay<0||v.exitDelay>5))throw new Error('Invalid Dock exit delay');
  if(v.exitDuration!==undefined&&(!Number.isFinite(v.exitDuration)||v.exitDuration<.15||v.exitDuration>2))throw new Error('Invalid Dock exit duration');
  return structuredClone(v);
}
export function sampleDockLaunch(d:DockLaunch,time:number){
  const u=Math.max(0,Math.min(1,(time-d.start)/d.bounceDuration));
  const cycle=Math.min(d.bounces-1,Math.floor(u*d.bounces));
  const phase=u===1?1:u*d.bounces-cycle;
  const jump=time>=d.start&&u<1?Math.pow(Math.sin(Math.PI*Math.pow(phase,.82)),1.3)*Math.pow(.57,cycle)*d.amplitude/100:0;
  const settle=d.settleDuration??(d.startFromCenter?.15:0);
  const p=Math.max(0,Math.min(1,(time-d.start-d.bounceDuration-settle)/d.expandDuration));
  const smooth=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
  // A small settling overshoot, zero at both endpoints.
  const scale=smooth+.018*Math.sin(Math.PI*p)*Math.sin(Math.PI*p);
  const fade=Math.max(0,Math.min(1,(p-.08)/.46));
  return {jump,progress:p,scale,dockAlpha:(d.keepVisible||d.exitAfterOpen)?1:1-fade*fade*(3-2*fade),windowAlpha:p>0?1:0};
}

/** Whole-scene camera; independent of the window unfolding and clamped to cover the canvas. */
export function sampleDockCamera(d:DockLaunch,time:number,w:number,h:number){
 const t=Math.max(0,Math.min(1,(time-d.start)/(d.startFromCenter?d.bounceDuration:d.bounceDuration+d.expandDuration+.3)));
 const ease=t*t*(3-2*t),scale=1+((d.cameraZoom??1)-1)*(1-ease);
 const sourceY=h*(d.y/100*(1-ease)+.5*ease),targetY=h*(.58*(1-ease)+.5*ease);
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 return{scale,x:clamp(w*.5-scale*w*d.x/100,w*(1-scale),0),y:clamp(targetY-scale*sourceY,h*(1-scale),0)};
}

/** Reference proportions: icon 104px, tray 166px, regular gap 32px, divider lane 96px. */
export function dockGeometry(d:DockLaunch,w:number,h:number){
 const size=h*d.size/100,gap=size*d.gap/100,divider=d.separatorAfter??0;
 const dividerExtra=divider>0?size*.62:0;
 const total=d.icons.length*size+Math.max(0,d.icons.length-1)*gap+dividerExtra;
 const cx=w*d.x/100,cy=(d.pinToBottom||d.followCamera)?h-h*.018-size*.80:h*d.y/100;
 const iconLeft=(i:number)=>cx-total/2+i*(size+gap)+(divider>0&&i>=divider?dividerExtra:0);
 return{size,gap,total,cx,cy,width:total+size*.55,height:size*1.60,iconX:iconLeft(d.selected)+size/2,iconLeft,iconY:cy-size*.49,dividerX:divider>0?iconLeft(divider-1)+size+(gap+dividerExtra)/2:null};
}

/** Convert a screen-fixed icon back into scene coordinates before the opening camera transform. */
export function dockLaunchOrigin(d:DockLaunch,time:number,width:number,height:number){
  const geometry=dockGeometry(d,width,height);
  if(!d.pinToBottom)return {x:geometry.iconX,y:geometry.cy};
  const scene=sampleDockCamera(d,time,width,height);
  return {x:(geometry.iconX-scene.x)/scene.scale,y:(geometry.cy-scene.y)/scene.scale};
}

/** Start at the screen center; arrive at the actual desktop position while bouncing. */
export function dockGeometryAtTime(d:DockLaunch,time:number,w:number,h:number,scene={scale:1,x:0,y:0}){
  const base=dockGeometry(d,w,h);
  if(!d.startFromCenter&&!d.exitAfterOpen)return base;
  const u=Math.max(0,Math.min(1,(time-d.start)/d.bounceDuration)),ease=u*u*(3-2*u);
  const fromX=(w/2-scene.x)/scene.scale,fromY=(h/2-scene.y)/scene.scale;
  const dx=d.startFromCenter?(fromX-base.cx)*(1-ease):0;
  let dy=d.startFromCenter?(fromY-base.cy)*(1-ease):0;
  if(d.exitAfterOpen){
    const phase=Math.max(0,Math.min(1,(time-dockExitStart(d))/(d.exitDuration??.45))),exit=phase*phase*(3-2*phase);
    const offscreenY=(h+base.height*scene.scale/2+base.size*scene.scale*.4+h*.02-scene.y)/scene.scale;
    dy+=(offscreenY-base.cy-dy)*exit;
  }
  return {...base,cx:base.cx+dx,cy:base.cy+dy,iconX:base.iconX+dx,iconY:base.iconY+dy,iconLeft:(i:number)=>base.iconLeft(i)+dx,dividerX:base.dividerX===null?null:base.dividerX+dx};
}

export function dockExitStart(d:DockLaunch){return d.start+d.bounceDuration+(d.settleDuration??(d.startFromCenter?.15:0))+d.expandDuration+(d.exitDelay??.5);}
export function dockExitEnd(d:DockLaunch){return dockExitStart(d)+(d.exitDuration??.45);}

/** Apply the shared scene matrix to the Dock before rasterizing it, avoiding intermediate-canvas clipping. */
export function dockViewportConfig(d:DockLaunch,time:number,w:number,h:number,scene={scale:1,x:0,y:0}):DockLaunch|undefined{
  if(d.exitAfterOpen&&time>=dockExitEnd(d))return undefined;
  const g=dockGeometryAtTime(d,time,w,h,scene);
  return {...d,startFromCenter:false,exitAfterOpen:false,followCamera:false,pinToBottom:false,keepVisible:d.keepVisible||!!d.exitAfterOpen,
    x:(g.cx*scene.scale+scene.x)/w*100,y:(g.cy*scene.scale+scene.y)/h*100,
    size:d.size*scene.scale,glassBlur:(d.glassBlur??18)*scene.scale};
}
