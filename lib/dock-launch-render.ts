import {sampleDockLaunch,dockGeometryAtTime,dockExitEnd,dockViewportConfig,type DockLaunch} from './dock-launch';
const images=new Map<string,Promise<HTMLImageElement>>();
function load(src:string){let p=images.get(src);if(!p){p=new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Cannot decode Dock icon'));i.src=src;});images.set(src,p);if(images.size>24)images.delete(images.keys().next().value!);}return p;}
const bounds=new WeakMap<HTMLImageElement,{x:number;y:number;width:number;height:number}>();
function iconBounds(image:HTMLImageElement){
 let cached=bounds.get(image);if(cached)return cached;
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
 let left=c.width,top=c.height,right=-1,bottom=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 cached=right<0?{x:0,y:0,width:c.width,height:c.height}:{x:left,y:top,width:right-left+1,height:bottom-top+1};bounds.set(image,cached);return cached;
}
export {dockGeometry} from './dock-launch';
export async function drawDock(ctx:CanvasRenderingContext2D,d:DockLaunch,time:number,w:number,h:number,scene={scale:1,x:0,y:0}){
 if(d.exitAfterOpen&&time>=dockExitEnd(d))return;
 const state=sampleDockLaunch(d,time);if(state.dockAlpha<=0)return;
 const icons=await Promise.all(d.icons.map(load));const g=dockGeometryAtTime(d,time,w,h,scene);
 const width=g.width,height=g.height;const dark=d.appearance==='dark';
 const x=g.cx-width/2,y=g.cy-height/2,r=height*(d.cornerRadius??36)/100;
 const path=()=>{ctx.beginPath();ctx.roundRect(x,y,width,height,r);};
 const blur=(d.glassBlur??18)*h/1080,margin=Math.ceil(blur*3+3);
 const backdrop=document.createElement('canvas');backdrop.width=Math.ceil(width+margin*2);backdrop.height=Math.ceil(height+margin*2);
 backdrop.getContext('2d')!.drawImage(ctx.canvas,x-margin,y-margin,backdrop.width,backdrop.height,0,0,backdrop.width,backdrop.height);
 ctx.save();ctx.globalAlpha=state.dockAlpha;
 // Low contact shadow and broader ambient shadow are separate from the glass fill.
 ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=g.size*.20;ctx.shadowOffsetY=g.size*.08;
 ctx.fillStyle=dark?'rgba(25,29,28,.5)':'rgba(225,229,245,.08)';path();ctx.fill();ctx.shadowColor='transparent';
 ctx.save();path();ctx.clip();ctx.filter=`blur(${blur}px) saturate(${dark?85:100}%)`;ctx.drawImage(backdrop,x-margin,y-margin);ctx.filter='none';
 const tint=ctx.createLinearGradient(0,y,0,y+height);
 if(dark){tint.addColorStop(0,`rgba(23,28,26,${d.opacity/100})`);tint.addColorStop(1,`rgba(24,29,27,${Math.min(.97,d.opacity/100+.025)})`);}else{tint.addColorStop(0,`rgba(255,255,255,${.10+d.opacity/100*.22})`);tint.addColorStop(1,`rgba(229,230,248,${.04+d.opacity/100*.14})`);}
 ctx.fillStyle=tint;ctx.fillRect(x,y,width,height);ctx.restore();
 const rim=ctx.createLinearGradient(0,y,0,y+height);rim.addColorStop(0,dark?'rgba(185,193,190,.26)':'rgba(255,255,255,.5)');rim.addColorStop(.45,dark?'rgba(150,157,154,.20)':'rgba(255,255,255,.2)');rim.addColorStop(1,dark?'rgba(195,200,198,.30)':'rgba(255,255,255,.13)');ctx.strokeStyle=rim;ctx.lineWidth=g.size/104;path();ctx.stroke();
 if(g.dividerX!==null){ctx.beginPath();ctx.moveTo(g.dividerX,y+height*.13);ctx.lineTo(g.dividerX,y+height*.88);ctx.strokeStyle=dark?'rgba(153,158,155,.52)':'rgba(60,65,64,.3)';ctx.lineWidth=g.size/60;ctx.stroke();}
 if(d.runningDots){const count=(d.separatorAfter??0)>0?d.separatorAfter!:icons.length;ctx.fillStyle=dark?'#939996':'#555B59';for(let i=0;i<count;i++){ctx.beginPath();ctx.arc(g.iconLeft(i)+g.size/2,y+height*.935,g.size*.037,0,Math.PI*2);ctx.fill();}}
 icons.forEach((icon,i)=>{
 const ix=g.iconLeft(i),iy=g.iconY-(i===d.selected?state.jump*g.size:0),b=iconBounds(icon),ratio=Math.min(g.size/b.width,g.size/b.height);
 const dw=b.width*ratio,dh=b.height*ratio,dx=ix+(g.size-dw)/2,dy=iy+(g.size-dh)/2;
 ctx.save();ctx.shadowColor='rgba(0,0,0,.20)';ctx.shadowBlur=g.size*.04;ctx.shadowOffsetY=g.size*.02;
 ctx.beginPath();ctx.roundRect(dx,dy,dw,dh,g.size*.23);ctx.clip();ctx.drawImage(icon,b.x,b.y,b.width,b.height,dx,dy,dw,dh);ctx.restore();});ctx.restore();
}

export async function drawDockViewport(ctx:CanvasRenderingContext2D,d:DockLaunch,time:number,w:number,h:number,scene={scale:1,x:0,y:0}){
 const projected=dockViewportConfig(d,time,w,h,scene);
 if(projected)await drawDock(ctx,projected,time,w,h);
}
