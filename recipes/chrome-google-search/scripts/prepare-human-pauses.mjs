import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Run after assembly.json has been encoded; preserve the live before-project snapshot.
const run=resolve(process.argv[2]);
const read=async name=>JSON.parse(await readFile(resolve(run,name),'utf8'));
const timing=await read('paused-source.mp4.timeline.json');
const project=(await read('before-project.json')).project;
const edit=JSON.parse(await readFile(new URL('../water-ripple-edit.json',import.meta.url),'utf8'));
const map=t=>{const clip=timing.timeline.find((c,i)=>t>=c.start&&(t<c.end||i===timing.timeline.length-1));if(!clip)throw new Error(`No source mapping at ${t}`);return clip.outputStart+(t-clip.start)/clip.speed;};
const f=project.mockupMotionFragments[0];
edit.camera=f.keyframes.map(k=>({...k,time:map(k.time)+(k.time>=4.75&&k.time<=6.5?.22:0)}));
edit.depthOfField=f.depthOfField;
edit.pointerTrack={...f.pointerTrack,events:f.pointerTrack.events.map(e=>({...e,time:map(e.time),...(e.travel===undefined?{}:{travel:map(e.time)-map(Math.max(0,e.time-e.travel))})}))};
edit.speed=project.globalSpeed;edit.padding=project.padding;edit.roundedCorners=project.roundedCorners;edit.shadows=project.shadows;
await writeFile(resolve(run,'edit.json'),JSON.stringify(edit,null,2)+'\n');
console.log({duration:timing.measuredDuration,firstClick:edit.pointerTrack.events.find(e=>e.kind==='click').time,searchClick:edit.pointerTrack.events.filter(e=>e.kind==='click')[1].time,pullbackStart:edit.camera[5].time});
