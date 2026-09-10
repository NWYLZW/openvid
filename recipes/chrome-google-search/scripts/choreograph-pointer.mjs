import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Run after media assemble. Input run directory contains its measured timeline.
const run=resolve(process.argv[2]);
const {timeline}=JSON.parse(await readFile(resolve(run,'clean-timed.mp4.timeline.json'),'utf8'));
const log=JSON.parse(await readFile(resolve(run,'../native-2026-09-10/pointer-events.json'),'utf8'));
// Assembly contains a 2560x1426 image inside a 2560x1440 canvas.
const mapY=y=>(y/100*1426+7)/1440*100;
const clicks=log.events.flatMap(e=>{
 const c=timeline.find(c=>e.time>=c.start&&e.time<c.end);
 return c ? [{time:c.outputStart+(e.time-c.start)/c.speed,x:e.x,y:mapY(e.y),kind:'click',travel:1.1,sourceTime:e.time}] : [];
});
const first=clicks[0];
const events=[{time:0,x:51,y:98,kind:'move'}, {time:4.85,x:first.x,y:first.y,kind:'move',travel:4.85},...clicks];
await writeFile(resolve(run,'pointer-events.json'),JSON.stringify({version:1,provenance:'Designed display path; clicks mapped from native command evidence, not measured OS motion.',events},null,2)+'\n');
await writeFile(resolve(run,'pointer.json'),JSON.stringify({input:'clean-timed.mp4',output:'choreographed-source.mp4',events:'pointer-events.json',width:2560},null,2)+'\n');
