import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pointerCommand } from '../cli/pointer.mjs';

test('pointer rendering refuses to overwrite an existing output', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-test-'));
  try {
    await writeFile(join(dir,'output.mp4'),'keep');
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.webm',output:'output.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'plan.json')),/Output exists/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('invalid coordinates fail before invoking the encoder', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-test-'));
  try {
    await writeFile(join(dir,'events.json'),JSON.stringify({events:[{time:1,x:101,y:50,kind:'click'}]}));
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.webm',output:'output.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'plan.json')),/Invalid pointer event/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('invalid travel fails before reading source', async () => {
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-test-'));
  try {
    await writeFile(join(dir,'events.json'),JSON.stringify({events:[{time:1,x:50,y:50,kind:'move',travel:-1}]}));
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.webm',output:'output.mp4',events:'events.json'}));
    await assert.rejects(pointerCommand(join(dir,'plan.json')),/Invalid pointer event/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('move-only trajectories render progressively without requiring a click', async () => {
  const {execFileSync}=await import('node:child_process');
  const dir=await mkdtemp(join(tmpdir(),'openvid-pointer-motion-'));
  try {
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=white:s=640x360:r=30:d=2','-c:v','libx264',join(dir,'source.mp4')]);
    await writeFile(join(dir,'events.json'),JSON.stringify({events:[{time:0,x:10,y:50,kind:'move'},{time:1.9,x:90,y:50,kind:'move',travel:1.9}]}));
    await writeFile(join(dir,'plan.json'),JSON.stringify({input:'source.mp4',output:'output.mp4',events:'events.json',width:640}));
    await pointerCommand(join(dir,'plan.json'));
    function center(time) {
      const rgb=execFileSync('ffmpeg',['-v','error','-ss',String(time),'-i',join(dir,'output.mp4'),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']);
      let sum=0,count=0;
      for(let i=0;i<rgb.length;i+=3) if(rgb[i]<80&&rgb[i+1]<80&&rgb[i+2]<80) {sum+=(i/3)%640;count++;}
      assert.ok(count>5);return sum/count;
    }
    assert.ok(center(.5)<200); assert.ok(center(1.5)>450);
  } finally {await rm(dir,{recursive:true,force:true});}
});
