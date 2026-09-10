import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const recipe=fileURLToPath(new URL('../',import.meta.url));
const run=resolve(process.argv[2] ?? resolve(recipe,'runs/synced-quick-2026-09-10'));
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const cues=await read(resolve(recipe,'synced-quick-cues.json'));
const base=resolve(recipe,'runs/choreography-2026-09-10');
const edit=await read(resolve(base,'edit.json'));
const pointer=await read(resolve(base,'pointer-events.json'));
const {sourceEnd,speed}=cues.intro;
const {sourceStart,sourceArrival,cameraEasing}=cues.submit;
if (!(sourceEnd>0 && speed>0 && sourceArrival>sourceStart)) throw new Error('Invalid timing cues');
const map=t=>t<=sourceEnd?t/speed:t-sourceEnd+sourceEnd/speed;
const submit=pointer.events.filter(e=>e.kind==='click')[1];
if (!(sourceArrival<submit.time)) throw new Error('Arrival must precede the recorded click');
// Match the existing search-to-submit segment; this script is recipe-specific.
edit.camera[3].time=sourceStart;
edit.camera[4].time=sourceArrival;
edit.camera[4].easing=cameraEasing;
pointer.events.push({time:sourceArrival,x:submit.x,y:submit.y,kind:'move',travel:sourceArrival-sourceStart});
pointer.events.sort((a,b)=>a.time-b.time);
for (const e of pointer.events) {
  const t=e.time;e.time=map(t);
  if(e.travel!==undefined)e.travel=map(t)-map(Math.max(0,t-e.travel));
}
for(const k of edit.camera)k.time=map(k.time);
const source=relative(run,resolve(base,'clean-timed.mp4'));
const plan={output:'clean-timed.mp4',width:2560,height:1440,clips:[{file:source,start:0,end:sourceEnd,speed},{file:source,start:sourceEnd,end:30.766667,speed:1}]};
await mkdir(run,{recursive:true});
for(const [name,value] of Object.entries({'assembly.json':plan,'edit.json':edit,'pointer-events.json':pointer,'pointer.json':{input:'clean-timed.mp4',output:'synced-source.mp4',events:'pointer-events.json',width:2560}})) {
  await writeFile(resolve(run,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
}
console.log(run);
