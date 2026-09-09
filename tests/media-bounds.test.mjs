import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pointerCommand } from '../cli/pointer.mjs';
import { mediaCommand } from '../cli/media.mjs';
import { createPointerLog } from '../automation/native-pointer-log.mjs';

test('source duration bounds are enforced; retimed output reports measured duration', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-media-test-'));
  try {
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=black:s=64x64:r=30:d=1','-c:v','libx264','-pix_fmt','yuv420p',join(dir,'source.mp4')]);
    await writeFile(join(dir,'events.json'),JSON.stringify({events:[{time:10,x:50,y:50,kind:'click'}]}));
    await writeFile(join(dir,'pointer.json'),JSON.stringify({input:'source.mp4',output:'pointer.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'pointer.json')),/exceeds source duration/);
    const plan={output:'edit.mp4',width:64,height:64,clips:[{file:'source.mp4',start:0,end:10,speed:1}]};
    await writeFile(join(dir,'edit.json'),JSON.stringify(plan));
    await assert.rejects(mediaCommand('media',['assemble',join(dir,'edit.json')]),/exceeds source duration/);
    plan.clips[0]={file:'source.mp4',start:0,end:1,speed:2,hold:.2};
    await writeFile(join(dir,'edit.json'),JSON.stringify(plan));
    await mediaCommand('media',['assemble',join(dir,'edit.json')]);
    const result=JSON.parse(await readFile(join(dir,'edit.mp4.timeline.json'),'utf8'));
    assert.ok(Math.abs(result.measuredDuration-.7)<.034);
    assert.ok(Math.abs(result.timeline[0].outputEnd-result.measuredDuration)<.034);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('recording log rejects invalid clock and preserves prior runs', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-log-test-'));
  try {
    const file=join(dir,'events.json');
    assert.throws(()=>createPointerLog(0,file),/start time/);
    const log=createPointerLog(Date.now(),file);
    await log.mark('start');
    assert.throws(()=>createPointerLog(Date.now(),file),/EEXIST/);
    assert.equal(JSON.parse(await readFile(file,'utf8')).marks[0].label,'start');
  } finally {await rm(dir,{recursive:true,force:true});}
});
