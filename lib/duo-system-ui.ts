import type { DuoSystemUI } from './duo-config';

// Circular specialization of the edge-normal displacement in MarcosDemik/liquidglass
// generate-displacement-map.ts (MIT; see third-party/liquidglass-displacement-LICENSE).
// Resample the real underlying pixels before painting tint, edge light and symbols.
function refractButton(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,strength:number){
  if(strength<=0)return;
  const left=Math.max(0,Math.floor(x-r-2)),top=Math.max(0,Math.floor(y-r-2));
  const width=Math.min(ctx.canvas.width-left,Math.ceil(2*r+4)),height=Math.min(ctx.canvas.height-top,Math.ceil(2*r+4));
  if(width<=0||height<=0)return;
  const source=ctx.getImageData(left,top,width,height),out=new ImageData(new Uint8ClampedArray(source.data),width,height);
  const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
  for(let py=0;py<height;py++)for(let px=0;px<width;px++){
    const dx=left+px+.5-x,dy=top+py+.5-y,len=Math.hypot(dx,dy),d=len-r;
    if(d>=0||len<.001)continue;
    const edge=smooth((d+r*.28)/(r*.28));
    const amount=edge*r*.18*strength;
    const sx=Math.max(0,Math.min(width-1,px-dx/len*amount)),sy=Math.max(0,Math.min(height-1,py-dy/len*amount));
    const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
    for(let c=0;c<4;c++){
      const at=(xx:number,yy:number)=>source.data[(yy*width+xx)*4+c];
      out.data[(py*width+px)*4+c]=(at(ix,iy)*(1-fx)+at(Math.min(ix+1,width-1),iy)*fx)*(1-fy)+(at(ix,Math.min(iy+1,height-1))*(1-fx)+at(Math.min(ix+1,width-1),Math.min(iy+1,height-1))*fx)*fy;
    }
  }
  ctx.putImageData(out,left,top);
}

/** Paint into the screen texture so preview/export share the same fold and projection. */
export function drawDuoSystemUI(canvas:HTMLCanvasElement, ui?:DuoSystemUI) {
  if(!ui?.enabled)return;
  const ctx=canvas.getContext('2d')!;
  const h=canvas.height,w=canvas.width,rail=h*Math.max(.12,ui.width)+(ui.paddingLeft??.025);
  const x=w-h*(.79343/11.2513),r=Math.min(h*ui.buttonSize/2,rail*.44);
  const bottom=h*(1-ui.inset)-r;
  ctx.save();ctx.fillStyle=ui.background;ctx.globalAlpha=ui.opacity;
  ctx.fillRect(w-rail,0,rail,h);ctx.globalAlpha=1;
  if(ui.borderEnabled){
    const size=(ui.borderWidth??1)*h/1125;
    ctx.save();ctx.strokeStyle=ui.borderColor??'#d1d5db';ctx.lineWidth=size;ctx.globalAlpha=ui.borderOpacity??1;
    ctx.setLineDash(ui.borderStyle==='dashed'?[size*5,size*3]:ui.borderStyle==='dotted'?[size,size*2]:[]);
    ctx.beginPath();ctx.moveTo(w-rail+size/2,0);ctx.lineTo(w-rail+size/2,h);ctx.stroke();ctx.restore();
  }
  const stroke=(path:Path2D,scale:number)=>{ctx.save();ctx.scale(scale,scale);ctx.strokeStyle=ui.iconColor;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(path);ctx.restore();};
  const button=(kind:'camera'|'flashlight',y:number)=>{
    if(ui.buttonMaterial!=='flat')refractButton(ctx,x,y,r,ui.glassRefraction??.7);
    ctx.save();ctx.translate(x,y);
    const glass=ui.buttonMaterial!=='flat';
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);
    if(glass){
      // Layered inset/outset lighting adapted from taehalim/liquid-glass styles.css (MIT).
      // Canvas equivalent keeps the material in the exported screen texture.
      const shadow=ui.glassShadow??.3, highlight=ui.glassHighlight??.75;
      const unit=r/24;
      for(const [offset,blur,alpha] of [[4,16,.05],[8,24,.05],[16,56,.05]]){
        ctx.save();ctx.shadowColor=`rgba(17,17,26,${alpha*shadow/.3})`;
        ctx.shadowBlur=blur*unit;ctx.shadowOffsetY=offset*unit;
        ctx.fillStyle=ui.buttonColor;ctx.globalAlpha=.24;ctx.fill();ctx.restore();
      }
      ctx.save();ctx.clip();ctx.fillStyle=ui.buttonColor;ctx.globalAlpha=ui.buttonOpacity;ctx.fill();ctx.globalAlpha=1;
      // Fine inner rim and a broad low-contrast inner shadow, without a plastic shine.
      const shade=ctx.createRadialGradient(0,-r*.22,r*.45,0,0,r*1.08);
      shade.addColorStop(0,'rgba(17,17,26,0)');
      shade.addColorStop(.72,`rgba(17,17,26,${shadow*.1})`);
      shade.addColorStop(1,`rgba(17,17,26,${shadow*.28})`);
      ctx.fillStyle=shade;ctx.fillRect(-r,-r,r*2,r*2);
      ctx.restore();
      const edge=ctx.createLinearGradient(-r,-r,r,r);
      edge.addColorStop(0,`rgba(255,255,255,${highlight*.9})`);
      edge.addColorStop(.42,`rgba(255,255,255,${highlight*.35})`);
      edge.addColorStop(.58,`rgba(70,75,85,${shadow*.28})`);
      edge.addColorStop(1,`rgba(255,255,255,${highlight*.65})`);
      ctx.strokeStyle=edge;ctx.lineWidth=unit;ctx.stroke();
    }else{
      ctx.globalAlpha=ui.buttonOpacity;ctx.fillStyle=ui.buttonColor;ctx.fill();
      ctx.globalAlpha=Math.min(1,ui.buttonOpacity+.12);ctx.strokeStyle=ui.iconColor;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
    }
    const path=kind==='camera'?new Path2D('M -7 -6 L -4 -6 L -2 -9 L 3 -9 L 5 -6 L 8 -6 Q 11 -6 11 -3 L 11 6 Q 11 9 8 9 L -8 9 Q -11 9 -11 6 L -11 -3 Q -11 -6 -7 -6 Z M 4.5 1 A 4.5 4.5 0 1 1 -4.5 1 A 4.5 4.5 0 1 1 4.5 1'):new Path2D('M -5 -10 Q -6 -10 -6 -9 L -6 -6 L 6 -6 L 6 -9 Q 6 -10 5 -10 Z M -6 -4 L 6 -4 L 3 -1 L 3 9 Q 3 11 1 11 L -1 11 Q -3 11 -3 9 L -3 -1 Z M -1 2 L 1 2 L 1 6 L -1 6 Z');
    if(glass){ctx.save();ctx.scale(r/19,r/19);ctx.fillStyle=ui.iconColor;ctx.fill(path,'evenodd');ctx.restore();}else stroke(path,r/17);ctx.restore();
  };
  let y=bottom;
  if(ui.camera){button('camera',y);y-=2*r+h*ui.gap;}
  if(ui.flashlight)button('flashlight',y);

  ctx.restore();
}
