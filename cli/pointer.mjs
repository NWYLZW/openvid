import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { probeDuration } from './probe.mjs';

export async function pointerCommand(planPath) {
  const base = dirname(resolve(planPath));
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  if (typeof plan.input !== 'string' || typeof plan.output !== 'string' || typeof plan.events !== 'string') throw new Error('input, output, events required');
  const source = resolve(base,plan.input), output = resolve(base,plan.output);
  try { await access(output); throw new Error('Output exists'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const log = JSON.parse(await readFile(resolve(base,plan.events),'utf8'));
  const events = log.events;
  if (!Array.isArray(events) || !events.length || events.length > 200) throw new Error('Expected 1..200 pointer events');
  let last = -1;
  for (const e of events) {
    if (![e.time,e.x,e.y].every(Number.isFinite) || e.time < last || e.time < 0 || e.x < 0 || e.x > 100 || e.y < 0 || e.y > 100 || e.kind !== 'click') throw new Error('Invalid pointer event');
    last=e.time;
  }
  const sourceDuration = await probeDuration(source);
  if (events.some(e => e.time > sourceDuration + .001)) throw new Error(`Pointer event exceeds source duration ${sourceDuration}`);
  const top=plan.cropTop ?? 0;
  if (!Number.isFinite(top) || top < 0 || top > .3) throw new Error('cropTop must be 0..0.3');
  function position(key, dimension) {
    const value=e=> key==='x' ? e.x/100 : (e.y/100-top)/(1-top);
    let expr=String(value(events.at(-1)));
    for(let i=events.length-2;i>=0;i--) {
      const a=events[i],b=events[i+1],start=Math.max(a.time,b.time-.4);
      const u=`min(1,max(0,(t-${start})/${Math.max(.001,b.time-start)}))`;
      const v=`(${value(a)}+(${value(b)-value(a)})*(.5-.5*cos(PI*${u})))`;
      expr=`if(lt(t,${b.time}),${v},${expr})`;
    }
    return `(${expr})*${dimension}`;
  }
  const temp=await mkdtemp(resolve(tmpdir(),'openvid-pointer-'));
  try {
    const cursor=resolve(temp,'cursor.png'),pulse=resolve(temp,'pulse.png');
    await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M3 3 L3 33 L11 26 L18 40 L24 37 L17 24 L29 24 Z" fill="white" stroke="#17212b" stroke-width="2.5" stroke-linejoin="round"/></svg>')).png().toFile(cursor);
    await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="23" fill="#16b8d4" fill-opacity=".14" stroke="#16b8d4" stroke-opacity=".75" stroke-width="3"/></svg>')).png().toFile(pulse);
    const x=position('x','main_w'),y=position('y','main_h');
    const enabled=`gte(t,${Math.max(0,events[0].time-.4)})`;
    const clicks=events.map(e=>`between(t,${e.time},${e.time+.32})`).join('+');
    const filter=`[0:v]crop=iw:trunc(ih*(1-${top})/2)*2:0:trunc(ih*${top}/2)*2,scale=1440:-2,setsar=1,fps=30[base];[base][2:v]overlay=x='${x}-32':y='${y}-32':enable='${clicks}':shortest=1[clicks];[clicks][1:v]overlay=x='${x}-3':y='${y}-3':enable='${enabled}':shortest=1[out]`;
    await new Promise((ok,no)=>{
      const child=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-i',source,'-loop','1','-i',cursor,'-loop','1','-i',pulse,'-filter_complex',filter,'-map','[out]','-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'inherit'});
      child.on('error',no);child.on('exit',code=>code===0?ok():no(new Error(`ffmpeg exited ${code}`)));
    });
    console.log(JSON.stringify({output,events:events.length,mode:'command-coordinate visualization'}));
  } finally {await rm(temp,{recursive:true,force:true});}
}
