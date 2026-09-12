export interface WaitSpeed {start:number;end:number;multiplier:number}
export function waitSpeedAt(time:number,base:number,wait?:WaitSpeed){return base*(wait&&time>=wait.start&&time<wait.end?wait.multiplier:1);}
export function speedMap(start:number,duration:number,base:number,wait?:WaitSpeed){
  const end=start+duration;
  const cuts=[start,...(wait?[wait.start,wait.end].filter(t=>t>start&&t<end):[]),end].sort((a,b)=>a-b);
  const spans=cuts.slice(1).map((b,i)=>{const a=cuts[i],speed=waitSpeedAt((a+b)/2,base,wait);return {a,b,speed,length:(b-a)/speed};});
  const outputDuration=spans.reduce((sum,s)=>sum+s.length,0);
  return {outputDuration,sourceOffset(time:number){let remaining=Math.max(0,time);for(const s of spans){if(remaining<=s.length)return s.a-start+remaining*s.speed;remaining-=s.length;}return duration;}};
}
