/** Native camera pan is measured in contained media dimensions. */
export function sceneCameraTransform(pose:{scale:number;translateXPct:number;translateYPct:number},width:number,height:number,sourceWidth:number,sourceHeight:number,padding:number){
  const inset=width*padding/200,fit=Math.min((width-inset*2)/sourceWidth,(height-inset*2)/sourceHeight);
  return {scale:pose.scale,x:width*(1-pose.scale)/2+sourceWidth*fit*pose.translateXPct/100,y:height*(1-pose.scale)/2+sourceHeight*fit*pose.translateYPct/100};
}
export function composeSceneCameras(inner:{scale:number;x:number;y:number},outer:{scale:number;x:number;y:number}){
  return {scale:inner.scale*outer.scale,x:inner.x*outer.scale+outer.x,y:inner.y*outer.scale+outer.y};
}
/** Extend only the wallpaper at the scene edges when panning beyond its original viewport. */
export function drawSceneCamera(ctx:CanvasRenderingContext2D,scene:HTMLCanvasElement,background:HTMLCanvasElement,pose:{scale:number;x:number;y:number}){
  const w=scene.width,h=scene.height,l=Math.min(0,-pose.x/pose.scale),t=Math.min(0,-pose.y/pose.scale),r=Math.max(w,(w-pose.x)/pose.scale),b=Math.max(h,(h-pose.y)/pose.scale);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(pose.scale,0,0,pose.scale,pose.x,pose.y);
  // Use a larger, consistently framed wallpaper; mirror only if an extreme camera exceeds its coverage.
  const bw=background.width,bh=background.height,ox=(w-bw)/2,oy=(h-bh)/2;
  for(let iy=Math.floor((t-oy)/bh);iy<Math.ceil((b-oy)/bh);iy++)for(let ix=Math.floor((l-ox)/bw);ix<Math.ceil((r-ox)/bw);ix++){
    const flipX=ix%2!==0,flipY=iy%2!==0;
    ctx.save();ctx.translate(ox+ix*bw+(flipX?bw:0),oy+iy*bh+(flipY?bh:0));ctx.scale(flipX?-1:1,flipY?-1:1);ctx.drawImage(background,0,0);ctx.restore();
  }
  ctx.drawImage(scene,0,0);ctx.restore();
}
